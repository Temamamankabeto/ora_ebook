import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { productionQueue, startProduction, publish } from "../api/production.js";

export default function ProductionQueuePage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [start, setStart] = useState({ ebook_id:"" });
  const [pub, setPub] = useState({ ebook_id:"", access:"OPEN", embargo_until:"", isbn:"", doi:"" });

  const load = async () => {
    setErr("");
    try {
      const r = await productionQueue();
      setRows(r.data);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, []);

  const doStart = async (e) => {
    e.preventDefault();
    try { await startProduction(start); setStart({ebook_id:""}); await load(); } catch (e) { setErr(e.message); }
  };

  const doPublish = async (e) => {
    e.preventDefault();
    try { await publish(pub); setPub({ ebook_id:"", access:"OPEN", embargo_until:"", isbn:"", doi:"" }); await load(); } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h2>Production Queue</h2>
        {err && <div className="card" style={{background:"#fff5f5"}}>{err}</div>}
        <div className="card">
          <table>
            <thead><tr><th>Title</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.ebook_id}>
                  <td>{r.title}</td>
                  <td><span className="badge">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-2" style={{marginTop:12}}>
          <div className="card">
            <h3 style={{marginTop:0}}>Start Production</h3>
            <form className="grid" onSubmit={doStart}>
              <input className="input" placeholder="ebook_id" value={start.ebook_id} onChange={e=>setStart({ebook_id:e.target.value})} />
              <button className="btn" type="submit">Start</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Publish</h3>
            <form className="grid" onSubmit={doPublish}>
              <input className="input" placeholder="ebook_id" value={pub.ebook_id} onChange={e=>setPub({...pub, ebook_id:e.target.value})} />
              <select className="input" value={pub.access} onChange={e=>setPub({...pub, access:e.target.value})}>
                <option value="OPEN">OPEN</option>
                <option value="RESTRICTED">RESTRICTED</option>
                <option value="EMBARGOED">EMBARGOED</option>
              </select>
              <input className="input" placeholder="embargo_until (YYYY-MM-DD, optional)" value={pub.embargo_until} onChange={e=>setPub({...pub, embargo_until:e.target.value})} />
              <input className="input" placeholder="ISBN (optional)" value={pub.isbn} onChange={e=>setPub({...pub, isbn:e.target.value})} />
              <input className="input" placeholder="DOI (optional)" value={pub.doi} onChange={e=>setPub({...pub, doi:e.target.value})} />
              <button className="btn" type="submit">Publish</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
