"""The listener-session contract, and the /proc helpers both processes use.

The runtime directory is the registry: one control socket per session, ``<id>.<login_pid>.sock``.
The socket carries either a client's descriptor (SCM_RIGHTS) or a bare GO_BYTE, the order to exit.
That is all a listener of any package version needs to serve a session of any other version.
"""

import errno
import logging
import os
import re
import secrets
import socket
import stat
from dataclasses import dataclass
from typing import List, Optional, Sequence, Set, Tuple

# Read at call time so tests can point them at a temp tree.
RUNTIME_DIR = "/run/wb-terminal-server"
PROC_DIR = "/proc"

SESSION_ID_BYTES = 16
SESSION_ID_RE = re.compile(rf"[0-9a-f]{{{2 * SESSION_ID_BYTES}}}")

LOG_FORMAT = "%(asctime)s %(levelname)s %(message)s"
DEBUG_OPTION = "--debug"

SOCKET_NAME_RE = re.compile(rf"^(?P<session_id>{SESSION_ID_RE.pattern})\.(?P<login_pid>[1-9][0-9]*)\.sock$")

TRANSFER_TIMEOUT = 2.0
CONTROL_BACKLOG = 4
GO_BYTE = b"\0"

KILL_POLL_INTERVAL = 0.05

# A session holding one of these is never evicted. apt's lists/ and archives/ locks are left out:
# interrupting `apt update` or a download breaks nothing, interrupting dpkg does.
APT_LOCK_PATHS = (
    "/var/lib/dpkg/lock",
    "/var/lib/dpkg/lock-frontend",
)

LOGIND_SCOPE_RE = re.compile(r"/(session-[^/]+\.scope)(?:/|$)")


@dataclass(frozen=True)
class SessionEntry:
    session_id: str
    login_pid: int
    path: str
    created_at: float


@dataclass(frozen=True)
class ControlMessage:
    fd: Optional[int] = None
    go: bool = False


def close_quietly(closeable) -> None:
    try:
        closeable.close()
    except OSError:
        pass


def unlink_quietly(path: str) -> None:
    try:
        os.unlink(path)
    except OSError:
        pass


def control_socket_path(runtime_dir: str, session_id: str, login_pid: int) -> str:
    return os.path.join(runtime_dir, f"{session_id}.{login_pid}.sock")


def new_session_id() -> str:
    return secrets.token_hex(SESSION_ID_BYTES)


def list_sessions() -> List[SessionEntry]:
    try:
        names = os.listdir(RUNTIME_DIR)
    except OSError:
        return []
    sessions = []
    for name in names:
        found = SOCKET_NAME_RE.match(name)
        if not found:
            continue
        path = os.path.join(RUNTIME_DIR, name)
        try:
            created_at = os.stat(path).st_ctime
        except OSError:
            continue
        sessions.append(
            SessionEntry(found.group("session_id"), int(found.group("login_pid")), path, created_at)
        )
    return sorted(sessions, key=lambda entry: (entry.created_at, entry.session_id))


def find_session(session_id: str) -> Optional[SessionEntry]:
    for entry in list_sessions():
        if entry.session_id == session_id:
            return entry
    return None


def control_socket(session_id: str, login_pid: int) -> socket.socket:
    """The directory is created by the listener's unit (RuntimeDirectory=), not here."""
    path = control_socket_path(RUNTIME_DIR, session_id, login_pid)
    unlink_quietly(path)
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.bind(path)
    os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)
    sock.listen(CONTROL_BACKLOG)
    sock.setblocking(False)
    return sock


def connect_session(socket_path: str) -> Optional[socket.socket]:
    """Only a refused connection means the session is gone; a timeout or a full backlog does not."""
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.settimeout(TRANSFER_TIMEOUT)
    try:
        sock.connect(socket_path)
    except OSError as error:
        sock.close()
        if error.errno == errno.ECONNREFUSED:
            logging.info("Removing %s, its session is gone", socket_path)
            unlink_quietly(socket_path)
        return None
    return sock


def send_fd(socket_path: str, fd: int) -> bool:
    sender = connect_session(socket_path)
    if sender is None:
        return False
    with sender:
        try:
            socket.send_fds(sender, [GO_BYTE], [fd])
        except OSError:
            return False
    return True


def receive_control_message(conn) -> ControlMessage:
    """A truncated descriptor (MSG_CTRUNC) is neither a client nor an order to go."""
    conn.settimeout(TRANSFER_TIMEOUT)
    try:
        data, fds, flags, _addr = socket.recv_fds(conn, len(GO_BYTE), 1)
    except OSError:
        return ControlMessage()
    if fds:
        # Otherwise anything the session starts inherits the descriptor and keeps the client's
        # connection open after the session lets go of it. recv_fds ignores its flags argument,
        # so MSG_CMSG_CLOEXEC does not work.
        os.set_inheritable(fds[0], False)
        return ControlMessage(fd=fds[0])
    return ControlMessage(go=data == GO_BYTE and not flags & socket.MSG_CTRUNC)


def read_proc(*parts: str) -> str:
    try:
        with open(os.path.join(PROC_DIR, *parts), "r", encoding="utf-8", errors="replace") as proc_file:
            return proc_file.read()
    except OSError:
        return ""


def process_cgroup(pid: int) -> str:
    # cgroup v2 ("0::") or the v1 name=systemd hierarchy.
    for line in read_proc(str(pid), "cgroup").splitlines():
        parts = line.split(":", 2)
        if len(parts) == 3 and parts[1] in ("", "name=systemd"):
            return parts[2]
    return ""


def session_scope(pid: int) -> Optional[str]:
    found = LOGIND_SCOPE_RE.search(process_cgroup(pid))
    return found.group(1) if found else None


def apt_lock_holders() -> List[int]:
    """A /proc/locks line: `id: TYPE ADVISORY READ|WRITE PID MAJ:MIN:INODE START END`.
    A blocked waiter has `->` after the id, which shifts every field; waiters are skipped.
    """
    ids = _lock_file_ids()
    if not ids:
        return []
    holders = []
    for line in read_proc("locks").splitlines():
        fields = line.split()
        if len(fields) < 6 or fields[1] == "->":
            continue
        try:
            major, minor, inode = fields[5].split(":")
            key = (int(major, 16), int(minor, 16), int(inode))
            holder = int(fields[4])
        except ValueError:
            continue
        if key in ids and holder > 0:
            holders.append(holder)
    return holders


def session_holds_apt_lock(login_pid: int) -> bool:
    scope = session_scope(login_pid)
    if scope is None:
        return False
    return any(session_scope(pid) == scope for pid in apt_lock_holders())


def choose_victim(sessions: Sequence[SessionEntry]) -> Optional[SessionEntry]:
    for entry in sessions:
        if not session_holds_apt_lock(entry.login_pid):
            return entry
    return None


def _lock_file_ids() -> Set[Tuple[int, int, int]]:
    ids = set()
    for path in APT_LOCK_PATHS:
        try:
            info = os.stat(path)
        except OSError:
            continue
        ids.add((os.major(info.st_dev), os.minor(info.st_dev), info.st_ino))
    return ids
