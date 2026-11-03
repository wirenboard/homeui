import argparse
import grp
import logging
import os
import signal
import socket
import stat
import struct
import subprocess  # nosec B404 - systemd-run starts the session units
import threading
import time
from typing import List, Optional

from . import registry
from .registry import (
    DEBUG_OPTION,
    GO_BYTE,
    KILL_POLL_INTERVAL,
    LOG_FORMAT,
    SessionEntry,
    choose_victim,
    close_quietly,
    connect_session,
    find_session,
    list_sessions,
    new_session_id,
    send_fd,
    unlink_quietly,
)
from .websocket import client_address, peek_request, requested_session

LISTEN_SOCKET_PATH = "/tmp/wb-homeui-terminal.socket"  # nosec B108 - the address nginx proxies to

MAX_SESSIONS = 5
MAX_CONNECTIONS = 2 * MAX_SESSIONS

EVICTION_TIMEOUT = 3.0

LISTEN_BACKLOG = 16

# Anyone who can write to the socket gets a console, so only nginx (www-data) may.
LISTEN_SOCKET_GROUP = "www-data"
LISTEN_SOCKET_MODE = stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IWGRP

OWN_UNIT_NAME = "wb-terminal-session-{}.service"
OWN_UNIT_SLICE = "system.slice"
OWN_UNIT_DESCRIPTION = "Wiren Board web terminal session {}"
SYSLOG_IDENTIFIER = "wb-terminal-server"
SYSTEMD_RUN_PATH = "/usr/bin/systemd-run"
SESSION_ENTRY_POINT = "/usr/bin/wb-terminal-session"

START_TIMEOUT = 20
START_TIMEOUT_MARGIN = 5


def restrict_to_nginx(path: str) -> None:
    os.chown(path, -1, grp.getgrnam(LISTEN_SOCKET_GROUP).gr_gid)
    os.chmod(path, LISTEN_SOCKET_MODE)


def peer_pid(sock) -> int:
    pid, _uid, _gid = struct.unpack(
        "3i", sock.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, struct.calcsize("3i"))
    )
    return pid


def unit_command(session_id: str, remote_addr: str, debug: bool = False) -> List[str]:
    return [
        SYSTEMD_RUN_PATH,
        "--quiet",
        f"--unit={OWN_UNIT_NAME.format(session_id)}",
        f"--slice={OWN_UNIT_SLICE}",
        "--collect",
        f"--description={OWN_UNIT_DESCRIPTION.format(session_id)}",
        "--property=Type=notify",
        "--property=NotifyAccess=main",
        f"--property=TimeoutStartSec={START_TIMEOUT}",
        f"--property=SyslogIdentifier={SYSLOG_IDENTIFIER}",
        "--",
        SESSION_ENTRY_POINT,
        *([DEBUG_OPTION] if debug else []),
        session_id,
        remote_addr,
    ]


class TerminalListener:
    def __init__(self, socket_path: Optional[str] = None, debug: bool = False):
        self._socket_path = socket_path or LISTEN_SOCKET_PATH
        self._debug = debug
        self._server: Optional[socket.socket] = None

    def start(self) -> None:
        os.makedirs(registry.RUNTIME_DIR, mode=0o700, exist_ok=True)
        unlink_quietly(self._socket_path)
        self._server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self._server.bind(self._socket_path)
        restrict_to_nginx(self._socket_path)
        self._server.listen(LISTEN_BACKLOG)

    def serve_forever(self) -> None:
        threads = []
        while True:
            conn, _addr = self._server.accept()
            threads = [thread for thread in threads if thread.is_alive()]
            if len(threads) >= MAX_CONNECTIONS:
                logging.warning("Too many terminal connections, dropping one")
                close_quietly(conn)
                continue
            thread = threading.Thread(target=self._serve_connection, args=(conn,), daemon=True)
            thread.start()
            threads.append(thread)

    def close(self) -> None:
        if self._server is not None:
            close_quietly(self._server)
        unlink_quietly(self._socket_path)

    # --- Hooks for subclasses ---

    def start_unit(self, session_id: str, remote_addr: str) -> bool:
        try:
            subprocess.run(  # nosec B603 - fixed argv, no shell
                unit_command(session_id, remote_addr, self._debug),
                timeout=START_TIMEOUT + START_TIMEOUT_MARGIN,
                check=True,
            )
        except (OSError, subprocess.SubprocessError) as error:
            logging.error("Terminal session %s did not start: %s", session_id, error)
            return False
        return True

    # --- Private ---

    def _serve_connection(self, conn) -> None:
        try:
            self._handle_connection(conn)
        except Exception as error:  # pylint: disable=broad-exception-caught  # keep serving others
            logging.error("Failed to serve a terminal connection: %s", error)
        finally:
            close_quietly(conn)

    def _handle_connection(self, conn) -> None:
        request = peek_request(conn)
        if request is None:
            return
        if "websocket" not in (value.lower() for value in request.headers.get_all("Upgrade")):
            return
        requested = requested_session(request)
        entry = find_session(requested) if requested else None
        if entry is not None and send_fd(entry.path, conn.fileno()):
            return
        self._make_room()
        self._start_and_hand_over(conn, client_address(request))

    def _make_room(self) -> None:
        sessions = list_sessions()
        if len(sessions) < MAX_SESSIONS:
            return
        victim = choose_victim(sessions)
        if victim is not None:
            self._evict(victim)

    def _start_and_hand_over(self, conn, remote_addr: str) -> None:
        session_id = new_session_id()
        if not self.start_unit(session_id, remote_addr):
            return
        logging.info("Started terminal session %s", session_id)
        entry = find_session(session_id)
        if entry is None or not send_fd(entry.path, conn.fileno()):
            logging.error("Terminal session %s started, but its socket is not there", session_id)

    def _evict(self, entry: SessionEntry) -> None:
        order = connect_session(entry.path)
        if order is None:
            return
        with order:
            pid = peer_pid(order)
            try:
                order.sendall(GO_BYTE)
            except OSError:
                return
        logging.info("Evicting terminal session %s (process %d)", entry.session_id, pid)
        deadline = time.monotonic() + EVICTION_TIMEOUT
        while os.path.exists(entry.path) and time.monotonic() < deadline:
            time.sleep(KILL_POLL_INTERVAL)
        if os.path.exists(entry.path):
            logging.warning("Terminal session %s did not go, killing it", entry.session_id)
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass
            unlink_quietly(entry.path)


def run() -> int:
    parser = argparse.ArgumentParser(description="Web terminal server")
    parser.add_argument("--debug", action="store_true", help="Log debug messages")
    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO, format=LOG_FORMAT)
    listener = TerminalListener(debug=args.debug)
    listener.start()
    logging.info("Terminal server listening on %s", LISTEN_SOCKET_PATH)
    try:
        listener.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        listener.close()
    return 0
