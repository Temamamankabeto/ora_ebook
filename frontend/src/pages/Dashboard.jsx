import React from "react";
import Navbar from "../components/Navbar.jsx";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const roles = (() => { try { return JSON.parse(localStorage.getItem("roles")||"[]"); } catch { return []; } })();

  const can = (r) => roles.includes(r) || roles.includes("ADMIN");

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Dashboard</h2>
        <div className="grid grid-2">
          {can("AUTHOR") && (
            <div className="card">
              <h3>Author</h3>
              <p>Submit manuscripts, upload revisions, track status.</p>
              <Link className="btn secondary" to="/author/submit" style={{textDecoration:"none"}}>Submit Manuscript</Link>{" "}
              <Link className="btn secondary" to="/author/mine" style={{textDecoration:"none"}}>My Manuscripts</Link>
            </div>
          )}
          {can("EDITOR") && (
            <div className="card">
              <h3>Book Editor</h3>
              <p>Screen manuscripts, assign reviewers, decide accept/revise/reject.</p>
              <Link className="btn secondary" to="/editor/queue" style={{textDecoration:"none"}}>Editor Queue</Link>
            </div>
          )}
          {can("REVIEWER") && (
            <div className="card">
              <h3>Peer Reviewer</h3>
              <p>Accept invitations, submit reviews and recommendations.</p>
              <Link className="btn secondary" to="/reviewer/queue" style={{textDecoration:"none"}}>My Review Queue</Link>
            </div>
          )}
          {can("FINANCE") && (
            <div className="card">
              <h3>Finance Officer</h3>
              <p>Validate BPC payment or waiver and clear finance.</p>
              <Link className="btn secondary" to="/finance/queue" style={{textDecoration:"none"}}>Finance Queue</Link>
            </div>
          )}
          {can("CONTENT_MANAGER") && (
            <div className="card">
              <h3>Digital Content Manager</h3>
              <p>Start production and publish to the library.</p>
              <Link className="btn secondary" to="/production/queue" style={{textDecoration:"none"}}>Production Queue</Link>
            </div>
          )}
          <div className="card">
            <h3>Reader / Public</h3>
            <p>Browse published eBooks.</p>
            <Link className="btn secondary" to="/library" style={{textDecoration:"none"}}>Public Library</Link>
          </div>
        </div>
      </div>
    </>
  );
}
