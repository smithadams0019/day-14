import { useEffect, useState } from "react";
import { api } from "../api.js";
import { Icon, go } from "../util.jsx";

const EMPTY = {
  operation: "", day: "", baseline: "", pain: "", temp: "", discharge: "none",
  smell: false, spreading: false, edges: false, unwell: false, note: "", photo: null,
};
let draft = null; // survives moving between pages, lost on reload

function validate(f) {
  const e = {};
  if (f.operation.trim().length < 2) e.operation = "Enter the operation you had.";
  const d = Number(f.day);
  if (!/^\d+$/.test(String(f.day).trim()) || d < 1 || d > 120) e.day = "Enter the number of days since surgery, from 1 to 120.";
  if (f.pain === "" || f.pain === null) e.pain = "Choose a pain score from 0 to 10.";
  const t = f.temp.trim();
  if (t && !(/^\d{2,3}([.,]\d)?$/.test(t))) e.temp = "Enter a number such as 37.2.";
  return e;
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <span className="hint" id={id + "-hint"}>{hint}</span>}
      {children}
      {error && <div className="err" id={id + "-err"}><Icon name="alert" /><span>{error}</span></div>}
    </div>
  );
}

export default function Checkin() {
  const [cfg, setCfg] = useState(null);
  const [cfgErr, setCfgErr] = useState(null);
  const [f, setF] = useState(() => draft || EMPTY);
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCfg = () => { setCfgErr(null); api.config().then(setCfg).catch((e) => setCfgErr(e.message)); };
  useEffect(loadCfg, []);
  useEffect(() => { draft = f; }, [f]);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  const fill = (ex) => {
    const a = ex.answers;
    setF({ ...a, day: String(a.day), pain: String(a.pain), temp: a.temp || "" });
    setErrors({}); setServerErr(null);
    window.scrollTo({ top: document.getElementById("form-top").offsetTop - 16, behavior: "smooth" });
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerErr(null);
    const v = validate(f);
    setErrors(v);
    const first = ["operation", "day", "pain", "temp"].find((k) => v[k]);
    if (first) { setTimeout(() => { const el = document.getElementById(first === "pain" ? "pain-0" : first); if (el) el.focus(); }, 0); return; }
    setBusy(true);
    try {
      const r = await api.create({
        operation: f.operation.trim(), day: Number(f.day), baseline: f.baseline.trim(), pain: Number(f.pain),
        temp: f.temp.trim(), discharge: f.discharge, smell: f.smell, spreading: f.spreading, edges: f.edges,
        unwell: f.unwell, note: f.note.trim(), photo: f.photo,
      });
      draft = null;
      go("/checkins/" + r.id);
    } catch (e) { setServerErr(e.message); } finally { setBusy(false); }
  };

  const nErr = Object.keys(errors).length;
  const ids = (id, hint) => ({ id, "aria-describedby": [hint ? id + "-hint" : null, errors[id] ? id + "-err" : null].filter(Boolean).join(" ") || undefined, "aria-invalid": errors[id] ? "true" : undefined });

  return (
    <>
      <div className="page-head"><h1>How is your recovery today?</h1></div>

      {cfgErr && (
        <div className="notice bad" role="alert">
          <Icon name="alert" />
          <div className="retry"><span>The server could not be reached. What you type here is kept.</span><button type="button" className="btn secondary" onClick={loadCfg}>Try again</button></div>
        </div>
      )}

      <div className="request-col">
        {cfg && (
          <section aria-labelledby="ex-h" style={{ marginBottom: "2rem" }}>
            <h2 id="ex-h" style={{ fontSize: "1.25rem", marginBottom: "0.6rem" }}>See it decide</h2>
            <div className="examples" style={{ marginBottom: 0 }}>
              {cfg.examples.map((ex) => (
                <button type="button" key={ex.id} className="example" onClick={() => fill(ex)}>
                  <img src={ex.photoUrl} alt="" width="64" height="64" />
                  <span><span className="t">{ex.title}</span><span className="d">{ex.blurb}</span></span>
                </button>
              ))}
            </div>
          </section>
        )}

        <form id="form-top" onSubmit={submit} noValidate aria-label="New check-in">
          <fieldset className="grp"><legend className="grp-h">1. Your operation</legend>
            <div className="pair">
              <Field id="operation" label="Operation" hint="What was done, in your own words." error={errors.operation}>
                <input type="text" value={f.operation} onChange={set("operation")} maxLength={120} autoComplete="off" {...ids("operation", true)} />
              </Field>
              <Field id="day" label="Days since surgery" error={errors.day}>
                <input type="text" inputMode="numeric" value={f.day} onChange={set("day")} maxLength={3} autoComplete="off" style={{ maxWidth: "8rem" }} {...ids("day")} />
              </Field>
            </div>
            <Field id="baseline" label="How the wound looked when you left hospital" hint="Optional. Today is compared with this, not with an ideal wound.">
              <textarea value={f.baseline} onChange={set("baseline")} maxLength={400} {...ids("baseline", true)} />
            </Field>
          </fieldset>

          <fieldset className="grp"><legend className="grp-h">2. How you feel</legend>
            <fieldset aria-describedby={errors.pain ? "pain-err" : undefined}>
              <legend className="legend">Pain today</legend>
              <div className="pain">
                {Array.from({ length: 11 }, (_, i) => (
                  <label key={i}><input type="radio" id={"pain-" + i} name="pain" value={i} checked={String(f.pain) === String(i)} onChange={set("pain")} />{i}</label>
                ))}
              </div>
              <div className="pain-ends"><span>0 none</span><span>10 worst</span></div>
              {errors.pain && <div className="err" id="pain-err"><Icon name="alert" /><span>{errors.pain}</span></div>}
            </fieldset>

            <div className="pair">
              <Field id="temp" label="Temperature (°C)" hint="Optional." error={errors.temp}>
                <input type="text" inputMode="decimal" value={f.temp} onChange={set("temp")} maxLength={5} autoComplete="off" style={{ maxWidth: "8rem" }} {...ids("temp", true)} />
              </Field>
              <fieldset>
                <legend className="legend">Discharge from the wound</legend>
                {[["none", "None"], ["clear", "Clear or pink"], ["cloudy", "Cloudy, yellow or green"]].map(([v, t]) => (
                  <label className="choice" key={v}>
                    <input type="radio" name="discharge" value={v} checked={f.discharge === v} onChange={set("discharge")} />
                    <span><span className="t">{t}</span></span>
                  </label>
                ))}
              </fieldset>
            </div>

            <fieldset>
              <legend className="legend">Tick any that apply</legend>
              <div className="checks">
                {[["smell", "Bad smell from the wound"], ["spreading", "Redness is spreading"], ["edges", "Wound edges have come apart"], ["unwell", "I feel very unwell"]].map(([k, t]) => (
                  <label className="choice" key={k}>
                    <input type="checkbox" checked={f[k]} onChange={set(k)} />
                    <span><span className="t">{t}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div style={{ height: "1rem" }} />
            <Field id="note" label="Anything else" hint="Optional.">
              <textarea value={f.note} onChange={set("note")} maxLength={500} style={{ minHeight: "4.5rem" }} {...ids("note", true)} />
            </Field>
          </fieldset>

          <fieldset className="grp"><legend className="grp-h">3. Photo of the wound</legend>
            <div className="photos" role="radiogroup" aria-label="Photo of the wound">
              <label className="photo-opt none">
                <input type="radio" name="photo" checked={f.photo === null} onChange={() => setF((p) => ({ ...p, photo: null }))} />
                <span className="t">No photo</span>
                <span className="tick"><Icon name="check" /></span>
              </label>
              {cfg && cfg.photos.map((p) => (
                <label className="photo-opt" key={p.id}>
                  <input type="radio" name="photo" checked={f.photo === p.id} onChange={() => setF((q) => ({ ...q, photo: p.id }))} />
                  <img src={p.url} alt="" />
                  <span className="t">{p.label}</span>
                  <span className="tick"><Icon name="check" /></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="submit-area">
            {nErr > 0 && <div className="notice bad" role="alert" style={{ marginTop: 0 }}><Icon name="alert" /><div><b>{nErr === 1 ? "One field needs attention." : `${nErr} fields need attention.`}</b>The messages are next to each field.</div></div>}
            {serverErr && <div className="notice bad" role="alert"><Icon name="alert" /><div><b>The check-in was not sent.</b>{serverErr}</div></div>}
            <button type="submit" className="btn" disabled={busy}>{busy ? "Sending" : "Check my recovery"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
