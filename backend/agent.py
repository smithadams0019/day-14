"""The check-in agent.

  see()   Qwen reads the wound photo into words, once per image, cached on disk.
  rules   Written warning signs, in code, set a floor the model cannot go below.
  think() Nemotron Super weighs symptoms + photo words against the patient's own
          baseline and decides. Nemotron Ultra double-checks any alarm before it
          reaches the patient.

The vision model only describes. Every decision is Nemotron's.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from nemotron import SUPER, ULTRA, see, think

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache"
MEDIA = HERE / "media"
(CACHE / "see").mkdir(parents=True, exist_ok=True)
(CACHE / "cases").mkdir(parents=True, exist_ok=True)

LEVELS = ["no_change", "watch", "call_today", "emergency"]

SEE_PROMPT = (
    "This is a photo of a surgical wound. Describe only what is visible, in at most "
    "five short sentences: how it is closed (stitches, staples, glue, open), whether "
    "there is redness beyond the thin line of the incision itself (say 'none beyond the "
    "incision line' if there is not, and only give a distance if it is clearly visible), "
    "swelling, any discharge or crust and its colour, whether the edges are apart, "
    "bruising. Do not guess; if something is not visible, say so. Do not diagnose or advise."
)

SYSTEM = """You are Day 14, a recovery check-in assistant for people at home after surgery.
You inform. You do not diagnose, and you never say a patient has no infection.

Decide exactly one of:
  no_change   nothing differs from the patient's own baseline
  watch       something is worth rechecking tomorrow; no call needed yet
  call_today  the patient should phone their surgical team today
  emergency   the patient should go to A&E / the emergency department now (999 / 911)

Rules:
- Compare today with the patient's baseline note, not with an ideal wound.
- Warning signs: fever of 38 C or more, redness that is spreading, cloudy yellow or green
  discharge, a bad smell, wound edges coming apart, pain rising rather than easing.
- Spreading redness or open edges WITH fever, or feeling very unwell, is emergency.
- A photo is one input. If the photo words look calm but the patient reports warning
  signs, trust the patient, and say so in the reason.
- photo_disagrees is true ONLY when the photo looks calmer than the reported symptoms (calm photo, worrying symptoms). It is false when the photo is the worrying part, when both agree, or when there is no photo.
- A thin pink line or faint pinkness right along a closed incision is normal healing, not a
  warning sign. Redness counts only when it extends clearly beyond the incision line or has
  grown since the baseline.
- emergency is only for the rule above, severe breathlessness or confusion, or the wound
  opening with fever. Fever with a bad smell and rising pain is call_today.
- Never recommend or change medication.
- Only list signs the patient reported or the photo shows. Never state that the patient said or feels something they did not report.
- Plain words, short sentences, no jargon.

Reply with JSON only:
{"decision": "...",
 "headline": "one sentence the patient reads first",
 "reasons": [{"sign": "Temperature|Pain|Redness|Discharge|Smell|Wound edges|Feeling unwell|Photo|Healing since baseline",
              "finding": "what was reported or seen, with numbers where given",
              "concern": true or false}],
 "steps": ["two to four short actions, most urgent first"],
 "message_to_team": "a first-person message the patient can send to their surgical team, under 80 words; empty string for no_change",
 "photo_disagrees": true or false}
