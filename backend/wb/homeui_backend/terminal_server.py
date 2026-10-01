import asyncio
import base64
import fcntl
import json
import os
import pty
import signal
import stat
import struct
import termios

import websockets

SOCKET_PATH = "/tmp/wb-homeui-terminal.socket"
MAX_CONNECTIONS = 3
IDLE_TIMEOUT = 1800  # 30 minutes

active_connections = set()


async def _create_pty_process():
    master_fd, slave_fd = pty.openpty()
    env = os.environ.copy()
    env["TERM"] = "xterm-256color"
    env["LANG"] = "en_US.UTF-8"
    env.setdefault("HOME", "/root")
    home = env["HOME"]
    proc = await asyncio.create_subprocess_exec(
        "/bin/bash",
        "--login",
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        preexec_fn=os.setsid,
        env=env,
        cwd=home if os.path.isdir(home) else "/",
    )
    os.close(slave_fd)
    return master_fd, proc


def _close_fd(fd):
    try:
        os.close(fd)
    except OSError:
        pass


async def _read_pty_output(master_fd, websocket):
    loop = asyncio.get_event_loop()
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


async def _watch_process(proc, websocket):
    await proc.wait()
    await websocket.close(1000, "Shell exited")


async def _idle_watchdog(activity_event, websocket):
    while True:
        activity_event.clear()
        try:
            await asyncio.wait_for(activity_event.wait(), timeout=IDLE_TIMEOUT)
        except asyncio.TimeoutError:
            await websocket.close(1000, "Idle timeout")
            return


async def _handle_messages(websocket, master_fd, activity_event):
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


async def _cleanup_process(proc, master_fd):
    _close_fd(master_fd)
    if proc.returncode is None:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except (ProcessLookupError, OSError):
            pass
        try:
            await asyncio.wait_for(proc.wait(), timeout=3)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()


async def terminal_handler(websocket):
    if len(active_connections) >= MAX_CONNECTIONS:
        await websocket.close(1013, "Too many connections")
        return

    active_connections.add(websocket)
    master_fd, proc = await _create_pty_process()
    activity_event = asyncio.Event()
    reader_task = asyncio.create_task(_read_pty_output(master_fd, websocket))
    watchdog_task = asyncio.create_task(_idle_watchdog(activity_event, websocket))
    process_task = asyncio.create_task(_watch_process(proc, websocket))

    try:
        await _handle_messages(websocket, master_fd, activity_event)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        active_connections.discard(websocket)
        reader_task.cancel()
        watchdog_task.cancel()
        process_task.cancel()
        await _cleanup_process(proc, master_fd)


async def main():
    if os.path.exists(SOCKET_PATH):
        os.unlink(SOCKET_PATH)
    async with websockets.unix_serve(terminal_handler, SOCKET_PATH):
        os.chmod(SOCKET_PATH, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP | stat.S_IWOTH)
        await asyncio.Future()


def run():
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
