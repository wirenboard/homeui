"""The listener and real session processes: a PTY, a shell, descriptor passing, the registry.

Faked: `login` is a script that starts a bare shell, the cgroup lookup always reports a logind
scope, and the test plays systemd-run -- it starts `run_session` in a new interpreter and waits
for READY=1 on its own NOTIFY_SOCKET.
"""

import base64
import os
import select
import signal
import socket
import subprocess  # nosec B404 - starts real session processes
import sys
import threading
import time
import unittest

from tests.terminal_helpers import (
    SESSION_SCOPE,
    FakeBrowser,
    TerminalTestBase,
    session_ids,
)
from wb.homeui_backend.terminal import listener, registry, session, websocket

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Applies the test's patches inside the session process, then runs the real entry point.
# With LOGIN_PID_FILE set, the login pid is written there.
SESSION_LAUNCHER = """
import os
import sys
sys.path.insert(0, sys.argv[1])
from wb.homeui_backend.terminal import login, registry, session
login.LOGIN_PATH, registry.RUNTIME_DIR, registry.PROC_DIR = sys.argv[2:5]
registry.APT_LOCK_PATHS = (sys.argv[5],)
registry.process_cgroup = lambda pid: sys.argv[6]
start_login = session.start_login
def recorded_login(remote_addr):
    pty = start_login(remote_addr)
    with open(os.environ["LOGIN_PID_FILE"], "w", encoding="utf-8") as pid_file:
        pid_file.write(str(pty.login_pid))
    return pty
if "LOGIN_PID_FILE" in os.environ:
    session.start_login = recorded_login
sys.exit(session.run_session(sys.argv[7:]))
"""

FAKE_LOGIN = (
    "#!/bin/sh\n"
    "# stands in for /bin/login: no password, just a shell\n"
    "exec 2>&1\n"
    "/bin/bash --norc --noprofile -i\n"
)

READY_TIMEOUT = 30.0
NEW_ID = "c0ffee00" * 4


def read_proc_file(pid, name):
    with open(f"/proc/{pid}/{name}", "rb") as proc_file:
        return proc_file.read().replace(b"\0", b" ").decode("utf-8", "replace")


def process_gone(pid):
    """No such process, or a zombie: orphans may not be reaped promptly."""
    try:
        state = read_proc_file(pid, "stat").rsplit(")", 1)[1].split()[0]
    except OSError:
        return True
    return state in ("Z", "X")


class TrackingListener(listener.TerminalListener):
    """A listener that plays systemd-run itself and remembers the sessions it started.

    The start succeeds when the session sends READY=1, and fails if it exits first.
    """

    def __init__(self, socket_path, launcher_args, notify_dir):
        super().__init__(socket_path)
        self.children = []
        self.launcher_args = launcher_args
        self.notify_dir = notify_dir

    def start_unit(self, session_id, remote_addr):
        command = listener.unit_command(session_id, remote_addr)
        entry_args = command[command.index(listener.SESSION_ENTRY_POINT) + 1 :]
        notify_path = os.path.join(self.notify_dir, f"notify-{session_id}")
        with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as notify:
            notify.bind(notify_path)
            child = subprocess.Popen(  # pylint: disable=consider-using-with  # outlives this call
                [  # nosec B603 - fixed argv, no shell
                    sys.executable,
                    "-c",
                    SESSION_LAUNCHER,
                    *self.launcher_args,
                    *entry_args,
                ],
                env={**os.environ, session.NOTIFY_SOCKET_ENV: notify_path},
            )
            self.children.append(child)
            deadline = time.monotonic() + READY_TIMEOUT
            while time.monotonic() < deadline and child.poll() is None:
                ready, _writable, _failed = select.select([notify], [], [], 0.1)
                if ready:
                    return notify.recv(64) == session.READY_MESSAGE
            return False


