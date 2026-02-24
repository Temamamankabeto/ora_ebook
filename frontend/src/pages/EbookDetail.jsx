import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { ebookDetail, uploadFile, submitRevision } from "../api/ebooks.js";
import { useParams } from "react-router-dom";

export default function EbookDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("REVISED");
  const [rev, setRev] = useState({ revision_requested:"MINOR", notes:"" });

  const load = async () => {
    setErr("");
    try {
      const r = await ebookDetail(id);
      setData(r);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, [id]);

  const doUpload = async () => {
    try {
      if (!file) return;
      await uploadFile(id, file, fileType);
      setFile(null);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const doRevision = async () => {
    try {
      await submitRevision(id, rev);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Manuscript Detail</h2>
        {err && <div className="card" style={{background:"#fff5f5"}}>{err}</div>}
        {!data ? <div className="card">Loading...</div> : (
          <div className="grid">
            <div className="card">
              <h3 style={{marginTop:0}}>{data.ebook.title}</h3>
              <p><span className="badge">{data.ebook.status}</span> <span className="badge">{data.ebook.access}</span></p>
              <p><small>Created: {new Date(data.ebook.created_at).toLocaleString()}</small></p>
              <p><strong>Abstract:</strong><br />{data.ebook.abstract || "-"}</p>
              <p><strong>Keywords:</strong> {(data.ebook.keywords || []).join(", ")}</p>
            </div>

            <div className="card">
              <h3 style={{marginTop:0}}>Upload file</h3>
              <div className="grid grid-2">
                <select className="input" value={fileType} onChange={e=>setFileType(e.target.value)}>
                  <option value="MANUSCRIPT">MANUSCRIPT</option>
                  <option value="REVISED">REVISED</option>
                  <option value="PROOF">PROOF</option>
                  <option value="PDF">PDF</option>
                  <option value="EPUB">EPUB</option>
                  <option value="COVER">COVER</option>
                  <option value="RECEIPT">RECEIPT</option>
                </select>
                <input className="input" type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
              </div>
              <button className="btn" onClick={doUpload} style={{marginTop:10}}>Upload</button>

              <hr style={{border:"none", borderTop:"1px solid #eee", margin:"16px 0"}} />

              <h3 style={{marginTop:0}}>Submit revision (new version)</h3>
              <div className="grid grid-2">
                <select className="input" value={rev.revision_requested} onChange={e=>setRev({...rev, revision_requested:e.target.value})}>
                  <option value="MINOR">MINOR</option>
                  <option value="MAJOR">MAJOR</option>
                </select>
                <input className="input" placeholder="Notes" value={rev.notes} onChange={e=>setRev({...rev, notes:e.target.value})} />
              </div>
              <button className="btn secondary" onClick={doRevision} style={{marginTop:10}}>Create New Version</button>
            </div>

            <div className="card">
              <h3 style={{marginTop:0}}>Files</h3>
              {data.files.length === 0 ? <p>No files yet.</p> : (
                <table>
                  <thead><tr><th>Type</th><th>Name</th><th>Uploaded</th></tr></thead>
                  <tbody>
                    {data.files.map(f => (
                      <tr key={f.file_id}>
                        <td><span className="badge">{f.file_type}</span></td>
                        <td><small>{f.original_name}</small></td>
                        <td><small>{new Date(f.uploaded_at).toLocaleString()}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h3 style={{marginTop:0}}>Workflow history</h3>
              {data.history.length === 0 ? <p>No history.</p> : (
                <table>
                  <thead><tr><th>From</th><th>To</th><th>When</th><th>Comment</th></tr></thead>
                  <tbody>
                    {data.history.map(h => (
                      <tr key={h.history_id}>
                        <td><small>{h.previous_status || "-"}</small></td>
                        <td><span className="badge">{h.new_status}</span></td>
                        <td><small>{new Date(h.changed_at).toLocaleString()}</small></td>
                        <td><small>{h.comments || ""}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}
