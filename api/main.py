from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .services import parser

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
    return parser.parse_intent(req.text)
