"""The session process, a systemd service of its own.

Everything it will ever run is imported here at module level, at start-up: an upgrade replaces
the package files under a running session, and a later import would mix the new version into
the old one.
"""

import argparse
import base64
import binascii
import fcntl
import logging
import os
import re
import select
import signal
import socket
import struct
import termios
import time
from functools import partial
from typing import Callable, Dict, List, Optional, Sequence

from .login import PtyProcess, login_alive, start_login, valid_window_size
from .registry import (
    DEBUG_OPTION,
    KILL_POLL_INTERVAL,
    LOG_FORMAT,
    SESSION_ID_RE,
    apt_lock_holders,
    close_quietly,
    control_socket,
    list_sessions,
    process_cgroup,
    receive_control_message,
    session_holds_apt_lock,
    session_scope,
    unlink_quietly,
)
from .websocket import (
    READ_CHUNK,
    ClientGone,
    ClientMessageType,
    CloseCode,
    NoticeKind,
    ServerMessageType,
    WebSocketClient,
)

DISCONNECTED_SECONDS = 3600
OUTPUT_BUFFER_BYTES = 256 * 1024
PENDING_INPUT_BYTES = 256 * 1024

POLL_INTERVAL = 0.5


USER_SLICE_RE = re.compile(r"/(user-\d+\.slice)/")

NOTIFY_SOCKET_ENV = "NOTIFY_SOCKET"
READY_MESSAGE = b"READY=1"


def session_user(pid: int) -> Optional[str]:
    found = USER_SLICE_RE.search(process_cgroup(pid))
    return found.group(1) if found else None


def apt_lock_owner(session_id: str, login_pid: int) -> Optional[str]:
    """The id of another console session that is installing packages, if this one may see it."""
    holders = apt_lock_holders()
    if not holders:
        return None
    scope = session_scope(holders[0])
    if scope is None:
        return None
    for entry in list_sessions():
        if session_scope(entry.login_pid) != scope:
            continue
        if entry.session_id == session_id or session_user(login_pid) != session_user(entry.login_pid):
            return None
        return entry.session_id
    return None


