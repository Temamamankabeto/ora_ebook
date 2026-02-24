import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")||"null"); } catch { return null; } })();
  const roles = (() => { try { return JSON.parse(localStorage.getItem("roles")||"[]"); } catch { return []; } })();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("roles");
    nav("/login");
  };

  return (
    <div className="nav">
      <div className="nav-inner">
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <Link to="/" style={{textDecoration:"none", fontWeight:800}}>ORA eBook</Link>
          <span className="badge">Publishing</span>
          <Link to="/library" style={{textDecoration:"none"}}>Public Library</Link>
          {token && <Link to="/dashboard" style={{textDecoration:"none"}}>Dashboard</Link>}
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          {token ? (
            <>
              <small>{user?.full_name}</small>
              <small className="badge">{roles.join(", ") || "USER"}</small>
              <button className="btn secondary small" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link className="btn secondary small" to="/login" style={{textDecoration:"none"}}>Login</Link>
          )}
        </div>
      </div>
    </div>
  );
}
