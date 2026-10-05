import { useEffect, useState } from "react";

const dt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const tm = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", second: "2-digit" });
export const fmtDate = (iso) => { try { return iso ? dt.format(new Date(iso)) : ""; } catch { return ""; } };
export const fmtTime = (iso) => { try { return iso ? tm.format(new Date(iso)) : ""; } catch { return ""; } };

export const ACTIVE = new Set(["WORKING"]);

const P = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  clock: "M12 7v5l3 2",
  eye: "M9.5 12h5M12 9.5v5",
  phone: "M8 8l8 8M16 8l-8 8",
  alert: "M12 8v5M12 16.5v.5",
  info: "M12 11v5M12 7.5v.5",
  slash: "M7 17L17 7",
};
const CIRCLE = new Set(["check", "clock", "eye", "info", "slash"]);

export function Icon({ name, spin }) {
  const tri = name === "alert";
  return (
    <svg className={"ico" + (spin ? " spin" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {CIRCLE.has(name) && <circle cx="12" cy="12" r="9.5" />}
      {tri && <path d="M12 3.5l9.5 16.5h-19z" />}
      {name === "copy" ? <path d="M9 9h10v11H9zM5 15V4h10" /> : <path d={P[name]} />}
    </svg>
  );
}

export const DECISION = {
  WORKING: { label: "Checking", icon: "clock", kind: "", spin: true, line: "Reading your answers and the photo." },
  no_change: { label: "No change from your baseline", icon: "check", kind: "ok" },
  watch: { label: "Watch closely", icon: "eye", kind: "" },
  call_today: { label: "Call your surgical team today", icon: "alert", kind: "bad" },
  emergency: { label: "Go to A&E now", icon: "alert", kind: "bad" },
  FAILED: { label: "Not completed", icon: "slash", kind: "bad" },
};
export const metaOf = (run) => DECISION[run.status === "DONE" ? run.decision : run.status] || DECISION.FAILED;

export function Chip({ run }) {
  const m = metaOf(run);
  return <span className={"chip " + m.kind}><Icon name={m.icon} spin={m.spin} />{m.label}</span>;
}

export function useRoute() {
  const read = () => (window.location.hash.replace(/^#/, "") || "/");
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (path) => { window.location.hash = "#" + path; };
