import { q } from "../db/pool.js";

function canAccess(row, hasLogin) {
  if (row.access === "OPEN") return true;
  if (row.access === "RESTRICTED") return hasLogin;
  if (row.access === "EMBARGOED") {
    if (!hasLogin) return false;
    if (!row.embargo_until) return true;
    const today = new Date().toISOString().slice(0,10);
    return today >= row.embargo_until.toISOString().slice(0,10);
  }
  return false;
}

export async function publicLibrary(req, res) {
  const r = await q(
    `SELECT ebook_id, title, abstract, keywords, access, embargo_until, isbn, doi, published_at
     FROM ebooks
     WHERE status='PUBLISHED'
     ORDER BY published_at DESC`
  );
  res.json({ success: true, data: r.rows });
}

export async function getPublicEbook(req, res) {
  const { id } = req.params;
  const e = await q(`SELECT * FROM ebooks WHERE ebook_id=$1 AND status='PUBLISHED'`, [id]);
  if (!e.rowCount) return res.status(404).json({ success:false, message:"Not found" });

  // Access check: if restricted/embargoed, requires auth (handled by frontend via /api/public)
  res.json({ success:true, ebook: e.rows[0] });
}

export async function logAccess(req, res) {
  const { ebook_id } = req.params;
  const { action } = req.body;
  const userId = req.user?.uuid || null;

  await q(
    `INSERT INTO ebook_access_logs(ebook_id,user_id,action,ip_address,user_agent)
     VALUES($1,$2,$3,$4,$5)`,
    [ebook_id, userId, action, req.ip || null, req.headers["user-agent"] || null]
  );

  res.json({ success: true });
}