class TerminalSession:  # pylint: disable=too-many-instance-attributes
    def __init__(self, session_id: str, pty_process: PtyProcess):
        self.session_id = session_id
        self._pty = pty_process
        os.set_blocking(pty_process.master_fd, False)
        self._logged_in = False
        self._disconnected_at: Optional[float] = time.monotonic()
        self._had_client = False
        self._stop_code: Optional[CloseCode] = None
        self._output = bytearray()
        self._pending_input = bytearray()
        self._client: Optional[WebSocketClient] = None
        self._control = control_socket(session_id, pty_process.login_pid)
        self._control_path = self._control.getsockname()
        self._stop_requested = False

    @property
    def running(self) -> bool:
        return self._stop_code is None

    @property
    def logged_in(self) -> bool:
        return self._logged_in

    @property
    def connected(self) -> bool:
        return self._client is not None

    def attach(self, sock) -> bool:
        self._close_client(CloseCode.TAKEN_OVER, "the session moved to another window")
        client = WebSocketClient.accept(sock)
        if client is None:
            return False
        self._client = client
        self._had_client = True
        self._disconnected_at = None
        self._send({"type": ServerMessageType.SESSION.value, "id": self.session_id})
        if self._output:
            self._send_output(bytes(self._output))
        self._send_notice()
        return self._client is not None

    def request_stop(self) -> None:
        self._stop_requested = True

    def poll(self, timeout: float = 0.0) -> bool:
        if self._stop_requested:
            self.stop(CloseCode.SESSION_FINISHED, "the session was told to stop")
            return False
        for handler in self._ready_handlers(timeout):
            handler()
            if not self.running:
                return False
        self._update_state()
        if not self.running:
            return False
        self._check_deadline()
        return self.running

    def run(self) -> None:
        # `systemctl stop` sends SIGTERM; by default Python would die at once, leaving the socket
        # behind and the tab without a close code.
        signal.signal(signal.SIGTERM, lambda _signum, _frame: self.request_stop())
        try:
            notify_ready(os.environ.get(NOTIFY_SOCKET_ENV))
            while self.poll(POLL_INTERVAL):
                pass
        finally:
            self.stop(CloseCode.SESSION_FINISHED, "the session failed")

    def stop(self, code: CloseCode, reason: str = "") -> None:
        if self._stop_code is not None:
            return
        self._stop_code = code
        logging.info("Terminal session %s ended: %s (%d)", self.session_id, reason, int(code))
        self._close_client(code, reason)
        unlink_quietly(self._control_path)
        close_quietly(self._control)
        # Closing the master sends SIGHUP to login, the session leader; systemd cleans up the rest
        # of the unit's cgroup.
        self._close_pty()

    # --- Private ---

    def _ready_handlers(self, timeout: float) -> List[Callable[[], None]]:
        readers = {self._pty.master_fd: self._pump_pty, self._control.fileno(): self._accept_transfer}
        if self._client is not None:
            readers[self._client.fileno()] = partial(self._pump_client, self._client)
        writers = [self._pty.master_fd] if self._pending_input else []
        try:
            readable, writable, _failed = select.select(list(readers), writers, [], timeout)
        except (OSError, ValueError):
            return []
        handlers = [readers[fd] for fd in readable]
        if writable:
            handlers.append(self._flush_input)
        return handlers

    def _pump_pty(self) -> None:
        try:
            data = os.read(self._pty.master_fd, READ_CHUNK)
        except BlockingIOError:
            return
        except OSError:
            data = b""
        if not data:
            # EIO does not always mean that login has exited: at start login calls vhangup(), which closes
            # the terminal for a moment before login reopens it. The session ends only when login is gone;
            # meanwhile select keeps reporting the master as readable, so sleep instead of spinning.
            if login_alive(self._pty.login_pid):
                time.sleep(KILL_POLL_INTERVAL)
                return
            self._login_gone("the terminal was closed")
            return
        self._add_output(data)

    def _add_output(self, data: bytes) -> None:
        self._output += data
        del self._output[: max(0, len(self._output) - OUTPUT_BUFFER_BYTES)]
        self._send_output(data)

    def _pump_client(self, client: WebSocketClient) -> None:
        if client is not self._client:
            return
        try:
            messages = client.receive()
        except ClientGone as error:
            logging.info("Terminal session %s lost its client: %s", self.session_id, error)
            self._detach_client()
            return
        for message in messages:
            self._apply_client_message(message)

    def _apply_client_message(self, message: Dict) -> None:
        kind = message.get("type")
        if kind == ClientMessageType.INPUT.value:
            self._write_input(message.get("data"))
        elif kind == ClientMessageType.RESIZE.value:
            self._resize(message.get("cols"), message.get("rows"))

    def _write_input(self, encoded) -> None:
        if not isinstance(encoded, str):
            return
        try:
            data = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError):
            return
        if len(self._pending_input) + len(data) > PENDING_INPUT_BYTES:
            logging.warning(
                "Terminal session %s dropped %d bytes of input: the terminal is not taking it",
                self.session_id,
                len(data),
            )
            return
        self._pending_input += data
        self._flush_input()

    def _flush_input(self) -> None:
        try:
            del self._pending_input[: os.write(self._pty.master_fd, self._pending_input)]
        except BlockingIOError:
            pass
        except OSError as error:
            logging.warning("Terminal session %s cannot write to its PTY: %s", self.session_id, error)
            self._pending_input.clear()

    def _resize(self, cols, rows) -> None:
        if not valid_window_size(cols) or not valid_window_size(rows):
            return
        try:
            fcntl.ioctl(self._pty.master_fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
        except OSError:
            pass

    def _accept_transfer(self) -> None:
        try:
            conn, _addr = self._control.accept()
        except OSError:
            return
        with conn:
            message = receive_control_message(conn)
        if message.go:
            self.stop(CloseCode.SLOT_TAKEN, "the slot was given to another connection")
            return
        if message.fd is None:
            logging.warning(
                "Terminal session %s ignored a control connection with neither a client nor an order",
                self.session_id,
            )
            return
        sock = socket.socket(fileno=message.fd)
        if self.attach(sock):
            return
        close_quietly(sock)
        if not self._had_client:
            self.stop(CloseCode.SESSION_FINISHED, "the handshake with the first client failed")

    def _send(self, message: Dict) -> None:
        if self._client is None:
            return
        try:
            self._client.send(message)
        except ClientGone as error:
            logging.info("Terminal session %s lost its client: %s", self.session_id, error)
            self._detach_client()

    def _send_output(self, data: bytes) -> None:
        self._send({"type": ServerMessageType.OUTPUT.value, "data": base64.b64encode(data).decode("ascii")})

    def _send_notice(self) -> None:
        if not self._logged_in:
            return
        owner = apt_lock_owner(self.session_id, self._pty.login_pid)
        if owner is not None:
            self._send(
                {"type": ServerMessageType.NOTICE.value, "kind": NoticeKind.APT_LOCK.value, "session": owner}
            )

    def _close_client(self, code: CloseCode, reason: str) -> None:
        if self._client is None:
            return
        self._client.close(code, reason)
        self._detach_client()

    def _detach_client(self) -> None:
        self._client.drop()
        self._client = None
        self._disconnected_at = time.monotonic()

    def _update_state(self) -> None:
        if not login_alive(self._pty.login_pid):
            self._login_gone("login finished")
            return
        if self._logged_in:
            return
        if (scope := session_scope(self._pty.login_pid)) is not None:
            self._logged_in = True
            logging.info("Terminal session %s logged in, %s", self.session_id, scope)
            self._send_notice()

    def _login_gone(self, reason: str) -> None:
        self._read_last_output()
        self.stop(CloseCode.SESSION_FINISHED, reason)

    def _read_last_output(self) -> None:
        while True:
            try:
                data = os.read(self._pty.master_fd, READ_CHUNK)
            except OSError:
                return
            if not data:
                return
            self._add_output(data)

    def _check_deadline(self) -> None:
        if self._client is not None:
            return
        if time.monotonic() - self._disconnected_at < DISCONNECTED_SECONDS:
            return
        if session_holds_apt_lock(self._pty.login_pid):
            return
        self.stop(CloseCode.SESSION_FINISHED, "nobody came back for the session")

    def _close_pty(self) -> None:
        try:
            os.close(self._pty.master_fd)
        except OSError:
            pass


def notify_ready(address: Optional[str]) -> None:
    if not address:
        return
    if address.startswith("@"):
        address = "\0" + address[1:]
    with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as sock:
        sock.sendto(READY_MESSAGE, address)


def valid_session_id(value: str) -> str:
    if not SESSION_ID_RE.fullmatch(value):
        raise argparse.ArgumentTypeError(f"not a session id: {value!r}")
    return value


def parse_session_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="wb-terminal-session", description="Web terminal session")
    parser.add_argument(DEBUG_OPTION, action="store_true", help="Log debug messages")
    parser.add_argument("session_id", type=valid_session_id, help="Session id")
    parser.add_argument("remote_addr", help="Client address, from X-Real-IP")
    return parser.parse_args(argv)


def run_session(argv: Sequence[str]) -> int:
    args = parse_session_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO, format=LOG_FORMAT)
    try:
        TerminalSession(args.session_id, start_login(args.remote_addr)).run()
    except Exception:  # pylint: disable=broad-exception-caught  # log any failure to the journal
        logging.exception("Terminal session %s failed", args.session_id)
        return 1
    return 0
