"""The five worked check-ins. Each pairs a cropped photo from the research set with
what a patient at that stage would type. The answers are the patient's side of the
form; the assessment is produced by the agent and cached under cache/cases/."""

PHOTOS = {
    "ports": {
        "label": "Four small cuts on the abdomen",
        "credit": "SurgWound dataset, Ohio State Wexner Medical Center. CC BY-SA 4.0. Cropped.",
    },
    "midline": {
        "label": "Stitched line down the lower abdomen",
        "credit": "Parnell, J Funct Biomater 2011. CC BY. Cropped.",
    },
    "saphenectomy": {
        "label": "Open wound on a limb after bypass surgery",
        "credit": "Schmitto et al., J Cardiothorac Surg 2009. CC BY. Cropped.",
    },
    "limb-incision": {
        "label": "Stitched incision on a limb",
        "credit": "Kaggle postoperative wound infection set. CC BY 4.0. Cropped.",
    },
    "groin-healed": {
        "label": "Groin incision, 30 days on",
        "credit": "Gombert et al., J Med Case Rep 2016. CC BY. Cropped.",
    },
}

_BASE = dict(operation="", day=1, baseline="", pain=0, temp="", discharge="none",
             smell=False, spreading=False, edges=False, unwell=False, note="", photo=None)


def _a(**kw):
    return {**_BASE, **kw}


CASES = [
    {
        "id": "ports",
        "title": "Port sites, day 10",
        "blurb": "Small cuts, feeling well.",
        "answers": _a(operation="Keyhole surgery on the abdomen", day=10,
                      baseline="Four small cuts closed with stitches. No redness when I left hospital.",
                      pain=2, temp="36.8", photo="ports"),
    },
    {
        "id": "midline",
        "title": "Abdominal incision, day 4",
        "blurb": "Itchy, red and warm below the cut.",
        "answers": _a(operation="Abdominal surgery, one long incision", day=4,
                      baseline="Clean stitched line, skin pale around it.",
                      pain=6, temp="37.2", spreading=True,
                      note="Itching across the lower half of the cut. The skin there is warm and tender.",
                      photo="midline"),
    },
    {
        "id": "saphenectomy",
        "title": "Bypass wound, day 6",
        "blurb": "Fever and a wound that has opened.",
        "answers": _a(operation="Heart bypass, vein taken for the graft", day=6,
                      baseline="Stitched and dry when I went home.",
                      pain=7, temp="38.4", discharge="cloudy", edges=True,
                      note="The wound opened overnight.", photo="saphenectomy"),
    },
    {
        "id": "limb-incision",
        "title": "Fever and smell, day 8",
        "blurb": "Blood-stained stitches, fever, bad smell.",
        "answers": _a(operation="Limb surgery, stitched incision", day=8,
                      baseline="Closed, dry, no smell.",
                      pain=7, temp="38.1", smell=True,
                      note="Bad smell under the dressing. Feeling hot and achy since last night.",
                      photo="limb-incision"),
    },
    {
        "id": "groin-healed",
        "title": "Groin incision, day 30",
        "blurb": "Pink along the cut, no other signs.",
        "answers": _a(operation="Groin incision after vein surgery", day=30,
                      baseline="Day 1: stitches closed, bruising along the cut.",
                      pain=0, temp="36.6", photo="groin-healed"),
    },
]


def key(a: dict) -> str:
    """Normalised answers, so a case opened from the examples matches its cache."""
    f = {**_BASE, **a}
    return "|".join(str(f[k]).strip().lower() for k in sorted(_BASE))


BY_KEY = {key(c["answers"]): c for c in CASES}
