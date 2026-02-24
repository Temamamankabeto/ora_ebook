import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { publicLibrary } from "../api/ebooks.js";

export default function PublicLibraryPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await publicLibrary();
        setRows(r.data);
      } catch (e) { setErr(e.message); }
    })();
  }, []);

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Public Library</h2>
        {err && <div className="card" style={{background:"#fff5f5"}}>{err}</div>}
        <div className="card">
          {rows.length === 0 ? <p>No published eBooks yet.</p> : (
            <table>
              <thead><tr><th>Title</th><th>Access</th><th>Published</th><th>ISBN</th><th>DOI</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.ebook_id}>
                    <td>{r.title}</td>
                    <td><span className="badge">{r.access}</span></td>
                    <td><small>{r.published_at ? new Date(r.published_at).toLocaleString() : "-"}</small></td>
                    <td><small>{r.isbn || "-"}</small></td>
                    <td><small>{r.doi || "-"}</small></td>
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
