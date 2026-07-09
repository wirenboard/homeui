import asyncio
import base64
import fcntl
import json
import os
import pty
import struct
import termios

import websockets

LISTEN_HOST = "127.0.0.1"
LISTEN_PORT = 8765
MAX_CONNECTIONS = 3
IDLE_TIMEOUT = 1800  # 30 minutes

active_connections = set()


async def terminal_handler(websocket):
    if len(active_connections) >= MAX_CONNECTIONS:
        await websocket.close(1013, "Too many connections")
        return

    active_connections.add(websocket)

    master_fd, slave_fd = pty.openpty()

    env = os.environ.copy()
    env["TERM"] = "xterm-256color"
    env["LANG"] = "en_US.UTF-8"

    proc = await asyncio.create_subprocess_exec(
        "/bin/bash",
        "--login",
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        preexec_fn=os.setsid,
        env=env,
    )

    os.close(slave_fd)

    loop = asyncio.get_event_loop()

    async def read_pty():
        try:
            while True:
                data = await loop.run_in_executor(None, lambda: os.read(master_fd, 4096))
                if not data:
                    break
                msg = json.dumps(
                    {
                        "type": "output",
                        "data": base64.b64encode(data).decode("ascii"),
                    }
                )
                await websocket.send(msg)
        except (OSError, websockets.exceptions.ConnectionClosed):
            pass

    reader_task = asyncio.create_task(read_pty())

    activity_event = asyncio.Event()

    async def idle_watchdog():
        while True:
            activity_event.clear()
            try:
                await asyncio.wait_for(activity_event.wait(), timeout=IDLE_TIMEOUT)
            except asyncio.TimeoutError:
                await websocket.close(1000, "Idle timeout")
                return

    watchdog_task = asyncio.create_task(idle_watchdog())

    try:
        async for message in websocket:
            activity_event.set()

            try:
                msg = json.loads(message)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "input":
                data = base64.b64decode(msg["data"])
                try:
                    os.write(master_fd, data)
                except OSError:
                    break
            elif msg.get("type") == "resize":
                cols = msg.get("cols", 80)
                rows = msg.get("rows", 24)
                winsize = struct.pack("HHHH", rows, cols, 0, 0)
                try:
                    fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                except OSError:
                    pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        active_connections.discard(websocket)
        reader_task.cancel()
        watchdog_task.cancel()
        try:
            proc.terminate()
            await proc.wait()
        except ProcessLookupError:
            pass
        try:
            os.close(master_fd)
        except OSError:
            pass


async def main():
    async with websockets.serve(terminal_handler, LISTEN_HOST, LISTEN_PORT):
        await asyncio.Future()


def run():
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
