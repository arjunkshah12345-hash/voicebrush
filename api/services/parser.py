from __future__ import annotations
import json
from typing import Optional, Literal

class BrushAction:
    def __init__(self, cmd: dict):
        self.cmd = cmd
    def to_dict(self) -> dict:
        return self.cmd

def parse_intent(text: str) -> dict:
    # MVP: simple rule-based fallback
    t = text.lower()
    color = "skyblue"
    if "red" in t: color="crimson"
    if "blue" in t: color="deepskyblue"
    if "green" in t: color="limegreen"
    if "yellow" in t: color="gold"
    if "black" in t: color="black"
    if "white" in t: color="white"
    if "purple" in t: color="violet"
    if "pink" in t: color="hotpink"
    if "teal" in t: color="turquoise"
    shape = "wavy"
    if "circle" in t or "dot" in t: shape="circle"
    if "line" in t or "stroke" in t: shape="line"
    if "swirl" in t or "spiral" in t: shape="spiral"
    if "zigzag" in t: shape="zigzag"
    size = 12
    if "big" in t or "large" in t: size=24
    if "small" in t or "tiny" in t: size=6
    if "huge" in t: size=36
    return {"color": color, "shape": shape, "size": size, "text": text}
