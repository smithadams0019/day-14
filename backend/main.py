"""Day 14 API + static frontend on one port."""
from __future__ import annotations

import json
import os
import threading
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import agent
import cases

HERE = Path(__file__).resolve().parent
DIST = Path(os.environ.get("DIST_DIR", HERE.parent / "frontend" / "dist"))

app = FastAPI(title="Day 14")
RUNS: dict[str, dict] = {}
LOCK = threading.Lock()


class Answers(BaseModel):
    operation: str = Field(min_length=2, max_length=120)
    day: int = Field(ge=1, le=120)
    baseline: str = Field("", max_length=400)
    pain: int = Field(ge=0, le=10)
    temp: str = Field("", max_length=8)
    discharge: str = Field("none", pattern="^(none|clear|cloudy)$")
    smell: bool = False
    spreading: bool = False
    edges: bool = False
    unwell: bool = False
    note: str = Field("", max_length=500)
    photo: str | None = None
    live: bool = False


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S")


def _public(run: dict) -> dict:
    return run


def _finish(run: dict, answers: dict) -> None:
    def log(text: str) -> None:
        run["events"].append({"t": _now(), "text": text})
    try:
        res = agent.assess(answers, log)
        run.update(res, status="DONE")
    except SystemExit as e:
        run.update(status="FAILED", failure=str(e))
    except Exception as e:  # surfaced to the patient as a plain message
        run.update(status="FAILED", failure=f"The check-in could not be completed: {type(e).__name__}.")


@app.get("/api/config")
def config():
    return {
        "photos": [{"id": k, "url": f"/media/{k}.jpg", **v} for k, v in cases.PHOTOS.items()],
        "examples": [{"id": c["id"], "title": c["title"], "blurb": c["blurb"], "answers": c["answers"],
                      "photoUrl": f"/media/{c['answers']['photo']}.jpg"} for c in cases.CASES],
    }


@app.post("/api/checkins")
def create(a: Answers):
    answers = a.model_dump()
    live = answers.pop("live")
    if answers["photo"] and answers["photo"] not in cases.PHOTOS:
        raise HTTPException(400, "Unknown photo.")
    rid = uuid.uuid4().hex[:10]
    run = {"id": rid, "createdAt": _now(), "answers": answers, "events": [], "cached": False,
           "status": "WORKING", "photo": None}
    if answers["photo"]:
        run["photo"] = {"id": answers["photo"], "url": f"/media/{answers['photo']}.jpg", **cases.PHOTOS[answers["photo"]]}
    hit = cases.BY_KEY.get(cases.key(answers))
    cache = agent.CACHE / "cases" / f"{hit['id']}.json" if hit else None
    with LOCK:
        RUNS[rid] = run
    if hit and not live and cache.exists():
        res = json.loads(cache.read_text())
        run.update(res, status="DONE", cached=True, events=[{"t": run["createdAt"], "text": e["text"]} for e in res["events"]])
        run["events"].insert(0, {"t": run["createdAt"], "text": "Saved result for this check-in opened. Run it live to call the models again."})
    else:
        threading.Thread(target=_finish, args=(run, answers), daemon=True).start()
    return {"id": rid}


@app.get("/api/checkins")
def listing():
    with LOCK:
        rows = sorted(RUNS.values(), key=lambda r: r["createdAt"], reverse=True)
    return {"runs": [{"id": r["id"], "createdAt": r["createdAt"], "status": r["status"],
                      "operation": r["answers"]["operation"], "day": r["answers"]["day"],
                      "decision": r.get("decision")} for r in rows]}


@app.get("/api/checkins/{rid}")
def get(rid: str):
    run = RUNS.get(rid)
    if not run:
        raise HTTPException(404, "Not found")
    return run


app.mount("/media", StaticFiles(directory=HERE / "media"), name="media")

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = DIST / path
        return FileResponse(f if path and f.is_file() else DIST / "index.html")
