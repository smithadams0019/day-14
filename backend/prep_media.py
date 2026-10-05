"""Crop each demo photo to the wound region only and write it to media/.

Nothing outside the incision is kept: no captions, no hands, no clothing, no
background. None of the source photos show a face; the crops make sure no other
identifying detail (burned-in social-media captions, fingers, panel labels)
survives either.
"""
from pathlib import Path
from PIL import Image

R = Path(__file__).resolve().parents[2] / "research" / "images"
OUT = Path(__file__).resolve().parent / "media"
OUT.mkdir(exist_ok=True)

# id: (source, crop box left, top, right, bottom)
CROPS = {
    "ports": ("surgwound/surgwound_test_13.jpg", (60, 520, 960, 1190)),
    "midline": ("pmc/PMC4030914_jfb-02-00338f10.jpg", (64, 110, 288, 385)),
    "saphenectomy": ("pmc/PMC2753312_1749-8090-4-47-1.jpg", (0, 60, 600, 440)),
    "limb-incision": ("kaggle-postop/task_236_img_000358_infected.jpg", (285, 365, 1230, 800)),
    "groin-healed": ("pmc/PMC4937529_13256_2016_930_Fig5_HTML.jpg", (8, 8, 350, 496)),
}

for name, (src, box) in CROPS.items():
    im = Image.open(R / src).convert("RGB").crop(box)
    im.thumbnail((900, 900))
    im.save(OUT / f"{name}.jpg", quality=88)
    print(name, im.size)
