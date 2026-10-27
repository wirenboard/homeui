"""Shared fixtures for the terminal server tests.

Faked: the browser (a `websockets` client over a socketpair), /proc (hand-written files) and the
clock. The PTY and the login process are real, so hangups and descriptor passing behave as on
the controller.
"""

import base64
import json
import os
import select
import shutil
import socket
import subprocess  # nosec B404 - a child process stands in for login
import tempfile
import time
import unittest
from typing import Dict, List, Optional
from unittest.mock import patch

import websockets.client
import websockets.frames
import websockets.http11
import websockets.protocol
import websockets.uri
from wb.homeui_backend.terminal import login, registry

SERVICE_CGROUP = "/system.slice/wb-terminal-server.service"
SESSION_SCOPE = "/user.slice/user-0.slice/session-{}.scope"
# Nesting depth at which the JSON scanner gives up.
UNREADABLE_DEPTH = 20_000
# `list_sessions` orders sessions by socket st_ctime. Its resolution can be a timer tick (10 ms
# at HZ=100), so fixtures wait for the clock to move between creations instead of sleeping a
# fixed time.
CLOCK_STEP = 0.002
CLOCK_MOVE_TIMEOUT = 5.0
# The session leader opens the tty to make it its controlling terminal, then closes it, so the
# test holds the only open slave descriptor.
TAKING_THE_TERMINAL = 'exec 0<"$1"; exec 0<&-; echo ready; exec sleep 300'


class FakeBrowser:
    """The browser side: a real websocket client protocol over a socket."""

    def __init__(
        self,
        target: str = "/api/terminal",
        remote_addr: str = "10.0.0.5",
        sock=None,
        session_id: Optional[str] = None,
    ):
        """`session_id` is offered as the only subprotocol, as the UI does on reconnect."""
        if sock is None:
            self.sock, self.server_side = socket.socketpair(socket.AF_UNIX, socket.SOCK_STREAM)
        else:
            self.sock, self.server_side = sock, None
        self.response = None
        self.close_code: Optional[int] = None
        self._protocol = websockets.client.ClientProtocol(
            websockets.uri.parse_uri("ws://wirenboard" + target),
            subprotocols=[session_id] if session_id else None,
        )
        self._pending: List[Dict] = []
        request = self._protocol.connect()
        request.headers["X-Real-IP"] = remote_addr
        self._protocol.send_request(request)
        self._write()

    @property
    def status_code(self) -> Optional[int]:
        """HTTP status of the handshake response."""
        return self.response.status_code if self.response is not None else None

    def send(self, message: Dict) -> None:
        self.send_text(json.dumps(message))

    def send_in_two_frames(self, message: Dict) -> None:
        """Send one message split across two frames (the UI never does this)."""
        self._ensure_open()
        payload = json.dumps(message).encode("utf-8")
        middle = len(payload) // 2
        self._protocol.send_text(payload[:middle], fin=False)
        self._protocol.send_continuation(payload[middle:], fin=True)
        self._write()

    def send_text(self, payload: str) -> None:
        """Send a raw text frame."""
        self._ensure_open()
        self._protocol.send_text(payload.encode("utf-8"))
        self._write()

    def send_and_close(self, message: Dict) -> None:
        """Send a message and a close frame in one write, so the server reads them together."""
        self._ensure_open()
        self._protocol.send_text(json.dumps(message).encode("utf-8"))
        self._protocol.send_close(1000)
        self.sock.sendall(b"".join(self._protocol.data_to_send()))

    def send_close(self, code: int = 1000) -> None:
        """Send a close frame, leaving the socket open."""
        self._ensure_open()
        self._protocol.send_close(code)
        self._write()

    def send_ping(self, payload: bytes = b"beat") -> None:
        self._ensure_open()
        self._protocol.send_ping(payload)
        self._write()

    def messages(self, timeout: float = 1.0) -> List[Dict]:
        """Messages received since the last call."""
        self._read(timeout)
        pending, self._pending = self._pending, []
        return pending

    def message_of_type(self, kind: str, timeout: float = 1.0) -> Optional[Dict]:
        """Pop the first message of this type, keeping the others."""
        deadline = time.monotonic() + timeout
        while True:
            for index, message in enumerate(self._pending):
                if message.get("type") == kind:
                    return self._pending.pop(index)
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return None
            self._read(min(0.2, remaining))

    def output_until(self, needle: str, timeout: float) -> str:
        """Decoded terminal output read until `needle` appears or timeout; other messages are dropped."""
        text = ""
        deadline = time.monotonic() + timeout
        while needle not in text and time.monotonic() < deadline:
            for message in self.messages(0.5):
                if message.get("type") == "output":
                    text += base64.b64decode(message["data"]).decode("utf-8", "replace")
        return text

    def disconnect(self) -> None:
        """Close the socket without a close frame, like a closed tab."""
        self.sock.close()

    # --- Private ---

    def _ensure_open(self) -> None:
        """Wait for the 101: the client protocol sends nothing before it."""
        deadline = time.monotonic() + 1.0
        while self._protocol.state is websockets.protocol.State.CONNECTING and time.monotonic() < deadline:
            self._read(0.1)

    def _write(self) -> None:
        for data in self._protocol.data_to_send():
            try:
                if data:
                    self.sock.sendall(data)
                else:
                    self.sock.shutdown(socket.SHUT_WR)
            except OSError:
                return

    def _read(self, timeout: float) -> None:
        """Collect incoming data until the socket goes quiet or the timeout."""
        deadline = time.monotonic() + timeout
        collected = False
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return
            ready, _writable, _failed = select.select([self.sock], [], [], 0.05 if collected else remaining)
            if not ready:
                if collected:
                    return
                continue
            try:
                data = self.sock.recv(65536)
            except OSError:
                return
            if not data:
                self._protocol.receive_eof()
                self.close_code = self._protocol.close_code
                return
            self._protocol.receive_data(data)
            for event in self._protocol.events_received():
                self._collect(event)
            self.close_code = self._protocol.close_code
            self._write()
            collected = True

    def _collect(self, event) -> None:
        if isinstance(event, websockets.http11.Response):
            self.response = event
            return
        if not isinstance(event, websockets.frames.Frame):
            return
        # The server sends every message in a single text frame.
        if event.opcode is websockets.frames.Opcode.TEXT:
            self._pending.append(json.loads(event.data.decode("utf-8")))


