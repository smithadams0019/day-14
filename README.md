# Day 14

A post-op recovery check-in. The patient answers a short form about the wound and picks a photo; Day 14 says whether anything differs from their own baseline and what to do: no change, watch, call your surgical team today, or go to A&E now. It informs; it does not diagnose, and it never says there is no infection.

Live: https://2mrvwvsqij.eu-west-2.awsapprunner.com

## NVIDIA Nemotron and Nebius Token Factory

1. `see()` (Qwen/Qwen3.8-27B on Token Factory) turns the wound photo into words. It only describes. Each photo is read once and cached in `backend/cache/see/`.
2. Written warning signs (fever of 38 C or more, spreading redness, open edges, bad smell, feeling very unwell) are code in `backend/agent.py` and set a minimum level.
3. `think()` with Nemotron 3 Super compares today's answers and the photo words with the patient's baseline and returns the decision, the signs checked, the steps and a drafted message to the surgical team. If the photo looks calm but the patient reports warning signs, the symptoms win.
4. Any "call today" or "emergency" result is double-checked by Nemotron 3 Ultra, which can raise the level but never lower it.

Model ids: `nvidia/nemotron-3-super-120b-a12b`, `nvidia/Nemotron-3-Ultra-550b-a55b`, plus `Qwen/Qwen3.8-27B` for vision. Every model call runs on Nebius Token Factory, which is serverless and OpenAI-compatible, so one base URL and the standard OpenAI client reached every model with no GPU and no dedicated endpoint to provision. That is what let this be built and deployed quickly, and the tiering keeps Ultra for the rare escalated results.

Five worked check-ins are pre-computed in `backend/cache/cases/`, so opening an example costs no tokens. "Run it live" on a result calls the models; a changed form always runs live.

## Photos

Real post-operative wound photos, each cropped to the wound region (no captions, hands or surroundings; none show a face). Crops are made by `backend/prep_media.py`. Credits are shown under each photo and on the How it works page: SurgWound (CC BY-SA 4.0), Kaggle post-op set (CC BY 4.0), and PMC case reports (CC BY).

## Run

```
cd frontend && npm install && npm run build
cd ../backend && pip install -r requirements.txt
NEBIUS_API_KEY=... uvicorn main:app --port 8080
```

`python build_cache.py` regenerates the saved results (live calls). Docker: `docker build -t day-14 .`, then pass `NEBIUS_API_KEY` at runtime.

Stack: Python, FastAPI, React (Vite), Qwen vision and NVIDIA Nemotron on Nebius Token Factory.

Licensed under the Apache License 2.0.
