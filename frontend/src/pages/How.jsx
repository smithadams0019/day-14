import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function How() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api.config().then(setCfg).catch(() => {}); }, []);
  return (
    <div className="how">
      <div className="page-head" style={{ marginBottom: 0 }}><h1>How it works</h1></div>

      <section aria-labelledby="h-steps">
        <h2 id="h-steps">What happens in a check-in</h2>
        <ol className="steps">
          <li><span>You answer a few questions and pick a photo of the wound.</span></li>
          <li><span>A vision model, Qwen, describes the photo in words. It describes only; it never decides.</span></li>
          <li><span>Written warning signs set a floor the answer cannot go below.</span></li>
          <li><span>Nemotron compares today with your own baseline and decides: no change, watch, call your surgical team today, or go to A&amp;E now.</span></li>
          <li><span>Any call or emergency result is checked a second time by a larger Nemotron before you see it.</span></li>
        </ol>
      </section>

      <section aria-labelledby="h-not">
        <h2 id="h-not">What it will not do</h2>
        <ul className="facts">
          <li>Say that you have no infection. The best result is no change from your baseline.</li>
          <li>Recommend or change medication.</li>
          <li>Read colour reliably on darker skin. Every photo in this demo shows light skin, and redness is harder to judge on darker skin, so lean on the symptoms.</li>
          <li>Take your own photo. The photos are a fixed demo set; uploads are off.</li>
          <li>Contact anyone for you. You send the drafted message yourself.</li>
        </ul>
      </section>

      <section aria-labelledby="h-credit">
        <h2 id="h-credit">Photo credits</h2>
        <ul className="facts">
          {cfg ? cfg.photos.map((p) => <li key={p.id}><b>{p.label}.</b> {p.credit}</li>) : <li>Loading.</li>}
        </ul>
      </section>
    </div>
  );
}
