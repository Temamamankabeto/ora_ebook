import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { myReviewQueue, acceptInvite, submitReview } from "../api/reviews.js";

export default function ReviewQueuePage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [review, setReview] = useState({ assignment_id:"", recommendation:"ACCEPT", comments_to_author:"", confidential_comments_to_editor:"" });

  const load = async () => {
    setErr("");
    try {
      const r = await myReviewQueue();
      setRows(r.data);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, []);

  const doAccept = async (id) => {
    try { await acceptInvite(id); await load(); } catch (e) { setErr(e.message); }
  };

  const doSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitReview(review.assignment_id, review);
      setReview({ assignment_id:"", recommendation:"ACCEPT", comments_to_author:"", confidential_comments_to_editor:"" });
      await load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>My Review Queue</h2>
        {err && <div className="card" style={{background:"#fff5f5"}}>{err}</div>}

        <div className="card">
          <table>
            <thead><tr><th>Title</th><th>Status</th><th>Invite Status</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.assignment_id}>
                  <td>{r.title}</td>
                  <td><span className="badge">{r.status}</span></td>
                  <td><span className="badge">{r.status_1 || r.status}</span></td>
                  <td>
                    <button className="btn secondary small" onClick={()=>doAccept(r.assignment_id)}>Accept Invite</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{marginTop:12}}>
          <h3 style={{marginTop:0}}>Submit Review</h3>
          <form className="grid" onSubmit={doSubmit}>
            <input className="input" placeholder="assignment_id" value={review.assignment_id}
              onChange={e=>setReview({...review, assignment_id:e.target.value})} />
            <select className="input" value={review.recommendation} onChange={e=>setReview({...review, recommendation:e.target.value})}>
              <option value="ACCEPT">ACCEPT</option>
              <option value="MINOR">MINOR</option>
              <option value="MAJOR">MAJOR</option>
              <option value="REJECT">REJECT</option>
            </select>
            <textarea className="input" rows={4} placeholder="Comments to author" value={review.comments_to_author}
              onChange={e=>setReview({...review, comments_to_author:e.target.value})} />
            <textarea className="input" rows={4} placeholder="Confidential comments to editor" value={review.confidential_comments_to_editor}
              onChange={e=>setReview({...review, confidential_comments_to_editor:e.target.value})} />
            <button className="btn" type="submit">Submit Review</button>
          </form>
        </div>
      </div>
    </>
  );
}
