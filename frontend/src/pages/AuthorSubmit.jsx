import React, { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { createEbook, uploadFile } from "../api/ebooks.js";
import { useNavigate } from "react-router-dom";

export default function AuthorSubmit() {
  const nav = useNavigate();
  const [form, setForm] = useState({ title:"", abstract:"", keywords:"" });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const created = await createEbook(form);
      if (file) {
        await uploadFile(created.ebook.ebook_id, file, "MANUSCRIPT");
      }
      setMsg("Submitted successfully.");
      nav(`/ebooks/${created.ebook.ebook_id}`);
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Submit Manuscript</h2>
        <div className="card">
          {msg && <div className="card" style={{background:"#f5fff7"}}>{msg}</div>}
          <form className="grid" onSubmit={submit}>
            <input className="input" placeholder="Title" value={form.title}
              onChange={e=>setForm({...form, title:e.target.value})} />
            <textarea className="input" rows={5} placeholder="Abstract" value={form.abstract}
              onChange={e=>setForm({...form, abstract:e.target.value})} />
            <input className="input" placeholder="Keywords (comma separated)" value={form.keywords}
              onChange={e=>setForm({...form, keywords:e.target.value})} />
            <div>
              <label><small>Upload manuscript file (PDF/DOCX):</small></label>
              <input className="input" type="file" onChange={e=>setFile(e.target.files?.[0] || null)} />
            </div>
            <button className="btn" type="submit">Submit</button>
          </form>
        </div>
      </div>
    </>
  );
}
