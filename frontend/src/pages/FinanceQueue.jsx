import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { financeQueue, setPayment } from "../api/finance.js";

export default function FinanceQueuePage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ ebook_id:"", status:"PAID", bpc_amount:"", currency:"ETB", finance_notes:"" });

  const load = async () => {
    setErr("");
    try {
      const r = await financeQueue();
      setRows(r.data);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await setPayment(form); await load(); } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Finance Queue</h2>
        {err && <div className="card" style={{background:"#fff5f5"}}>{err}</div>}
        <div className="card">
          <table>
            <thead><tr><th>Title</th><th>Status</th><th>Payment</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.ebook_id}>
                  <td>{r.title}</td>
                  <td><span className="badge">{r.status}</span></td>
                  <td><span className="badge">{r.payment_status || "PENDING"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{marginTop:12}}>
          <h3 style={{marginTop:0}}>Set Payment / Clearance</h3>
          <form className="grid grid-2" onSubmit={submit}>
            <input className="input" placeholder="ebook_id" value={form.ebook_id} onChange={e=>setForm({...form, ebook_id:e.target.value})} />
            <select className="input" value={form.status} onChange={e=>setForm({...form, status:e.target.value})}>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="WAIVED">WAIVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="NOT_REQUIRED">NOT_REQUIRED</option>
            </select>
            <input className="input" placeholder="bpc_amount" value={form.bpc_amount} onChange={e=>setForm({...form, bpc_amount:e.target.value})} />
            <input className="input" placeholder="currency" value={form.currency} onChange={e=>setForm({...form, currency:e.target.value})} />
            <input className="input" placeholder="notes" value={form.finance_notes} onChange={e=>setForm({...form, finance_notes:e.target.value})} />
            <button className="btn" type="submit">Save</button>
          </form>
        </div>
      </div>
    </>
  );
}