Include one reason per sign that was reported or seen, concern false for normal findings."""


def _rule_floor(a: dict) -> tuple[str, str]:
    """Written warning signs as code. Returns (level, why)."""
    try:
        temp = float(str(a.get("temp") or "").replace(",", "."))
        if temp > 50:
            temp = (temp - 32) * 5 / 9
    except ValueError:
        temp = None
    fever = temp is not None and temp >= 38.0
    if a.get("unwell"):
        return "emergency", "Feeling very unwell"
    if fever and (a.get("spreading") or a.get("edges")):
        return "emergency", "Fever with spreading redness or open wound edges"
    if fever:
        return "call_today", "Temperature of 38 C or more"
    if a.get("edges"):
        return "call_today", "Wound edges have come apart"
    if a.get("smell") or a.get("discharge") == "cloudy":
        return "call_today", "Cloudy discharge or a bad smell"
    if a.get("spreading"):
        return "call_today", "Redness is spreading"
    return "no_change", ""


def describe_photo(photo_id: str, log) -> str:
    path = MEDIA / f"{photo_id}.jpg"
    h = hashlib.sha256(path.read_bytes() + SEE_PROMPT.encode()).hexdigest()[:16]
    f = CACHE / "see" / f"{photo_id}-{h}.json"
    if f.exists():
        log("Photo description loaded from the saved reading.")
        return json.loads(f.read_text())["text"]
    log("Qwen is describing the photo.")
    text = see(path, SEE_PROMPT).strip()
    f.write_text(json.dumps({"photo": photo_id, "text": text}, indent=2))
    return text


def _answers_text(a: dict, photo_words: str | None) -> str:
    flags = [n for k, n in [("smell", "bad smell from the wound"), ("spreading", "redness spreading"),
                            ("edges", "wound edges have come apart"), ("unwell", "feeling very unwell")] if a.get(k)]
    disc = {"none": "none", "clear": "clear or pink", "cloudy": "cloudy yellow or green"}[a.get("discharge", "none")]
    lines = [
        f"Operation: {a['operation']}. Day {a['day']} after surgery.",
        f"Baseline (how it looked when leaving hospital): {a['baseline'] or 'not given'}",
        f"Pain today: {a['pain']} out of 10.",
        f"Temperature: {a['temp'] or 'not taken'}.",
        f"Discharge: {disc}.",
        f"Also reported: {', '.join(flags) if flags else 'nothing else'}.",
    ]
    if a.get("note"):
        lines.append(f"In the patient's words: {a['note']}")
    lines.append(f"Photo, as described by a vision model: {photo_words}" if photo_words else "No photo sent.")
    return "\n".join(lines)


def _clean(res: dict) -> dict:
    d = res.get("decision")
    if d not in LEVELS:
        raise ValueError(f"model returned decision {d!r}")
    res["reasons"] = [r for r in res.get("reasons", []) if r.get("sign")]
    res["steps"] = [s for s in res.get("steps", []) if s]
    res["message_to_team"] = res.get("message_to_team") or ""
    res["photo_disagrees"] = bool(res.get("photo_disagrees"))
    return res


def assess(a: dict, log=lambda t: None) -> dict:
    photo_words = describe_photo(a["photo"], log) if a.get("photo") else None
    floor, why = _rule_floor(a)
    rule = (f"\n\nWritten safety rule: at least {floor} because {why.lower()}. Choose {floor} or higher "
            "and write the headline to match." if floor != "no_change" else "")
    log("Nemotron Super is weighing the answers against the baseline.")
    res = think([{"role": "system", "content": SYSTEM},
                 {"role": "user", "content": _answers_text(a, photo_words) + rule}],
                model=SUPER, json_out=True, max_tokens=8000, temperature=0.1)
    res = _clean(res)
    level = res["decision"]

    second = None
    if level in ("call_today", "emergency"):
        log("Nemotron Ultra is double-checking the alarm.")
        chk = think([
            {"role": "system", "content": "You are a cautious second reviewer of a post-surgery check-in. "
             "Reply with JSON only: {\"agree\": true or false, \"decision\": one of no_change|watch|call_today|emergency, "
             "\"note\": \"one sentence\"}. Raise the level only if the answers justify it; emergency only for fever with spreading redness or open edges, feeling very unwell, breathlessness or confusion; never say the patient has no infection."},
            {"role": "user", "content": _answers_text(a, photo_words) + f"\n\nFirst assessment: {level}. {res['headline']}"}],
            model=ULTRA, json_out=True, max_tokens=8000, temperature=0.1)
        second = {"model": "Nemotron Ultra", "agrees": bool(chk.get("agree")), "note": chk.get("note", "")}
        if chk.get("decision") in LEVELS and LEVELS.index(chk["decision"]) > LEVELS.index(level):
            level = chk["decision"]
            log(f"Second check raised the level to {level}.")

    if LEVELS.index(floor) > LEVELS.index(level):
        log(f"Written rule raised the level: {why}.")
        level = floor

    res["decision"] = level
    res["second_check"] = second
    res["photo_words"] = photo_words
    return res
