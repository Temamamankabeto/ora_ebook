import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { editorQueue, editorSetStatus } from "../api/ebooks.js";
import { assignReviewer } from "../api/reviews.js";
import { listReviewers } from "../api/users.js";
import { Link } from "react-router-dom";

export default function EditorQueuePage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  // Global assign form (still available)
  const [assign, setAssign] = useState({ ebook_id: "", reviewer_id: "", due_at: "" });

  // Reviewer search + list
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [reviewers, setReviewers] = useState([]);
  const [loadingReviewers, setLoadingReviewers] = useState(false);

  // Per-row assignment selections
  const [rowReviewer, setRowReviewer] = useState({}); // { [ebook_id]: reviewer_uuid }
  const [rowDueAt, setRowDueAt] = useState({});       // { [ebook_id]: "YYYY-MM-DDTHH:mm" }

  const load = async () => {
    setErr("");
    try {
      const r = await editorQueue();
      setRows(r.data);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fetchReviewers = async (search = "") => {
    setLoadingReviewers(true);
    try {
      const r = await listReviewers(search);
      setReviewers(r.data || []);
    } catch (e) {
      console.warn("Failed to load reviewers:", e.message);
    } finally {
      setLoadingReviewers(false);
    }
  };

  useEffect(() => {
    fetchReviewers("");
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchReviewers(reviewerSearch);
    }, 250);
    return () => clearTimeout(t);
  }, [reviewerSearch]);

  const setStatus = async (id, new_status, decision) => {
    try {
      await editorSetStatus(id, { new_status, decision, comments: decision });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const doAssignGlobal = async (e) => {
    e.preventDefault();
    setErr("");

    if (!assign.ebook_id) return setErr("ebook_id is required");
    if (!assign.reviewer_id) return setErr("Please select a reviewer");

    try {
      await assignReviewer({
        ebook_id: assign.ebook_id,
        reviewer_id: assign.reviewer_id,
        due_at: assign.due_at || ""
      });
      setAssign({ ebook_id: "", reviewer_id: "", due_at: "" });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const doAssignRow = async (ebook_id) => {
    setErr("");
    const reviewer_id = rowReviewer[ebook_id];
    const due_at = rowDueAt[ebook_id] || "";

    if (!reviewer_id) {
      setErr("Select a reviewer in the row dropdown first.");
      return;
    }

    try {
      await assignReviewer({ ebook_id, reviewer_id, due_at });
      // Clear the row selection after assigning
      setRowReviewer((m) => ({ ...m, [ebook_id]: "" }));
      setRowDueAt((m) => ({ ...m, [ebook_id]: "" }));
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const selectedReviewer = useMemo(
    () => reviewers.find((r) => r.uuid === assign.reviewer_id),
    [reviewers, assign.reviewer_id]
  );

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Editor Queue</h2>
        {err && <div className="card" style={{ background: "#fff5f5" }}>{err}</div>}

        <div className="card">
          <p><small>Row Assign lets you assign reviewers without copying ebook_id. Workload shows pending invites/accepted reviews.</small></p>

          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th style={{minWidth: 320}}>Row Assign Reviewer</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.ebook_id}>
                  <td><Link to={`/ebooks/${r.ebook_id}`}>{r.title}</Link></td>
                  <td><small>{r.author_name}</small></td>
                  <td><span className="badge">{r.status}</span></td>

                  {/* Row Assign */}
                  <td>
                    <div style={{display:"grid", gap:6}}>
                      <select
                        className="input"
                        value={rowReviewer[r.ebook_id] || ""}
                        onChange={(e) =>
                          setRowReviewer((m) => ({ ...m, [r.ebook_id]: e.target.value }))
                        }
                      >
                        <option value="">
                          {loadingReviewers ? "Loading reviewers..." : "Select reviewer"}
                        </option>
                        {reviewers.map((u) => (
                          <option key={u.uuid} value={u.uuid}>
                            {u.full_name} — {u.email} (pending: {u.pending_count ?? 0})
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-2">
                        <input
                          className="input"
                          type="datetime-local"
                          value={rowDueAt[r.ebook_id] || ""}
                          onChange={(e) =>
                            setRowDueAt((m) => ({ ...m, [r.ebook_id]: e.target.value }))
                          }
                        />
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => doAssignRow(r.ebook_id)}
                        >
                          Assign
                        </button>
                      </div>
                      <small>
                        ebook_id: <code>{r.ebook_id}</code>
                      </small>
                    </div>
                  </td>

                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn small" onClick={() => setStatus(r.ebook_id, "SCREENING", "SCREENING")}>Screen</button>
                    <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "UNDER_REVIEW", "SEND_TO_REVIEW")}>Send to Review</button>
                    <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "REVISION_REQUIRED", "MAJOR_REVISION")}>Major Rev</button>
                    <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "REVISION_REQUIRED", "MINOR_REVISION")}>Minor Rev</button>
                    <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "ACCEPTED", "ACCEPT")}>Accept</button>
                    <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "REJECTED", "REJECT")}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Assign (still useful sometimes) */}
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Assign Reviewer (Global Form)</h3>

          <form className="grid" onSubmit={doAssignGlobal}>
            <div className="grid grid-2">
              <input
                className="input"
                placeholder="ebook_id"
                value={assign.ebook_id}
                onChange={(e) => setAssign({ ...assign, ebook_id: e.target.value })}
              />
              <input
                className="input"
                placeholder="due_at (optional ISO timestamp)"
                value={assign.due_at}
                onChange={(e) => setAssign({ ...assign, due_at: e.target.value })}
              />
            </div>

            <div className="grid grid-2">
              <input
                className="input"
                placeholder="Search reviewer by name/email"
                value={reviewerSearch}
                onChange={(e) => setReviewerSearch(e.target.value)}
              />

              <select
                className="input"
                value={assign.reviewer_id}
                onChange={(e) => setAssign({ ...assign, reviewer_id: e.target.value })}
              >
                <option value="">
                  {loadingReviewers ? "Loading reviewers..." : "Select reviewer"}
                </option>
                {reviewers.map((u) => (
                  <option key={u.uuid} value={u.uuid}>
                    {u.full_name} — {u.email} (pending: {u.pending_count ?? 0})
                  </option>
                ))}
              </select>
            </div>

            {selectedReviewer && (
              <small>
                Selected: <strong>{selectedReviewer.full_name}</strong> ({selectedReviewer.email}) — pending:{" "}
                <strong>{selectedReviewer.pending_count ?? 0}</strong>
              </small>
            )}

            <div>
              <button className="btn" type="submit">Assign</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}