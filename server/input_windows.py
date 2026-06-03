import ctypes
from protocol import MoveEvent, ButtonEvent, ScrollEvent

# ctypes structure definitions for SendInput
LONG = ctypes.c_long
DWORD = ctypes.c_ulong
ULONG_PTR = ctypes.POINTER(DWORD)
WORD = ctypes.c_ushort

class MOUSEINPUT(ctypes.Structure):
    _fields_ = (
        ("dx", LONG),
        ("dy", LONG),
        ("mouseData", DWORD),
        ("dwFlags", DWORD),
        ("time", DWORD),
        ("dwExtraInfo", ULONG_PTR)
    )

class INPUT_UNION(ctypes.Union):
    _fields_ = (("mi", MOUSEINPUT),)

class INPUT(ctypes.Structure):
    _fields_ = (
        ("type", DWORD),
        ("union", INPUT_UNION)
    )

# Windows Constants
INPUT_MOUSE = 0
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800

class InputController:
    def __init__(self):
        self.SendInput = ctypes.windll.user32.SendInput

    def _send_input(self, dx=0, dy=0, mouseData=0, dwFlags=0):
        mi = MOUSEINPUT(dx, dy, mouseData, dwFlags, 0, None)
        inp = INPUT(INPUT_MOUSE, INPUT_UNION(mi=mi))
        self.SendInput(1, ctypes.byref(inp), ctypes.sizeof(INPUT))

    def handle_move(self, event: MoveEvent):
        self._send_input(dx=event.dx, dy=event.dy, dwFlags=MOUSEEVENTF_MOVE)

    def handle_button(self, event: ButtonEvent):
        flags = 0
        if event.button == "left":
            flags = MOUSEEVENTF_LEFTDOWN if event.state == "down" else MOUSEEVENTF_LEFTUP
        elif event.button == "right":
            flags = MOUSEEVENTF_RIGHTDOWN if event.state == "down" else MOUSEEVENTF_RIGHTUP
        elif event.button == "middle":
            flags = MOUSEEVENTF_MIDDLEDOWN if event.state == "down" else MOUSEEVENTF_MIDDLEUP
        
        if flags:
            self._send_input(dwFlags=flags)

    def handle_scroll(self, event: ScrollEvent):
        # Windows API requires wheel data in multiples of WHEEL_DELTA (120)
        # However, for smooth scrolling, sending the raw delta * a multiplier works well.
        self._send_input(mouseData=event.delta * 2, dwFlags=MOUSEEVENTF_WHEEL)