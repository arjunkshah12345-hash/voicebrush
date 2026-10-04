from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI(title="Voicebrush API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParseReq(BaseModel):
    text: str

class BrushCmd(BaseModel):
    color: str
    shape: str  # line|curve|circle|spiral|zigzag|dots|wave|swipe
    size: float
    opacity: float
    rotation: float
    velocity: float
    count: int
    text: str

EMOTION_COLORS = {
    "calm": "#7fa9ff",
    "peaceful": "#9fc9ff",
    "serene": "#b9dcff",
    "happy": "#ffd93b",
    "joy": "#ffe066",
    "excited": "#ff9c33",
    "energetic": "#ffb066",
    "angry": "#ff3b30",
    "furious": "#ff5c5c",
    "rage": "#cc1f1f",
    "sad": "#5b7fb9",
    "melancholy": "#7a93c9",
    "nostalgic": "#a9bce6",
    "afraid": "#9e9e9e",
    "scared": "#bdbdbd",
    "tense": "#d7ccc5",
    "love": "#ff9ecb",
    "romantic": "#ffc9de",
    "mysterious": "#b89cff",
    "magical": "#d7c9ff",
    "dreamy": "#d9e3ff",
    "chaotic": "#ff6b00",
    "wild": "#ff8a33",
}

def detect_emotion(t: str) -> Optional[str]:
    for k, v in EMOTION_COLORS.items():
        if k in t:
            return v
    return None

def parse_intent(text: str) -> BrushCmd:
    t = text.lower().strip()

    # colors
    color = "#7fa9ff"
    for word, c in [
        ("crimson", "#e11d48"),
        ("red", "#ff3b30"),
        ("orange", "#ff9c33"),
        ("gold", "#ffd93b"),
        ("yellow", "#ffe066"),
        ("lime", "#b6e05c"),
        ("green", "#34c759"),
        ("teal", "#3fb984"),
        ("turquoise", "#5dd6e4"),
        ("cyan", "#64d2ff"),
        ("sky", "#7fc9ff"),
        ("blue", "#5b9bff"),
        ("indigo", "#7e5cff"),
        ("violet", "#b89cff"),
        ("purple", "#a855f7"),
        ("pink", "#ff9ecb"),
        ("magenta", "#f06595"),
        ("hotpink", "#ff5caa"),
        ("black", "#111111"),
        ("white", "#f7f7f7"),
        ("gray", "#9e9e9e"),
        ("grey", "#9e9e9e"),
        ("silver", "#e0e0e0"),
    ]:
        if word in t:
            color = c
            break
    emo = detect_emotion(t)
    if emo:
        color = emo

    # shapes
    shape = "curve"
    if any(x in t for x in ["circle", "dot", "orb", "blob"]):
        shape = "circle"
    elif any(x in t for x in ["spiral", "swirl", "whirl"]):
        shape = "spiral"
    elif any(x in t for x in ["zigzag", "saw", "jagged"]):
        shape = "zigzag"
    elif any(x in t for x in ["wave", "sine", "ripple"]):
        shape = "wave"
    elif any(x in t for x in ["dots", "speckles", "sprinkle"]):
        shape = "dots"
    elif any(x in t for x in ["swipe", "slash", "stroke"]):
        shape = "swipe"
    elif any(x in t for x in ["line", "straight"]):
        shape = "line"
    elif any(x in t for x in ["curve", "arc", "loop"]):
        shape = "curve"

    # size
    size = 10.0
    if any(x in t for x in ["massive", "enormous", "huge", "gigantic"]):
        size = 48.0
    elif any(x in t for x in ["big", "large", "bold", "thick"]):
        size = 24.0
    elif any(x in t for x in ["medium", "normal"]):
        size = 10.0
    elif any(x in t for x in ["small", "thin", "tiny", "fine"]):
        size = 5.0
    elif any(x in t for x in ["micro"]):
        size = 2.0

    # opacity/velocity/rotation
    opacity = 0.95
    if "translucent" in t or "ghost" in t or "faint" in t:
        opacity = 0.4
    if "wash" in t or "soft" in t or "misty" in t:
        opacity = 0.3
    if "bold" in t or "opaque" in t:
        opacity = 1.0

    velocity = 1.0
    if any(x in t for x in ["fast", "quick", "rapid", "swift"]):
        velocity = 1.8
    if any(x in t for x in ["slow", "gentle", "calm"]):
        velocity = 0.5
    if any(x in t for x in ["explosive", "burst"]):
        velocity = 2.4

    rotation = 0.0
    if "spin" in t or "twirl" in t or "rotate" in t:
        rotation = 180.0
    if "chaotic" in t or "wild" in t:
        rotation = 360.0

    count = 1
    if "double" in t or "twice" in t:
        count = 2
    if "triple" in t or "many" in t or "lots" in t:
        count = 5
    if "shower" in t or "spray" in t or "scatter" in t:
        count = 12

    return BrushCmd(
        color=color,
        shape=shape,
        size=size,
        opacity=opacity,
        rotation=rotation,
        velocity=velocity,
        count=count,
        text=text,
    )

@app.post("/api/parse", response_model=BrushCmd)
def parse(req: ParseReq):
    return parse_intent(req.text)

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
