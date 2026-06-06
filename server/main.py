import asyncio
import json
import secrets
import sys
import platform
import logging
from websockets.server import serve
from protocol import parse_message, MoveEvent, ButtonEvent, ScrollEvent

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Load OS-specific input controller
if platform.system() == "Windows":
    from input_windows import InputController
elif platform.system() == "Linux":
    from input_linux import InputController
else:
    logging.error("Unsupported OS!")
    sys.exit(1)

controller = InputController()
AUTH_TOKEN = secrets.token_hex(4)  # 8 character hex token

async def handler(websocket):
    client_ip = websocket.remote_address[0]
    logging.info(f"Client connected from {client_ip}. Waiting for authentication...")
    
    authenticated = False
    
    try:
        async for message in websocket:
            if not authenticated:
                try:
                    data = json.loads(message)
                    if data.get("type") == "auth" and data.get("token") == AUTH_TOKEN:
                        authenticated = True
                        await websocket.send(json.dumps({"type": "auth_result", "status": "ok"}))
                        logging.info(f"Client {client_ip} authenticated successfully.")
                    else:
                        await websocket.send(json.dumps({"type": "auth_result", "status": "failed"}))
                        logging.warning(f"Client {client_ip} failed authentication.")
                        await websocket.close()
                        return
                except json.JSONDecodeError:
                    await websocket.close()
                    return
                continue

            # Process input events
            event = parse_message(message)
            if isinstance(event, MoveEvent):
                controller.handle_move(event)
            elif isinstance(event, ButtonEvent):
                controller.handle_button(event)
            elif isinstance(event, ScrollEvent):
                controller.handle_scroll(event)

    except Exception as e:
        logging.error(f"Connection error: {e}")
    finally:
        logging.info(f"Client {client_ip} disconnected.")

async def main():
    host = "0.0.0.0"
    port = 8765
    
    print("="*40)
    print("WiiPhone Server Started")
    print("="*40)
    print(f" Listening on ws://<Your-IP-Address>:{port}")
    print(f"AUTH TOKEN: {AUTH_TOKEN}")
    print("="*40)
    
    async with serve(handler, host, port):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer shutting down.")
