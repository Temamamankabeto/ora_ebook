import { q } from "../db/pool.js";

export async function listUsers(req, res) {
  const role = (req.query.role || "").trim();
  const search = (req.query.q || "").trim();

  const like = search ? `%${search}%` : null;

  if (role) {
    const r = await q(
      `SELECT u.uuid, u.full_name, u.email
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.uuid
       JOIN roles ro ON ro.uuid = ur.role_id
       WHERE ro.name = $1
         AND ($2::text IS NULL OR u.full_name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY u.full_name ASC
       LIMIT 200`,
      [role, like]
    );
    return res.json({ success: true, data: r.rows });
  }

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