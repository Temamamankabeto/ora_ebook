import { q } from "../db/pool.js";

export async function listUsers(req, res) {
  const role = (req.query.role || "").trim();
  const search = (req.query.q || "").trim();
  const like = search ? `%${search}%` : null;

  // If role provided, filter by role
  if (role) {
    // For reviewers, include workload (pending assignments)
    const r = await q(
      `SELECT
         u.uuid,
         u.full_name,
         u.email,
         COALESCE(p.pending_count, 0)::int AS pending_count
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.uuid
       JOIN roles ro ON ro.uuid = ur.role_id
       LEFT JOIN (
         SELECT reviewer_id, COUNT(*) AS pending_count
         FROM ebook_reviewer_assignments
         WHERE status IN ('INVITED','ACCEPTED')
         GROUP BY reviewer_id
       ) p ON p.reviewer_id = u.uuid
       WHERE ro.name = $1
         AND ($2::text IS NULL OR u.full_name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY COALESCE(p.pending_count,0) ASC, u.full_name ASC
       LIMIT 200`,
      [role, like]
    );

    return res.json({ success: true, data: r.rows });
  }

  // fallback: list all users
  const r = await q(
    `SELECT uuid, full_name, email
     FROM users
     WHERE ($1::text IS NULL OR full_name ILIKE $1 OR email ILIKE $1)
     ORDER BY full_name ASC
     LIMIT 200`,
    [like]
  );

  res.json({ success: true, data: r.rows });
}


export async function editorQueue(req, res) {
  const r = await q(
    `SELECT
        e.ebook_id,
        e.title,
        e.status,
        e.created_at,
        e.updated_at,
        e.author_id,
        e.editor_id,
        u.full_name AS author_name,

        COALESCE(
          json_agg(
            json_build_object(
              'assignment_id', a.assignment_id,
              'reviewer_id', rv.uuid,
              'reviewer_name', rv.full_name,
              'reviewer_email', rv.email,
              'status', a.status,
              'assigned_at', a.assigned_at,
              'due_at', a.due_at
            )
          ) FILTER (WHERE a.assignment_id IS NOT NULL),
          '[]'::json
        ) AS reviewer_assignments

     FROM ebooks e
     JOIN users u ON u.uuid = e.author_id
     LEFT JOIN ebook_reviewer_assignments a ON a.ebook_id = e.ebook_id
     LEFT JOIN users rv ON rv.uuid = a.reviewer_id

     WHERE e.status IN ('SUBMITTED','SCREENING','RETURNED_FOR_CORRECTION','UNDER_REVIEW','REVISION_REQUIRED','ACCEPTED')
     GROUP BY
       e.ebook_id, e.title, e.status, e.created_at, e.updated_at, e.author_id, e.editor_id,
       u.full_name
     ORDER BY e.updated_at DESC`
  );

  res.json({ success: true, data: r.rows });
}