@unittest.skipUnless(os.path.exists("/bin/bash"), "needs a shell to stand in for the login shell")
class EndToEndTest(TerminalTestBase):
    def setUp(self):
        super().setUp()
        login_path = os.path.join(self.root, "fake-login")
        with open(login_path, "w", encoding="utf-8") as login_file:
            login_file.write(FAKE_LOGIN)
        os.chmod(login_path, 0o755)

        self.patch(registry, "process_cgroup", lambda pid: SESSION_SCOPE.format(1))

        launcher_args = [
            BACKEND_DIR,
            login_path,
            self.runtime_dir,
            self.proc.root,
            self.lock_path,
            SESSION_SCOPE.format(1),
        ]
        self.listener = TrackingListener(os.path.join(self.root, "listen.sock"), launcher_args, self.root)
        self.listener.start()
        self.addCleanup(self.stop_everything)
        thread = threading.Thread(target=self.serve, daemon=True)
        thread.start()

    def serve(self):
        try:
            self.listener.serve_forever()
        except OSError:
            pass

    def stop_everything(self):
        self.listener.close()
        for child in self.listener.children:
            child.kill()
            child.wait()

    def open_console(self, session_id=None):
        """Connect to the listener socket and start the websocket handshake."""
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(os.path.join(self.root, "listen.sock"))
        self.addCleanup(sock.close)
        return FakeBrowser(sock=sock, session_id=session_id)

    def wait_for_session(self, browser, timeout=5.0):
        message = browser.message_of_type("session", timeout)
        self.assertIsNotNone(message, "the session never announced itself")
        return message["id"]

    def test_a_session_runs_a_command_and_survives_a_reload(self):
        """A session runs a command, the tab reloads, and reconnecting with the id replays the output."""
        first = self.open_console()
        session_id = self.wait_for_session(first)
        self.assertRegex(session_id, "^[0-9a-f]{32}$")
        self.assertEqual(session_ids(), [session_id])

        first.send({"type": "input", "data": base64.b64encode(b"echo done-here\n").decode("ascii")})
        self.assertIn("done-here", first.output_until("done-here", 5.0))

        first.disconnect()  # page reload: no close frame
        second = self.open_console(session_id)
        self.assertEqual(self.wait_for_session(second), session_id)
        self.assertIn("done-here", second.output_until("done-here", 5.0))

    def test_duplicating_the_tab_moves_the_session_to_the_duplicate(self):
        """A second connection with the same id takes the session; the first is closed with 4001."""
        first = self.open_console()
        session_id = self.wait_for_session(first)

        second = self.open_console(session_id)
        self.assertEqual(self.wait_for_session(second), session_id)
        first.messages(1.0)
        self.assertEqual(first.close_code, int(websocket.CloseCode.TAKEN_OVER))

    def test_exit_in_the_shell_ends_the_session(self):
        """`exit` in the shell ends login; the session closes with 1000 and leaves the registry."""
        browser = self.open_console()
        session_id = self.wait_for_session(browser)
        browser.send({"type": "input", "data": base64.b64encode(b"exit\n").decode("ascii")})

        self.assertEqual(self.wait_for_empty_registry(), [])
        browser.messages(0.5)
        self.assertEqual(browser.close_code, int(websocket.CloseCode.SESSION_FINISHED))
        self.assertFalse(any(name.startswith(session_id) for name in os.listdir(self.runtime_dir)))

    def test_sigterm_ends_the_session_cleanly(self):
        """SIGTERM (`systemctl stop` of the unit): close 1000 to the client, leave the registry, exit 0.

        Close code 1000 makes the tab show the session as finished instead of reconnecting.
        """
        browser = self.open_console()
        session_id = self.wait_for_session(browser)
        child = self.listener.children[0]

        child.send_signal(signal.SIGTERM)

        self.assertEqual(child.wait(timeout=10.0), 0)
        browser.messages(0.5)
        self.assertEqual(browser.close_code, int(websocket.CloseCode.SESSION_FINISHED))
        self.assertEqual(session_ids(), [])
        self.assertFalse(any(name.startswith(session_id) for name in os.listdir(self.runtime_dir)))

    def test_a_session_systemd_cannot_be_told_about_fails_and_leaves_nothing(self):
        """With nobody on $NOTIFY_SOCKET the session exits with 1, leaving no socket and no login."""
        pid_path = os.path.join(self.root, "login.pid")
        result = subprocess.run(  # nosec B603 - fixed argv, no shell
            [sys.executable, "-c", SESSION_LAUNCHER, *self.listener.launcher_args, NEW_ID, "10.0.0.5"],
            env={
                **os.environ,
                session.NOTIFY_SOCKET_ENV: os.path.join(self.root, "nobody-listens"),
                "LOGIN_PID_FILE": pid_path,
            },
            capture_output=True,
            timeout=READY_TIMEOUT,
            check=False,
        )

        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual([name for name in os.listdir(self.runtime_dir) if name.startswith(NEW_ID)], [])
        with open(pid_path, encoding="utf-8") as pid_file:
            login_pid = int(pid_file.read())
        deadline = time.monotonic() + 5.0
        while not process_gone(login_pid) and time.monotonic() < deadline:
            time.sleep(0.05)
        self.assertTrue(process_gone(login_pid), f"login {login_pid} outlived its session")

    def wait_for_empty_registry(self, timeout=5.0):
        deadline = time.monotonic() + timeout
        while session_ids() and time.monotonic() < deadline:
            time.sleep(0.05)
        return session_ids()
