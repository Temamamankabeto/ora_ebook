import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { editorQueue, editorSetStatus } from "../api/ebooks.js";
import { assignReviewer } from "../api/reviews.js";
import { Link } from "react-router-dom";

export default function EditorQueuePage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [assign, setAssign] = useState({ ebook_id:"", reviewer_id:"", due_at:"" });

  const load = async () => {
    setErr("");
    try {
      const r = await editorQueue();
      setRows(r.data);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id, new_status, decision) => {
    try {
      await editorSetStatus(id, { new_status, decision, comments: decision });
      await load();
    } catch (e) { setErr(e.message); }
  };

  const doAssign = async (e) => {
    e.preventDefault();
    try {
      await assignReviewer(assign);
      setAssign({ ebook_id:"", reviewer_id:"", due_at:"" });
      await load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Editor Queue</h2>
        {err && <div className="card" style={{background:"#fff5f5"}}>{err}</div>}
        <div className="card">
          <p><small>Actions: screening, send to review, request revision, accept/reject.</small></p>
          <table>
            <thead><tr><th>Title</th><th>Author</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.ebook_id}>
                  <td><Link to={`/ebooks/${r.ebook_id}`}>{r.title}</Link></td>
                  <td><small>{r.author_name}</small></td>
                  <td><span className="badge">{r.status}</span></td>
                  <td style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                    <button className="btn small" onClick={()=>setStatus(r.ebook_id, "SCREENING", "SCREENING")}>Screen</button>
                    <button className="btn secondary small" onClick={()=>setStatus(r.ebook_id, "UNDER_REVIEW", "SEND_TO_REVIEW")}>Send to Review</button>
                    <button className="btn secondary small" onClick={()=>setStatus(r.ebook_id, "REVISION_REQUIRED", "MAJOR_REVISION")}>Major Rev</button>
                    <button className="btn secondary small" onClick={()=>setStatus(r.ebook_id, "REVISION_REQUIRED", "MINOR_REVISION")}>Minor Rev</button>
                    <button className="btn secondary small" onClick={()=>setStatus(r.ebook_id, "ACCEPTED", "ACCEPT")}>Accept</button>
                    <button className="btn secondary small" onClick={()=>setStatus(r.ebook_id, "REJECTED", "REJECT")}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{marginTop:12}}>
          <h3 style={{marginTop:0}}>Assign Reviewer</h3>
          <p><small>Enter reviewer UUID from `users` table (or create reviewer account and copy uuid).</small></p>
          <form className="grid grid-2" onSubmit={doAssign}>
            <input className="input" placeholder="ebook_id" value={assign.ebook_id} onChange={e=>setAssign({...assign, ebook_id:e.target.value})} />
            <input className="input" placeholder="reviewer_id" value={assign.reviewer_id} onChange={e=>setAssign({...assign, reviewer_id:e.target.value})} />
            <input className="input" placeholder="due_at (optional ISO timestamp)" value={assign.due_at} onChange={e=>setAssign({...assign, due_at:e.target.value})} />
            <button className="btn" type="submit">Assign</button>
          </form>
        </div>
      </div>
    </>
  );
}
