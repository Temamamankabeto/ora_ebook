import { q } from "../db/pool.js";

export async function financeQueue(req, res) {
  const r = await q(
    `SELECT e.*, p.status AS payment_status, p.bpc_amount, p.currency
     FROM ebooks e
     LEFT JOIN ebook_payments p ON p.ebook_id = e.ebook_id
     WHERE e.status IN ('ACCEPTED','FINANCE_PENDING','FINANCE_CLEARED')
     ORDER BY e.updated_at DESC`
  );
  res.json({ success: true, data: r.rows });
}

export async function setPayment(req, res) {
  const financeId = req.user.uuid;
  const { ebook_id, status, bpc_amount, currency, finance_notes } = req.body;

  await q(
    `INSERT INTO ebook_payments(ebook_id, status, bpc_amount, currency, finance_officer_id, finance_notes, finance_cleared_at)
     VALUES($1,$2,$3,$4,$5,$6, CASE WHEN $2 IN ('PAID','WAIVED') THEN now() ELSE NULL END)
     ON CONFLICT (ebook_id) DO UPDATE SET
       status=EXCLUDED.status,
       bpc_amount=EXCLUDED.bpc_amount,
       currency=EXCLUDED.currency,
       finance_officer_id=EXCLUDED.finance_officer_id,
       finance_notes=EXCLUDED.finance_notes,
       finance_cleared_at=EXCLUDED.finance_cleared_at`,
    [ebook_id, status, bpc_amount || null, currency || "ETB", financeId, finance_notes || null]
  );

  if (status === "PAID" || status === "WAIVED") {
    const cur = await q(`SELECT status FROM ebooks WHERE ebook_id=$1`, [ebook_id]);
    await q(`UPDATE ebooks SET status='FINANCE_CLEARED', updated_at=now() WHERE ebook_id=$1`, [ebook_id]);
    await q(
      `INSERT INTO ebook_workflow_history(ebook_id,previous_status,new_status,changed_by,comments)
       VALUES($1,$2,'FINANCE_CLEARED',$3,'Finance cleared')`,
      [ebook_id, cur.rows[0]?.status || null, financeId]
    );
  } else {
    await q(`UPDATE ebooks SET status='FINANCE_PENDING', updated_at=now() WHERE ebook_id=$1`, [ebook_id]);
  }

  res.json({ success: true });
}
