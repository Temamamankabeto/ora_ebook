import { q } from "../db/pool.js";

/**
 * Author: create new submission with version 1
 */
export async function createSubmission(req, res) {
  const authorId = req.user.uuid;
  const { title, abstract, keywords } = req.body;

  if (!title) return res.status(400).json({ success: false, message: "title required" });

  await q("BEGIN");
  try {
    const e = await q(
      `INSERT INTO ebooks(author_id,title,abstract,keywords,status)
       VALUES($1,$2,$3,$4,'SUBMITTED')
       RETURNING *`,
      [authorId, title, abstract || null, keywords ? keywords.split(",").map(s => s.trim()).filter(Boolean) : null]
    );

    const v = await q(
      `INSERT INTO ebook_versions(ebook_id,version_no,is_final,submitted_by)
       VALUES($1,1,false,$2) RETURNING *`,
      [e.rows[0].ebook_id, authorId]
    );

    await q(`UPDATE ebooks SET current_version_id=$1 WHERE ebook_id=$2`, [
      v.rows[0].version_id,
      e.rows[0].ebook_id,
    ]);

    await q(
      `INSERT INTO ebook_workflow_history(ebook_id,previous_status,new_status,changed_by,comments)
       VALUES($1,NULL,'SUBMITTED',$2,'Initial submission')`,
      [e.rows[0].ebook_id, authorId]
    );

    await q("COMMIT");
    res.json({ success: true, ebook: e.rows[0], version: v.rows[0] });
  } catch (e) {
    await q("ROLLBACK");
    console.error(e);
    res.status(500).json({ success: false, message: "Create failed" });
  }
}

