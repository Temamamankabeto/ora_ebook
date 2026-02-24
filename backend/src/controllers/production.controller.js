import { q } from "../db/pool.js";

export async function productionQueue(req, res) {
  const r = await q(
    `SELECT e.*
     FROM ebooks e
     WHERE e.status IN ('FINANCE_CLEARED','IN_PRODUCTION')
     ORDER BY e.updated_at DESC`
  );
  res.json({ success: true, data: r.rows });
}

export async function startProduction(req, res) {
  const managerId = req.user.uuid;
  const { ebook_id } = req.body;

  const cur = await q(`SELECT status FROM ebooks WHERE ebook_id=$1`, [ebook_id]);

  await q(
    `INSERT INTO ebook_production(ebook_id, manager_id)
     VALUES($1,$2)
     ON CONFLICT (ebook_id) DO UPDATE SET manager_id=EXCLUDED.manager_id`,
    [ebook_id, managerId]
  );

  await q(`UPDATE ebooks SET status='IN_PRODUCTION', updated_at=now() WHERE ebook_id=$1`, [ebook_id]);

  await q(
    `INSERT INTO ebook_workflow_history(ebook_id,previous_status,new_status,changed_by,comments)
     VALUES($1,$2,'IN_PRODUCTION',$3,'Production started')`,
    [ebook_id, cur.rows[0]?.status || null, managerId]
  );

  res.json({ success: true });
}

export async function publish(req, res) {
  const managerId = req.user.uuid;
  const { ebook_id, access, embargo_until, isbn, doi } = req.body;

  const cur = await q(`SELECT status FROM ebooks WHERE ebook_id=$1`, [ebook_id]);

  await q(
    `UPDATE ebooks
     SET status='PUBLISHED',
         published_at=now(),
         access=$2,
         embargo_until=$3,
         isbn=$4,
         doi=$5,
         updated_at=now()
     WHERE ebook_id=$1`,
    [ebook_id, access || "OPEN", embargo_until || null, isbn || null, doi || null]
  );

  await q(
    `INSERT INTO ebook_workflow_history(ebook_id,previous_status,new_status,changed_by,comments)
     VALUES($1,$2,'PUBLISHED',$3,'Published')`,
    [ebook_id, cur.rows[0]?.status || null, managerId]
  );

  res.json({ success: true });
}
