from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Voicebrush API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParseReq(BaseModel):
    text: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/parse")
def parse(req: ParseReq):
    t = req.text.lower()
    color = "skyblue"
    if "red" in t: color = "crimson"
    if "blue" in t: color = "deepskyblue"
    if "green" in t: color = "limegreen"
    if "yellow" in t: color = "gold"
    if "black" in t: color = "black"
    if "white" in t: color = "white"
    if "purple" in t or "violet" in t: color = "violet"
    if "pink" in t: color = "hotpink"
    if "teal" in t or "turquoise" in t: color = "turquoise"
    if "orange" in t: color = "orange"
    shape = "wavy"
    if "circle" in t or "dot" in t: shape = "circle"
    if "line" in t or "stroke" in t: shape = "line"
    if "swirl" in t or "spiral" in t: shape = "spiral"
    if "zigzag" in t: shape = "zigzag"
    size = 12
    if "big" in t or "large" in t: size = 24
    if "small" in t or "tiny" in t: size = 6
    if "huge" in t: size = 36
    if "massive" in t: size = 48
    return {"color": color, "shape": shape, "size": size, "text": req.text}
