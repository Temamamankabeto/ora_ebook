import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { ebookDetail, uploadFile, submitRevision } from "../api/ebooks.js";
import { getEbookReviews } from "../api/ebookReviews.js";
import { useParams } from "react-router-dom";

export default function EbookDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("REVISED");
  const [rev, setRev] = useState({ revision_requested: "MINOR", notes: "" });

  // Step 1.7: reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const load = async () => {
    setErr("");
    try {
      const r = await ebookDetail(id);
      setData(r);
    } catch (e) {
      setErr(e.message);
    }
  };

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const r = await getEbookReviews(id);
      setReviews(r.data || []);
    } catch (e) {
      // Only editor/admin can view reviews
      console.warn("Reviews fetch failed:", e.message);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadReviews();
  }, [id]);

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

  const fmt = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Manuscript Detail</h2>
        {err && <div className="card" style={{ background: "#fff5f5" }}>{err}</div>}

        {!data ? (
          <div className="card">Loading...</div>
        ) : (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>{data.ebook.title}</h3>
              <p>
                <span className="badge">{data.ebook.status}</span>{" "}
                <span className="badge">{data.ebook.access}</span>
              </p>
              <p><small>Created: {fmt(data.ebook.created_at)}</small></p>
              <p><strong>Abstract:</strong><br />{data.ebook.abstract || "-"}</p>
              <p><strong>Keywords:</strong> {(data.ebook.keywords || []).join(", ")}</p>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Upload file</h3>
              <div className="grid grid-2">
                <select className="input" value={fileType} onChange={(e) => setFileType(e.target.value)}>
                  <option value="MANUSCRIPT">MANUSCRIPT</option>
                  <option value="REVISED">REVISED</option>
                  <option value="PROOF">PROOF</option>
                  <option value="PDF">PDF</option>
                  <option value="EPUB">EPUB</option>
                  <option value="COVER">COVER</option>
                  <option value="RECEIPT">RECEIPT</option>
                </select>
                <input className="input" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <button className="btn" onClick={doUpload} style={{ marginTop: 10 }}>Upload</button>

              <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "16px 0" }} />

              <h3 style={{ marginTop: 0 }}>Submit revision (new version)</h3>
              <div className="grid grid-2">
                <select
                  className="input"
                  value={rev.revision_requested}
                  onChange={(e) => setRev({ ...rev, revision_requested: e.target.value })}
                >
                  <option value="MINOR">MINOR</option>
                  <option value="MAJOR">MAJOR</option>
                </select>
                <input
                  className="input"
                  placeholder="Notes"
                  value={rev.notes}
                  onChange={(e) => setRev({ ...rev, notes: e.target.value })}
                />
              </div>
              <button className="btn secondary" onClick={doRevision} style={{ marginTop: 10 }}>
                Create New Version
              </button>
            </div>

            {/* Step 1.7 Reviews Panel */}
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Peer Reviews (Editor/Admin)</h3>

              {reviewsLoading ? (
                <p>Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p>No reviews yet (or you do not have permission).</p>
              ) : (
                <div className="grid" style={{ gap: 10 }}>
                  {reviews.map((r) => (
                    <div key={r.assignment_id} className="card" style={{ padding: 12, boxShadow: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <strong>{r.reviewer_name}</strong> <small>({r.reviewer_email})</small>
                          <div>
                            <small>
                              Assignment: <span className="badge">{r.assignment_status}</span>
                            </small>
                          </div>
                        </div>
                        <span className="badge">
                          Recommendation: {r.recommendation || "—"}
                        </span>
                      </div>

                      <div style={{ marginTop: 6 }}>
                        <small>Submitted: {fmt(r.submitted_at)}</small>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <h4 style={{ margin: "6px 0" }}>Comments to Author</h4>
                        <div className="card" style={{ padding: 10, boxShadow: "none" }}>
                          <small style={{ whiteSpace: "pre-wrap" }}>{r.comments_to_author || "—"}</small>
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <h4 style={{ margin: "6px 0" }}>Confidential Comments to Editor</h4>
                        <div className="card" style={{ padding: 10, background: "#fff9db", boxShadow: "none" }}>
                          <small style={{ whiteSpace: "pre-wrap" }}>{r.confidential_comments_to_editor || "—"}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Files</h3>
              {data.files.length === 0 ? (
                <p>No files yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Type</th><th>Name</th><th>Uploaded</th></tr>
                  </thead>
                  <tbody>
                    {data.files.map((f) => (
                      <tr key={f.file_id}>
                        <td><span className="badge">{f.file_type}</span></td>
                        <td><small>{f.original_name}</small></td>
                        <td><small>{fmt(f.uploaded_at)}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Workflow history</h3>
              {data.history.length === 0 ? (
                <p>No history.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>From</th><th>To</th><th>When</th><th>Comment</th></tr>
                  </thead>
                  <tbody>
                    {data.history.map((h) => (
                      <tr key={h.history_id}>
                        <td><small>{h.previous_status || "-"}</small></td>
                        <td><span className="badge">{h.new_status}</span></td>
                        <td><small>{fmt(h.changed_at)}</small></td>
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