from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

class ParseReq(BaseModel):
    text: str

class BrushCmd(BaseModel):
    color: str
    shape: str
    size: float
    opacity: float
    rotation: float
    velocity: float
    count: int
    text: str

EMOTION = {
    "calm":"#9fc9ff","peaceful":"#b9dcff","serene":"#d6eaff",
    "happy":"#ffe066","joy":"#ffd93b","excited":"#ffb84d","energetic":"#ff9c33",
    "angry":"#ff4d4d","furious":"#ff3b30","rage":"#cc1f1f",
    "sad":"#7fa9e6","melancholy":"#a9bce6","nostalgic":"#c9d6ff",
    "afraid":"#c9c9c9","scared":"#d7d7d7","tense":"#e2d8cc",
    "love":"#ffc9de","romantic":"#ffe6ef",
    "mysterious":"#c9b7ff","magical":"#e2dcff","dreamy":"#e6ecff",
    "chaotic":"#ff7a1a","wild":"#ff9c4d",
}

COLORS = [
    ("crimson","#ef4444"),("red","#ff3b30"),("orange","#ff9c33"),("gold","#ffd93b"),
    ("yellow","#ffe066"),("lime","#d7ff66"),("green","#34c759"),("teal","#4dd7b3"),
    ("cyan","#66e3ff"),("sky","#7fc9ff"),("blue","#7fa9ff"),("indigo","#a08cff"),
    ("violet","#c9b7ff"),("purple","#b57cff"),("pink","#ffc9de"),("hotpink","#ff7fb9"),
    ("white","#f7f7f7"),("silver","#e6e6e6"),("gray","#bfbfbf"),("black","#f2f2f2"),
]

@app.get("/api/health")
def health():
    return {"status":"ok"}

@app.post("/api/parse")
def parse(req: ParseReq):
    t = req.text.lower()
    color = "#b9d6ff"
    for k,c in EMOTION.items():
        if k in t: color=c; break
    if color == "#b9d6ff":
        for w,c in COLORS:
            if w in t: color=c; break
    shape = "curve"
    if any(x in t for x in ["circle","orb","loop"]): shape="circle"
    elif any(x in t for x in ["spiral","swirl","whirl"]): shape="spiral"
    elif any(x in t for x in ["zigzag","jagged","saw"]): shape="zigzag"
    elif any(x in t for x in ["wave","ripple","sine"]): shape="wave"
    elif any(x in t for x in ["dots","speck","sprinkle","scatter"]): shape="dots"
    elif any(x in t for x in ["swipe","slash","stroke"]): shape="swipe"
    elif any(x in t for x in ["line","straight"]): shape="line"
    size = 9.0
    if any(x in t for x in ["massive","enormous","gigantic","huge"]): size=36.0
    elif any(x in t for x in ["big","large","bold","thick"]): size=20.0
    elif any(x in t for x in ["small","thin","tiny","fine"]): size=5.0
    elif any(x in t for x in ["micro"]): size=2.5
    opacity = 0.98
    if any(x in t for x in ["ghost","faint","translucent"]): opacity=0.38
    if any(x in t for x in ["soft","mist","wash"]): opacity=0.28
    if any(x in t for x in ["bold","solid","opaque"]): opacity=1.0
    velocity = 1.05
    if any(x in t for x in ["slow","gentle","smooth","calm"]): velocity=0.48
    elif any(x in t for x in ["fast","quick","swift","rapid"]): velocity=1.85
    elif any(x in t for x in ["explosive","burst","whoosh"]): velocity=2.6
    rotation = 0.0
    if any(x in t for x in ["twirl","spin","rotate"]): rotation=1.0
    if any(x in t for x in ["wild","chaotic","insane"]): rotation=2.2
    count = 1
    if any(x in t for x in ["double","twice"]): count=2
    if any(x in t for x in ["triple"]): count=3
    if any(x in t for x in ["many","lots","shower","spray","scatter"]): count=8
    return BrushCmd(color=color,shape=shape,size=size,opacity=opacity,rotation=rotation,velocity=velocity,count=count,text=req.text)
