"""Run each worked check-in once and save the result to cache/cases/. Live model
calls happen here and nowhere else during development; the app serves these files."""
import json, sys, time
import agent, cases

only = set(sys.argv[1:])
for c in cases.CASES:
    if only and c["id"] not in only:
        continue
    out = agent.CACHE / "cases" / f"{c['id']}.json"
    if out.exists() and not only:
        print("have", c["id"]); continue
    t = time.time()
    events = []
    def log(text, _e=events):
        _e.append({"t": time.strftime("%Y-%m-%dT%H:%M:%S"), "text": text}); print("  ", text)
    res = agent.assess(c["answers"], log)
    res["events"] = events
    out.write_text(json.dumps(res, indent=2))
    print(c["id"], res["decision"], f"{time.time()-t:.0f}s", "|", res["headline"])
