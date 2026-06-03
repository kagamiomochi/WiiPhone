from protocol import MoveEvent, ButtonEvent, ScrollEvent
import logging

try:
    from evdev import UInput, ecodes as e
except ImportError:
    logging.warning("evdev module not found. This module is required on Linux.")

class InputController:
    def __init__(self):
        # Wayland compatibility via evdev/uinput virtual device
        capabilities = {
            e.EV_REL: (e.REL_X, e.REL_Y, e.REL_WHEEL),
            e.EV_KEY: (e.BTN_LEFT, e.BTN_RIGHT, e.BTN_MIDDLE)
        }
        try:
            self.ui = UInput(capabilities, name="Smartphone-Remote-Mouse", version=0x1)
        except Exception as ex:
            logging.error(f"Failed to create UInput device. Do you have correct permissions? {ex}")
            raise

    def handle_move(self, event: MoveEvent):
        self.ui.write(e.EV_REL, e.REL_X, event.dx)
        self.ui.write(e.EV_REL, e.REL_Y, event.dy)
        self.ui.syn()

    def handle_button(self, event: ButtonEvent):
        btn = None
        if event.button == "left":
            btn = e.BTN_LEFT
        elif event.button == "right":
            btn = e.BTN_RIGHT
        elif event.button == "middle":
            btn = e.BTN_MIDDLE
            
        if btn is not None:
            val = 1 if event.state == "down" else 0
            self.ui.write(e.EV_KEY, btn, val)
            self.ui.syn()

    def handle_scroll(self, event: ScrollEvent):
        # Invert delta for natural scrolling behavior if necessary (usually positive is up)
        # evdev wheel: positive is scroll up
        self.ui.write(e.EV_REL, e.REL_WHEEL, event.delta // 10) # Normalize for evdev
        self.ui.syn()