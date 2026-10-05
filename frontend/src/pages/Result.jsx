import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { ACTIVE, Chip, Icon, fmtTime, go, metaOf } from "../util.jsx";

function useRun(id) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const timer = useRef(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get(id);
      if (!alive.current) return;
      setRun(r); setError(null);
      if (ACTIVE.has(r.status)) timer.current = setTimeout(load, 2000);
    } catch (e) { if (alive.current) setError(e); }
  }, [id]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, [load, tick]);

  return { run, error, refresh: () => { clearTimeout(timer.current); setTick((t) => t + 1); } };
}

function Sign({ r }) {
  return (
    <li className="need">
      <div className="need-head">
        <h3>{r.sign}</h3>
        {r.concern
          ? <span className="mark bad"><Icon name="alert" />Concern</span>
          : <span className="mark ok"><Icon name="check" />No concern</span>}
      </div>
      <p className="finding">{r.finding}</p>
    </li>
  );
}

function CopyMessage({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2500); } catch { /* clipboard blocked */ }
  };
  return (
    <button type="button" className="btn secondary" onClick={copy}>
      <Icon name={done ? "check" : "copy"} />{done ? "Copied" : "Copy message"}
    </button>
  );
}

function Audit({ run }) {
  const working = ACTIVE.has(run.status);
  const ev = run.events || [];
  const ref = useRef(null);
  const touched = useRef(false);
  useEffect(() => { const el = ref.current; if (el && !touched.current) el.open = working; }, [working]);
  return (
    <details className="audit" ref={ref} open={working} onToggle={() => { touched.current = true; }}>
      <summary>What Day 14 did ({ev.length} step{ev.length === 1 ? "" : "s"})</summary>
      <ol>
        {ev.map((e, i) => <li key={i}><time dateTime={e.t}>{fmtTime(e.t)}</time><span>{e.text}</span></li>)}
        {run.second_check && <li><time /><span>{run.second_check.model}: {run.second_check.agrees ? "agrees." : "disagrees."} {run.second_check.note}</span></li>}
      </ol>
      {run.photo_words && (
        <p className="small muted photo-words"><b>Photo as described by the vision model: </b>{run.photo_words}</p>
      )}
    </details>
  );
}

export default function Result({ id }) {
  const { run, error, refresh } = useRun(id);
  const [busy, setBusy] = useState(false);
  const [liveErr, setLiveErr] = useState(null);

  if (!run && !error) return <p role="status" className="muted">Loading the check-in.</p>;
  if (!run && error) {
    const nf = error.status === 404;
    return (
      <div>
        <h1>{nf ? "Check-in not found" : "The check-in could not be loaded"}</h1>
        <div className="notice bad" role="alert" style={{ marginTop: "1rem", maxWidth: "40rem" }}>
          <Icon name="alert" />
          <div className="retry"><span>{nf ? "There is no check-in with this address. It may have been made before the server restarted." : error.message}</span>
            {!nf && <button type="button" className="btn secondary" onClick={refresh}>Try again</button>}
            {nf && <button type="button" className="btn secondary" onClick={() => go("/checkins")}>See all check-ins</button>}
          </div>
        </div>
      </div>
    );
  }

  const m = metaOf(run);
  const done = run.status === "DONE";
  const bad = done && (run.decision === "call_today" || run.decision === "emergency");
  const a = run.answers;

  const runLive = async () => {
    setBusy(true); setLiveErr(null);
    try { const r = await api.create({ ...a, live: true }); go("/checkins/" + r.id); } catch (e) { setLiveErr(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="run-head">
        <span className="ref">Day {a.day} after surgery</span>
        <h1>{a.operation}</h1>
        <div className="row">
          <Chip run={run} />
          <p className="sentence" role="status">{done ? run.headline : run.status === "FAILED" ? run.failure : m.line}</p>
        </div>
      </div>

      {error && (
        <div className="notice bad" role="alert">
          <Icon name="alert" />
          <div className="retry"><span>The server could not be reached. This page shows the last update.</span><button type="button" className="btn secondary" onClick={refresh}>Try again</button></div>
        </div>
      )}

      <div className="run-grid">
        <div className="side">
          {done && run.steps.length > 0 && (
            <section className={"panel actions first-o verdict " + (bad ? "bad" : run.decision === "no_change" ? "ok" : "")} aria-labelledby="do-h">
              <h2 id="do-h">What to do</h2>
              <ol className="steps-do">{run.steps.map((s, i) => <li key={i}><span>{s}</span></li>)}</ol>
              {run.message_to_team && <div className="btns"><CopyMessage text={run.message_to_team} /></div>}
            </section>
          )}
          {run.photo && (
            <figure className="shot second-o">
              <img src={run.photo.url} alt={run.photo.label} />
              <figcaption>{run.photo.credit}</figcaption>
            </figure>
          )}
        </div>

        <div className="main-col">
          {done && run.photo_disagrees && (
            <div className="notice bad" role="status" style={{ marginTop: 0 }}>
              <Icon name="alert" />
              <div><b>The photo looks calmer than you feel.</b>Your symptoms count for more than the photo.</div>
            </div>
          )}

          <h2 style={{ fontSize: "1.45rem", marginBottom: "0.6rem" }}>{done ? `Signs checked (${run.reasons.length})` : "Signs checked"}</h2>
          {run.status === "WORKING" && (
            <div className="looking" style={{ padding: "1rem 0", borderTop: "2px solid var(--ink)" }}><span className="dot pulse" aria-hidden="true" /> Reading your answers and the photo.</div>
          )}
          {run.status === "FAILED" && <div className="notice bad" role="alert"><Icon name="alert" /><div><b>Nothing was decided.</b>{run.failure} If you feel unwell, call your surgical team.</div></div>}
          {done && <ul className="needs">{run.reasons.map((r, i) => <Sign key={i} r={r} />)}</ul>}

          {done && run.message_to_team && (
            <section className="summary" aria-labelledby="msg-h">
              <h2 id="msg-h">Message for your surgical team</h2>
              <p className="msg">{run.message_to_team}</p>
            </section>
          )}

          <Audit run={run} />

          {done && (
            <div className="live-row">
              <button type="button" className="btn secondary" onClick={runLive} disabled={busy}>{busy ? "Starting" : "Run it live"}</button>
              {liveErr && <div className="err" role="alert"><Icon name="alert" /><span>{liveErr}</span></div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
