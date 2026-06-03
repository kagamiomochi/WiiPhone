import json
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class Event:
    event_type: str

@dataclass
class MoveEvent(Event):
    dx: int
    dy: int

@dataclass
class ButtonEvent(Event):
    button: str # "left", "right", "middle"
    state: str  # "down", "up"

@dataclass
class ScrollEvent(Event):
    delta: int

def parse_message(message: str) -> Optional[Event]:
    try:
        data: Dict[str, Any] = json.loads(message)
        etype = data.get("type")
        
        if etype == "move":
            return MoveEvent("move", int(data["dx"]), int(data["dy"]))
        elif etype == "button":
            return ButtonEvent("button", data["button"], data["state"])
        elif etype == "scroll":
            return ScrollEvent("scroll", int(data["delta"]))
        return None
    except Exception:
        return None