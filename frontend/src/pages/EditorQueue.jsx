import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { editorQueue, editorSetStatus } from "../api/ebooks.js";
import { assignReviewer, cancelReviewerAssignment } from "../api/reviews.js";
import { listReviewers } from "../api/users.js";
import { Link } from "react-router-dom";

export default function EditorQueuePage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const [assign, setAssign] = useState({ ebook_id: "", reviewer_id: "", due_at: "" });

  const [reviewerSearch, setReviewerSearch] = useState("");
  const [reviewers, setReviewers] = useState([]);
  const [loadingReviewers, setLoadingReviewers] = useState(false);

  const [rowReviewer, setRowReviewer] = useState({});
  const [rowDueAt, setRowDueAt] = useState({});

  const load = async () => {
    setErr("");
    try {
      const r = await editorQueue();
      setRows(r.data || []);
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

  useEffect(() => {
    const t = setTimeout(() => fetchReviewers(reviewerSearch), 250);
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
        due_at: assign.due_at || "",
      });
      setAssign({ ebook_id: "", reviewer_id: "", due_at: "" });
      await load();
      alert("Assigned successfully");
    } catch (e) {
      setErr(e.message);
    }
  };

  const doAssignRow = async (ebook_id) => {
    setErr("");
    const reviewer_id = rowReviewer[ebook_id];
    const due_at = rowDueAt[ebook_id] || "";
    if (!reviewer_id) return setErr("Select a reviewer in the row dropdown first.");

    try {
      await assignReviewer({ ebook_id, reviewer_id, due_at });
      setRowReviewer((m) => ({ ...m, [ebook_id]: "" }));
      setRowDueAt((m) => ({ ...m, [ebook_id]: "" }));
      await load();
      alert("Assigned successfully");
    } catch (e) {
      setErr(e.message);
    }
  };

  const doCancel = async (assignment_id) => {
    const reason = window.prompt("Reason for cancel (optional):") || "";
    try {
      await cancelReviewerAssignment(assignment_id, reason);
      await load();
      alert("Cancelled");
    } catch (e) {
      setErr(e.message);
    }
  };

  const selectedReviewer = useMemo(
    () => reviewers.find((r) => r.uuid === assign.reviewer_id),
    [reviewers, assign.reviewer_id]
  );

  const formatDate = (d) => {
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
        <h2>Editor Queue</h2>
        {err && <div className="card" style={{ background: "#fff5f5" }}>{err}</div>}

        <div className="card">
          <p>
            <small>
              Step 1.6: Review summary shows assignment counts + recommendations + last review time.
            </small>
          </p>

          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th style={{ minWidth: 240 }}>Review Summary</th>
                <th style={{ minWidth: 380 }}>Row Assign Reviewer</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const assigned = Array.isArray(r.reviewer_assignments) ? r.reviewer_assignments : [];

                // active vs cancelled logic
                const activeAssignedIds = new Set(
                  assigned
                    .filter((a) => ["INVITED", "ACCEPTED", "SUBMITTED"].includes(a.status))
                    .map((a) => a.reviewer_id)
                );
                const cancelledIds = new Set(
                  assigned.filter((a) => a.status === "CANCELLED").map((a) => a.reviewer_id)
                );

                return (
                  <tr key={r.ebook_id}>
                    <td>
                      <Link to={`/ebooks/${r.ebook_id}`}>{r.title}</Link>
                      <div>
                        <small>ebook_id: <code>{r.ebook_id}</code></small>
                      </div>
                    </td>

                    <td><small>{r.author_name}</small></td>
                    <td><span className="badge">{r.status}</span></td>

                    {/* Review summary */}
                    <td>
                      <div className="card" style={{ padding: 10, boxShadow: "none" }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span className="badge">Invited: {r.invited_count ?? 0}</span>
                          <span className="badge">Accepted: {r.accepted_count ?? 0}</span>
                          <span className="badge">Submitted: {r.submitted_count ?? 0}</span>
                          <span className="badge">Cancelled: {r.cancelled_count ?? 0}</span>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <small>
                            Recs — Accept: <strong>{r.rec_accept ?? 0}</strong>, Minor:{" "}
                            <strong>{r.rec_minor ?? 0}</strong>, Major:{" "}
                            <strong>{r.rec_major ?? 0}</strong>, Reject:{" "}
                            <strong>{r.rec_reject ?? 0}</strong>
                          </small>
                        </div>

                        <div style={{ marginTop: 6 }}>
                          <small>Last review: {formatDate(r.last_review_submitted_at)}</small>
                        </div>
                      </div>
                    </td>

                    {/* Row Assign */}
                    <td>
                      <div style={{ display: "grid", gap: 6 }}>
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

                          {reviewers.map((u) => {
                            const isActiveAssigned = activeAssignedIds.has(u.uuid);
                            const wasCancelled = cancelledIds.has(u.uuid);

                            return (
                              <option key={u.uuid} value={u.uuid} disabled={isActiveAssigned}>
                                {u.full_name} — {u.email} (pending: {u.pending_count ?? 0})
                                {isActiveAssigned ? " — ACTIVE ASSIGNMENT" : ""}
                                {!isActiveAssigned && wasCancelled ? " — REASSIGN OK" : ""}
                              </option>
                            );
                          })}
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
                            Assign / Reassign
                          </button>
                        </div>

                        {/* Assigned list */}
                        <div style={{ marginTop: 6 }}>
                          {assigned.length === 0 ? (
                            <small>No reviewers assigned yet.</small>
                          ) : (
                            <div className="grid" style={{ gap: 6 }}>
                              {assigned.map((a) => (
                                <div
                                  key={a.assignment_id}
                                  className="card"
                                  style={{ padding: 10, borderRadius: 10, boxShadow: "none" }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                    <div>
                                      <strong>{a.reviewer_name}</strong> <small>({a.reviewer_email})</small>
                                    </div>
                                    <span className="badge">{a.status}</span>
                                  </div>

                                  <small>
                                    Assigned: {formatDate(a.assigned_at)}
                                    {a.due_at ? ` • Due: ${formatDate(a.due_at)}` : ""}
                                  </small>

                                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    {a.status !== "CANCELLED" && (
                                      <button
                                        className="btn secondary small"
                                        type="button"
                                        onClick={() => doCancel(a.assignment_id)}
                                      >
                                        Cancel assignment
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn small" onClick={() => setStatus(r.ebook_id, "SCREENING", "SCREENING")}>
                        Screen
                      </button>
                      <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "UNDER_REVIEW", "SEND_TO_REVIEW")}>
                        Send to Review
                      </button>
                      <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "REVISION_REQUIRED", "MAJOR_REVISION")}>
                        Major Rev
                      </button>
                      <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "REVISION_REQUIRED", "MINOR_REVISION")}>
                        Minor Rev
                      </button>
                      <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "ACCEPTED", "ACCEPT")}>
                        Accept
                      </button>
                      <button className="btn secondary small" onClick={() => setStatus(r.ebook_id, "REJECTED", "REJECT")}>
                        Reject
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Global Assign */}
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
              <button className="btn" type="submit">Assign / Reassign</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}