class FakeClock:
    """Replaces the `time` module of the code under test; the test advances it by hand.

    `sleep` really sleeps: what is waited for (a process exiting) happens in real time.
    """

    def __init__(self, now: float = 10_000.0):
        self.now = now

    def monotonic(self) -> float:
        return self.now

    @staticmethod
    def sleep(seconds: float) -> None:
        time.sleep(seconds)

    def advance(self, seconds: float) -> None:
        self.now += seconds


class FakeProc:
    """A hand-written /proc: process cgroups and the lock table."""

    def __init__(self, root: str):
        self.root = root
        os.makedirs(root, exist_ok=True)
        self.write_locks([])

    def add_process(self, pid: int, cgroup: str = SERVICE_CGROUP) -> None:
        self._write(f"{pid}/cgroup", f"0::{cgroup}\n")

    def write_locks(self, holders: List, waiters: Optional[List] = None) -> None:
        """Write /proc/locks with (pid, path) holders and blocked waiters."""
        lines = []
        for index, (pid, path) in enumerate(holders, start=1):
            lines.append(f"{index}: FLOCK  ADVISORY  WRITE {pid} {self._dev_inode(path)} 0 EOF")
        for index, (pid, path) in enumerate(waiters or [], start=len(lines) + 1):
            lines.append(f"{index}: -> FLOCK  ADVISORY  WRITE {pid} {self._dev_inode(path)} 0 EOF")
        self._write("locks", "\n".join(lines) + ("\n" if lines else ""))

    # --- Private ---

    def _dev_inode(self, path: str) -> str:
        info = os.stat(path)
        return f"{os.major(info.st_dev):02x}:{os.minor(info.st_dev):02x}:{info.st_ino}"

    def _write(self, name: str, content: str) -> None:
        path = os.path.join(self.root, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as proc_file:
            proc_file.write(content)


class FakeLogin:
    """A real PTY with a session leader on it, standing in for /bin/login.

    The session gets the master; the test keeps the slave and plays the login side. Closing the
    master hangs up the terminal and the stand-in dies of SIGHUP, as login does.
    """

    def __init__(self):
        self.master_fd, self.slave_fd = os.openpty()
        # Own session, so the hangup does not reach the test runner.
        self.process = subprocess.Popen(  # pylint: disable=consider-using-with  # outlives this call
            ["sh", "-c", TAKING_THE_TERMINAL, "sh", os.ttyname(self.slave_fd)],  # nosec B603, B607
            stdout=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
        # Wait until it owns the terminal, or a hangup would miss it.
        assert self.process.stdout.readline().strip() == "ready"
        self.pty = login.PtyProcess(self.master_fd, self.process.pid)

    def alive(self, _pid: int) -> bool:
        return self.process.poll() is None

    def stop(self) -> None:
        self.process.kill()
        self.process.wait()
        self.process.stdout.close()
        for fd in (self.master_fd, self.slave_fd):
            try:
                os.close(fd)
            except OSError:
                pass


def unreadable_message(depth: int = UNREADABLE_DEPTH) -> str:
    """JSON nested too deep to parse, yet small enough to arrive in a single read."""
    return "[" * depth + "]" * depth


def session_ids() -> List[str]:
    return [entry.session_id for entry in registry.list_sessions()]


def listening_socket(path: str):
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.bind(path)
    sock.listen(registry.CONTROL_BACKLOG)
    return sock


def abandoned_socket(path: str) -> None:
    """A socket file nobody listens on, as left by a dead process."""
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.bind(path)


class TerminalTestBase(unittest.TestCase):
    """Patches in a temporary registry directory, a fake /proc and a fake apt lock file."""

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root)
        self.runtime_dir = os.path.join(self.root, "run")
        os.makedirs(self.runtime_dir)
        self.proc = FakeProc(os.path.join(self.root, "proc"))
        self.lock_path = os.path.join(self.root, "dpkg-lock")
        with open(self.lock_path, "w", encoding="utf-8"):
            pass
        self.patch(registry, "RUNTIME_DIR", self.runtime_dir)
        self.patch(registry, "PROC_DIR", self.proc.root)
        self.patch(registry, "APT_LOCK_PATHS", (self.lock_path,))

    def patch(self, target, name: str, value) -> None:
        """Patch `target.name` for the duration of the test."""
        patcher = patch.object(target, name, value)
        patcher.start()
        self.addCleanup(patcher.stop)

    def socket_pair(self):
        """A connected socketpair, closed after the test."""
        left, right = socket.socketpair(socket.AF_UNIX, socket.SOCK_STREAM)
        self.addCleanup(left.close)
        self.addCleanup(right.close)
        return left, right

    def add_session(self, session_id, login_pid, cgroup=None):
        """Register a session: a listening control socket and its login in /proc.

        Each call's session is strictly younger than the previous one. Age tests add sessions in
        non-alphabetical order so the oldest is not also the first by name.
        """
        path = registry.control_socket_path(self.runtime_dir, session_id, login_pid)
        sock = listening_socket(path)
        self.addCleanup(sock.close)
        self.proc.add_process(login_pid, cgroup=cgroup or SERVICE_CGROUP)
        self.wait_for_the_clock_to_move(os.stat(path).st_ctime)
        return sock

    def wait_for_the_clock_to_move(self, past):
        """Wait until a file created now would have a ctime strictly newer than `past`."""
        probe = os.path.join(self.root, "clock-probe")
        deadline = time.monotonic() + CLOCK_MOVE_TIMEOUT
        while True:
            with open(probe, "w", encoding="utf-8"):
                pass
            created = os.stat(probe).st_ctime
            os.unlink(probe)
            if created > past:
                return
            self.assertLess(time.monotonic(), deadline, "the clock of the filesystem stood still")
            time.sleep(CLOCK_STEP)

    def add_orphan_socket(self, session_id, login_pid):
        """A dead session's leftover: a socket nobody listens on."""
        abandoned_socket(registry.control_socket_path(self.runtime_dir, session_id, login_pid))
        self.proc.add_process(login_pid)

    def hold_apt_lock(self, pid, cgroup):
        """Make `pid` in `cgroup` hold the apt lock."""
        self.proc.add_process(pid, cgroup=cgroup)
        self.proc.write_locks([(pid, self.lock_path)])
