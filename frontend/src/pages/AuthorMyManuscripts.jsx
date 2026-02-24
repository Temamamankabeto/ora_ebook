import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { myEbooks } from "../api/ebooks.js";
import { Link } from "react-router-dom";

export default function AuthorMyManuscripts() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await myEbooks();
        setRows(r.data);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>My Manuscripts</h2>
        {err && <div className="card" style={{background:"#fff5f5"}}>{err}</div>}
        <div className="card">
          {rows.length === 0 ? <p>No manuscripts yet.</p> : (
            <table>
              <thead><tr><th>Title</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.ebook_id}>
                    <td>{r.title}</td>
                    <td><span className="badge">{r.status}</span></td>
                    <td><small>{new Date(r.created_at).toLocaleString()}</small></td>
                    <td><Link className="btn secondary small" to={`/ebooks/${r.ebook_id}`} style={{textDecoration:"none"}}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