export async function uploadManuscriptFile(req, res) {
  const userId = req.user.uuid;
  const { ebook_id } = req.params;
  const { file_type = "MANUSCRIPT" } = req.body;

  if (!req.file) return res.status(400).json({ success: false, message: "No file" });

  // Ensure user owns or is editor/admin
  const ebook = await q(`SELECT author_id, editor_id FROM ebooks WHERE ebook_id=$1`, [ebook_id]);
  if (!ebook.rowCount) return res.status(404).json({ success: false, message: "Not found" });

  const isOwner = ebook.rows[0].author_id === userId;
  const isEditor = ebook.rows[0].editor_id === userId;
  const isAdmin = (req.user.roles || []).includes("ADMIN");
  if (!isOwner && !isEditor && !isAdmin) return res.status(403).json({ success: false, message: "Forbidden" });

  const current = await q(`SELECT current_version_id FROM ebooks WHERE ebook_id=$1`, [ebook_id]);
  const version_id = current.rows[0]?.current_version_id || null;

  const inserted = await q(
    `INSERT INTO ebook_files(ebook_id, version_id, file_type, original_name, storage_path, mime_type, file_size, uploaded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      ebook_id,
      version_id,
      file_type,
      req.file.originalname,
      req.file.path,
      req.file.mimetype,
      req.file.size,
      userId
    ]
  );

  res.json({ success: true, file: inserted.rows[0] });
}

export async function listMySubmissions(req, res) {
  const authorId = req.user.uuid;
  const r = await q(
    `SELECT e.*
     FROM ebooks e
     WHERE e.author_id=$1
     ORDER BY e.created_at DESC`,
    [authorId]
  );
  res.json({ success: true, data: r.rows });
}

export async function getEbookDetail(req, res) {
  const { id } = req.params;
  const e = await q(`SELECT * FROM ebooks WHERE ebook_id=$1`, [id]);
  if (!e.rowCount) return res.status(404).json({ success: false, message: "Not found" });

  const versions = await q(`SELECT * FROM ebook_versions WHERE ebook_id=$1 ORDER BY version_no`, [id]);
  const files = await q(`SELECT * FROM ebook_files WHERE ebook_id=$1 ORDER BY uploaded_at DESC`, [id]);
  const history = await q(`SELECT * FROM ebook_workflow_history WHERE ebook_id=$1 ORDER BY changed_at DESC`, [id]);
  const decisions = await q(`SELECT * FROM ebook_decisions WHERE ebook_id=$1 ORDER BY decided_at DESC`, [id]);

  res.json({
    success: true,
    ebook: e.rows[0],
    versions: versions.rows,
    files: files.rows,
    history: history.rows,
    decisions: decisions.rows
  });
}

export async function editorQueue(req, res) {
  const r = await q(
    `WITH assignments AS (
       SELECT
         a.ebook_id,
         a.assignment_id,
         a.reviewer_id,
         a.status AS assignment_status,
         a.assigned_at,
         a.due_at,
         rv.full_name AS reviewer_name,
         rv.email AS reviewer_email
       FROM ebook_reviewer_assignments a
       LEFT JOIN users rv ON rv.uuid = a.reviewer_id
     ),
     reviews AS (
       SELECT
         er.assignment_id,
         er.recommendation,
         er.submitted_at
       FROM ebook_reviews er
     ),
     review_summary AS (
       SELECT
         a.ebook_id,

         -- assignment counts
         COUNT(*) FILTER (WHERE a.assignment_status = 'INVITED')::int AS invited_count,
         COUNT(*) FILTER (WHERE a.assignment_status = 'ACCEPTED')::int AS accepted_count,
         COUNT(*) FILTER (WHERE a.assignment_status = 'SUBMITTED')::int AS submitted_count,
         COUNT(*) FILTER (WHERE a.assignment_status = 'CANCELLED')::int AS cancelled_count,

         -- recommendation counts (only for submitted reviews)
         COUNT(*) FILTER (WHERE rv.recommendation = 'ACCEPT')::int AS rec_accept,
         COUNT(*) FILTER (WHERE rv.recommendation = 'MINOR')::int AS rec_minor,
         COUNT(*) FILTER (WHERE rv.recommendation = 'MAJOR')::int AS rec_major,
         COUNT(*) FILTER (WHERE rv.recommendation = 'REJECT')::int AS rec_reject,

         MAX(rv.submitted_at) AS last_review_submitted_at
       FROM assignments a
       LEFT JOIN reviews rv ON rv.assignment_id = a.assignment_id
       GROUP BY a.ebook_id
     )
     SELECT
       e.ebook_id,
       e.title,
       e.status,
       e.created_at,
       e.updated_at,
       e.author_id,
       e.editor_id,
       au.full_name AS author_name,

       -- list of reviewer assignments (same as Step 1.3)
       COALESCE(
         json_agg(
           json_build_object(
             'assignment_id', a.assignment_id,
             'reviewer_id', a.reviewer_id,
             'reviewer_name', a.reviewer_name,
             'reviewer_email', a.reviewer_email,
             'status', a.assignment_status,
             'assigned_at', a.assigned_at,
             'due_at', a.due_at
           )
         ) FILTER (WHERE a.assignment_id IS NOT NULL),
         '[]'::json
       ) AS reviewer_assignments,

       -- review summary (Step 1.6)
       COALESCE(rs.invited_count, 0) AS invited_count,
       COALESCE(rs.accepted_count, 0) AS accepted_count,
       COALESCE(rs.submitted_count, 0) AS submitted_count,
       COALESCE(rs.cancelled_count, 0) AS cancelled_count,

       COALESCE(rs.rec_accept, 0) AS rec_accept,
       COALESCE(rs.rec_minor, 0) AS rec_minor,
       COALESCE(rs.rec_major, 0) AS rec_major,
       COALESCE(rs.rec_reject, 0) AS rec_reject,

       rs.last_review_submitted_at

     FROM ebooks e
     JOIN users au ON au.uuid = e.author_id
     LEFT JOIN assignments a ON a.ebook_id = e.ebook_id
     LEFT JOIN review_summary rs ON rs.ebook_id = e.ebook_id

     WHERE e.status IN ('SUBMITTED','SCREENING','RETURNED_FOR_CORRECTION','UNDER_REVIEW','REVISION_REQUIRED','ACCEPTED')
     GROUP BY
       e.ebook_id, e.title, e.status, e.created_at, e.updated_at, e.author_id, e.editor_id,
       au.full_name,
       rs.invited_count, rs.accepted_count, rs.submitted_count, rs.cancelled_count,
       rs.rec_accept, rs.rec_minor, rs.rec_major, rs.rec_reject,
       rs.last_review_submitted_at
     ORDER BY e.updated_at DESC`
  );

  res.json({ success: true, data: r.rows });
}

/**
 * Editor changes status + optional decision record.
 */
export async function setStatus(req, res) {
  const editorId = req.user.uuid;
  const { id } = req.params;
  const { new_status, comments, decision } = req.body;

  await q("BEGIN");
  try {
    const cur = await q(`SELECT status FROM ebooks WHERE ebook_id=$1`, [id]);
    if (!cur.rowCount) { await q("ROLLBACK"); return res.status(404).json({ success:false, message:"Not found"}); }

    await q(`UPDATE ebooks SET status=$1, editor_id=$2, updated_at=now() WHERE ebook_id=$3`, [
      new_status,
      editorId,
      id,
    ]);

    if (decision) {
      await q(
        `INSERT INTO ebook_decisions(ebook_id,decided_by,decision,remarks)
         VALUES($1,$2,$3,$4)`,
        [id, editorId, decision, comments || null]
      );
    }

    await q(
      `INSERT INTO ebook_workflow_history(ebook_id,previous_status,new_status,changed_by,comments)
       VALUES($1,$2,$3,$4,$5)`,
      [id, cur.rows[0].status, new_status, editorId, comments || null]
    );

    await q("COMMIT");
    res.json({ success: true });
  } catch (e) {
    await q("ROLLBACK");
    console.error(e);
    res.status(500).json({ success: false, message: "Status update failed" });
  }
}

/**
 * Author uploads a revised version: creates new version_no + sets current_version_id.
 */
export async function submitRevision(req, res) {
  const authorId = req.user.uuid;
  const { id } = req.params;
  const { revision_requested, notes } = req.body;

  await q("BEGIN");
  try {
    const ebook = await q(`SELECT author_id, status FROM ebooks WHERE ebook_id=$1`, [id]);
    if (!ebook.rowCount) { await q("ROLLBACK"); return res.status(404).json({ success:false, message:"Not found"}); }
    if (ebook.rows[0].author_id !== authorId) { await q("ROLLBACK"); return res.status(403).json({ success:false, message:"Forbidden"}); }

    const vMax = await q(`SELECT COALESCE(MAX(version_no),0) AS max FROM ebook_versions WHERE ebook_id=$1`, [id]);
    const nextNo = Number(vMax.rows[0].max) + 1;

    const v = await q(
      `INSERT INTO ebook_versions(ebook_id,version_no,is_final,submitted_by,revision_requested,notes)
       VALUES($1,$2,false,$3,$4,$5) RETURNING *`,
      [id, nextNo, authorId, revision_requested || null, notes || null]
    );

    await q(`UPDATE ebooks SET current_version_id=$1, status='REVISION_REQUIRED', updated_at=now() WHERE ebook_id=$2`, [
      v.rows[0].version_id, id
    ]);

    await q(
      `INSERT INTO ebook_workflow_history(ebook_id,previous_status,new_status,changed_by,comments)
       VALUES($1,$2,'REVISION_REQUIRED',$3,'Revision submitted')`,
      [id, ebook.rows[0].status, authorId]
    );

    await q("COMMIT");
    res.json({ success: true, version: v.rows[0] });
  } catch (e) {
    await q("ROLLBACK");
    console.error(e);
    res.status(500).json({ success:false, message:"Revision failed" });
  }


  
}
export async function getEbookReviews(req, res) {
  const { id } = req.params;

  const r = await q(
    `SELECT
       a.assignment_id,
       a.ebook_id,
       a.status AS assignment_status,
       a.assigned_at,
       a.due_at,

       u.uuid AS reviewer_id,
       u.full_name AS reviewer_name,
       u.email AS reviewer_email,

       rv.recommendation,
       rv.comments_to_author,
       rv.confidential_comments_to_editor,
       rv.submitted_at
     FROM ebook_reviewer_assignments a
     JOIN users u ON u.uuid = a.reviewer_id
     LEFT JOIN ebook_reviews rv ON rv.assignment_id = a.assignment_id
     WHERE a.ebook_id = $1
     ORDER BY rv.submitted_at DESC NULLS LAST, a.assigned_at DESC`,
    [id]
  );

  res.json({ success: true, data: r.rows });
}
