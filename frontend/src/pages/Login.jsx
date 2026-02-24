import React, { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { login, register } from "../api/auth.js";
import { http, getToken } from "../api/http.js";
import { useNavigate } from "react-router-dom";

async function fetchRolesForMe() {
  // lightweight: decode roles by hitting protected endpoint? We'll just infer by trying RBAC routes later.
  // For demo: store empty roles; user can set roles from DB manually if needed.
  return [];
}

export default function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ full_name:"", email:"", password:"", role:"AUTHOR" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const data = mode === "login" ? await login({ email: form.email, password: form.password })
                                    : await register(form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      // roles are not returned by API; store selected role for UI nav
      if (mode === "register") localStorage.setItem("roles", JSON.stringify([form.role]));
      nav("/dashboard");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{maxWidth:520, margin:"24px auto"}}>
          <h2 style={{marginTop:0}}>{mode === "login" ? "Login" : "Register"}</h2>
          {err && <div className="card" style={{borderColor:"#ffd1d1", background:"#fff5f5"}}>{err}</div>}
          <form className="grid" onSubmit={submit}>
            {mode === "register" && (
              <>
                <input className="input" placeholder="Full name" value={form.full_name}
                  onChange={e=>setForm({...form, full_name:e.target.value})} />
                <select className="input" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
                  <option value="AUTHOR">AUTHOR</option>
                  <option value="EDITOR">EDITOR</option>
                  <option value="REVIEWER">REVIEWER</option>
                  <option value="FINANCE">FINANCE</option>
                  <option value="CONTENT_MANAGER">CONTENT_MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </>
            )}
            <input className="input" placeholder="Email" value={form.email}
              onChange={e=>setForm({...form, email:e.target.value})} />
            <input className="input" type="password" placeholder="Password" value={form.password}
              onChange={e=>setForm({...form, password:e.target.value})} />
            <button className="btn" type="submit">{mode === "login" ? "Login" : "Create account"}</button>
          </form>

          <div style={{marginTop:12}}>
            {mode === "login" ? (
              <button className="btn secondary" onClick={()=>setMode("register")}>Need an account? Register</button>
            ) : (
              <button className="btn secondary" onClick={()=>setMode("login")}>Have an account? Login</button>
            )}
          </div>
          <p style={{marginBottom:0}}><small>Tip: After registering, your selected role is saved in localStorage for UI. Backend RBAC uses DB roles.</small></p>
        </div>
      </div>
    </>
  );
}
