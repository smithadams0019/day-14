import { useEffect, useRef } from "react";
import { useRoute } from "./util.jsx";
import Checkin from "./pages/Checkin.jsx";
import Result from "./pages/Result.jsx";
import History from "./pages/History.jsx";
import How from "./pages/How.jsx";

const TITLES = { checkin: "New check-in", list: "Check-ins", result: "Check-in", how: "How it works" };

export default function App() {
  const route = useRoute();
  const mainRef = useRef(null);
  const first = useRef(true);
  const parts = route.split("/").filter(Boolean);
  let view = "checkin", id = null;
  if (parts[0] === "checkins" && parts[1]) { view = "result"; id = decodeURIComponent(parts[1]); }
  else if (parts[0] === "checkins") view = "list";
  else if (parts[0] === "how") view = "how";

  useEffect(() => {
    document.title = `${TITLES[view]} | Day 14`;
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    const h = mainRef.current && mainRef.current.querySelector("h1");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = (v) => (view === v || (v === "list" && view === "result") ? "page" : undefined);

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); const m = document.getElementById("main"); m.setAttribute("tabindex", "-1"); m.focus(); }}>Skip to main content</a>
      <header className="masthead">
        <div className="wrap">
          <a className="wordmark" href="#/">Day 14</a>
          <nav className="nav" aria-label="Main">
            <a href="#/" aria-current={cur("checkin")}>New check-in</a>
            <a href="#/checkins" aria-current={cur("list")}>Check-ins</a>
            <a href="#/how" aria-current={cur("how")}>How it works</a>
          </nav>
        </div>
      </header>
      <main id="main" ref={mainRef}>
        <div className="wrap">
          {view === "checkin" && <Checkin />}
          {view === "list" && <History />}
          {view === "result" && <Result key={id} id={id} />}
          {view === "how" && <How />}
        </div>
      </main>
      <footer className="foot">
        <div className="wrap">Day 14 informs; it does not diagnose. Apache-2.0 licence.</div>
      </footer>
    </>
  );
}
