import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { ACTIVE, Chip, Icon, fmtDate, go } from "../util.jsx";

export default function History() {
  const [runs, setRuns] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    clearTimeout(timer.current);
    try {
      const r = await api.list();
      if (!alive.current) return;
      setRuns(r.runs); setError(null);
      if (r.runs.some((x) => ACTIVE.has(x.status))) timer.current = setTimeout(load, 3000);
    } catch (e) { if (alive.current) setError(e.message); }
  }, []);
  useEffect(() => { alive.current = true; load(); return () => { alive.current = false; clearTimeout(timer.current); }; }, [load]);

  return (
    <>
      <div className="page-head"><h1>Check-ins</h1></div>
      {error && (
        <div className="notice bad" role="alert">
          <Icon name="alert" />
          <div className="retry"><span>{error}</span><button type="button" className="btn secondary" onClick={load}>Try again</button></div>
        </div>
      )}
      {!runs && !error && <p role="status" className="muted">Loading check-ins.</p>}
      {runs && runs.length === 0 && (
        <div className="empty">
          <h2>No check-ins yet</h2>
          <button type="button" className="btn" onClick={() => go("/")}>Start a check-in</button>
        </div>
      )}
      {runs && runs.length > 0 && (
        <table className="tbl">
          <caption className="sr-only">Check-ins, newest first</caption>
          <thead><tr><th scope="col">Operation</th><th scope="col">Day</th><th scope="col">Result</th><th scope="col">Date</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="first"><a className="ref" href={"#/checkins/" + r.id}>{r.operation}</a></td>
                <td data-label="Day" className="num">{r.day}</td>
                <td data-label="Result"><Chip run={r} /></td>
                <td data-label="Date" className="num">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
