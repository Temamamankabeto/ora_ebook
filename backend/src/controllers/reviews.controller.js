import { q } from "../db/pool.js";

const REVIEWABLE_STATUSES = new Set([
  "SUBMITTED",
  "SCREENING",
  "UNDER_REVIEW",
  "REVISION_REQUIRED",
  "RETURNED_FOR_CORRECTION",
]);

export async function assignReviewer(req, res) {
  const editorId = req.user.uuid;
  const { ebook_id, reviewer_id, due_at } = req.body;

  if (!ebook_id || !reviewer_id) {
    return res.status(400).json({ success: false, message: "ebook_id and reviewer_id are required" });
  }

  // 1) Block assignment if ebook is not in reviewable statuses
  const eb = await q(`SELECT status FROM ebooks WHERE ebook_id=$1`, [ebook_id]);
  if (!eb.rowCount) return res.status(404).json({ success: false, message: "Ebook not found" });

  const status = eb.rows[0].status;
  if (!REVIEWABLE_STATUSES.has(status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot assign reviewer when ebook status is '${status}'.`,
    });
  }

  // 2) Upsert: if exists and was CANCELLED, allow reassign (set back to INVITED)
  // If exists and not cancelled, do not change (keeps active assignment)
  await q(
    `INSERT INTO ebook_reviewer_assignments(ebook_id, reviewer_id, assigned_by, due_at, status, assigned_at)
     VALUES ($1, $2, $3, $4, 'INVITED', now())
     ON CONFLICT (ebook_id, reviewer_id)
     DO UPDATE SET
       status = CASE
         WHEN ebook_reviewer_assignments.status = 'CANCELLED' THEN 'INVITED'
         ELSE ebook_reviewer_assignments.status
       END,
       assigned_at = CASE
         WHEN ebook_reviewer_assignments.status = 'CANCELLED' THEN now()
         ELSE ebook_reviewer_assignments.assigned_at
       END,
       assigned_by = CASE
         WHEN ebook_reviewer_assignments.status = 'CANCELLED' THEN EXCLUDED.assigned_by
         ELSE ebook_reviewer_assignments.assigned_by
       END,
       due_at = CASE
         WHEN ebook_reviewer_assignments.status = 'CANCELLED' THEN EXCLUDED.due_at
         ELSE ebook_reviewer_assignments.due_at
       END`,
    [ebook_id, reviewer_id, editorId, due_at || null]
  );

  // Ensure status is UNDER_REVIEW when reviewers assigned (optional)
  await q(
    `UPDATE ebooks SET status='UNDER_REVIEW', updated_at=now()
     WHERE ebook_id=$1 AND status IN ('SUBMITTED','SCREENING','RETURNED_FOR_CORRECTION','REVISION_REQUIRED')`,
    [ebook_id]
  );

  res.json({ success: true });
}

export async function cancelAssignment(req, res) {
  const editorId = req.user.uuid;
  const { assignment_id } = req.params;
  const { reason } = req.body || {};

  const a = await q(
    `SELECT assignment_id, ebook_id, status
     FROM ebook_reviewer_assignments
     WHERE assignment_id=$1`,
    [assignment_id]
  );

  if (!a.rowCount) {
    return res.status(404).json({ success: false, message: "Assignment not found" });
  }

  // Optional: block cancelling after review submitted
  // if (a.rows[0].status === "SUBMITTED") {
  //   return res.status(400).json({ success: false, message: "Cannot cancel after review submitted" });
  // }

  await q(
    `UPDATE ebook_reviewer_assignments
     SET status='CANCELLED'
     WHERE assignment_id=$1`,
    [assignment_id]
  );

  await q(
    `INSERT INTO ebook_workflow_history(ebook_id, previous_status, new_status, changed_by, comments)
     VALUES($1, NULL, (SELECT status FROM ebooks WHERE ebook_id=$1), $2, $3)`,
    [
      a.rows[0].ebook_id,
      editorId,
      reason ? `Reviewer assignment cancelled: ${reason}` : "Reviewer assignment cancelled",
    ]
  );

  res.json({ success: true });
}

export async function myReviewQueue(req, res) {
  const reviewerId = req.user.uuid;
  const r = await q(
    `SELECT a.*, e.title, e.status
     FROM ebook_reviewer_assignments a
     JOIN ebooks e ON e.ebook_id = a.ebook_id
     WHERE a.reviewer_id=$1
     ORDER BY a.assigned_at DESC`,
    [reviewerId]
  );
  res.json({ success: true, data: r.rows });
}

export async function acceptInvite(req, res) {
  const reviewerId = req.user.uuid;
  const { assignment_id } = req.params;

  const a = await q(
    `SELECT reviewer_id, status
     FROM ebook_reviewer_assignments
     WHERE assignment_id=$1`,
    [assignment_id]
  );

  if (!a.rowCount) return res.status(404).json({ success: false, message: "Not found" });
  if (a.rows[0].reviewer_id !== reviewerId) return res.status(403).json({ success: false, message: "Forbidden" });
  if (a.rows[0].status === "CANCELLED") return res.status(400).json({ success: false, message: "Assignment cancelled" });

  await q(`UPDATE ebook_reviewer_assignments SET status='ACCEPTED' WHERE assignment_id=$1`, [assignment_id]);
  res.json({ success: true });
}

export async function submitReview(req, res) {
  const reviewerId = req.user.uuid;
  const { assignment_id } = req.params;
  const { recommendation, comments_to_author, confidential_comments_to_editor } = req.body;

  const a = await q(`SELECT * FROM ebook_reviewer_assignments WHERE assignment_id=$1`, [assignment_id]);
  if (!a.rowCount) return res.status(404).json({ success: false, message: "Assignment not found" });
  if (a.rows[0].reviewer_id !== reviewerId) return res.status(403).json({ success: false, message: "Forbidden" });
  if (a.rows[0].status === "CANCELLED") return res.status(400).json({ success: false, message: "Assignment cancelled" });

  await q("BEGIN");
  try {
    await q(
      `INSERT INTO ebook_reviews(assignment_id, ebook_id, recommendation, confidential_comments_to_editor, comments_to_author)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (assignment_id) DO UPDATE SET
         recommendation=EXCLUDED.recommendation,
         confidential_comments_to_editor=EXCLUDED.confidential_comments_to_editor,
         comments_to_author=EXCLUDED.comments_to_author,
         submitted_at=now()`,
      [
        assignment_id,
        a.rows[0].ebook_id,
        recommendation,
        confidential_comments_to_editor || null,
        comments_to_author || null,
      ]
    );

    await q(`UPDATE ebook_reviewer_assignments SET status='SUBMITTED' WHERE assignment_id=$1`, [assignment_id]);

    await q("COMMIT");
    res.json({ success: true });
  } catch (e) {
    await q("ROLLBACK");
    console.error(e);
    res.status(500).json({ success: false, message: "Submit review failed" });
  }
}