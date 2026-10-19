"""Shared base for the opt-in integration tests against the installed terminal service.

Only what needs real systemd, dpkg and login lives here: a service restart under a running
command, and installing the terminal's own package (including a rollback to a build from before
session processes) from the console it serves.

The tests restart the service and run maintainer scripts, so they are skipped unless
``WB_TERMINAL_INTEGRATION=1`` is set, run as root, and ``wb-terminal-server`` is installed.
Run on a stand, never on a controller in use::

    WB_TERMINAL_INTEGRATION=1 WB_TERMINAL_PASSWORD=<root password> \\
        .venv/bin/pytest tests/integration -v

Environment:

======================== =======================================================================
``WB_TERMINAL_INTEGRATION`` ``1`` enables the tests
``WB_TERMINAL_USER``        who to log in as, ``root`` by default
``WB_TERMINAL_PASSWORD``    that user's password; tests that need a shell are skipped without it
``WB_TERMINAL_DEB``         a .deb to install from inside a console
``WB_TERMINAL_DEB_LEGACY``  a build from before session processes, for the rollback test
======================== =======================================================================
"""

import base64
import os
import socket
import subprocess  # nosec B404 - runs systemctl and dpkg
import time
import unittest
from typing import Optional, Tuple

from tests.terminal_helpers import FakeBrowser
from wb.homeui_backend.terminal import listener, websocket

SERVICE = "wb-terminal-server"
ENABLED = os.environ.get("WB_TERMINAL_INTEGRATION") == "1"
USER = os.environ.get("WB_TERMINAL_USER", "root")
PASSWORD = os.environ.get("WB_TERMINAL_PASSWORD")
PACKAGE = "wb-homeui-backend"

SOCKET_TIMEOUT = 10.0
# login flushes the terminal while checking the password, so input typed before the shell is up
# can be lost.
SHELL_START_SECONDS = 2.0
# Split in two so the echoed command line does not match.
DONE_MARKER = "WB-DO" + "NE-"
EXIT_TIMEOUT = 10.0


def systemctl(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(  # nosec B603, B607 - fixed argv, no shell
        ["systemctl", *args], capture_output=True, text=True, check=False
    )


def service_installed() -> bool:
    try:
        return systemctl("cat", SERVICE).returncode == 0
    except OSError:  # no systemd, e.g. a workstation
        return False


class Console:
    """A browser connected to the terminal socket."""

    def __init__(self, session_id: Optional[str] = None):
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(SOCKET_TIMEOUT)
        sock.connect(listener.LISTEN_SOCKET_PATH)
        self.browser = FakeBrowser(sock=sock, session_id=session_id)
        self._session_id: Optional[str] = None
        self._logged_in = False

    @property
    def close_code(self) -> Optional[int]:
        """Close code from the session; None while the connection is open."""
        self.browser.messages(0.2)
        return self.browser.close_code

    def session_id(self, timeout: float = 10.0) -> str:
        """The session id announced on this connection (cached)."""
        if self._session_id is None:
            message = self.browser.message_of_type("session", timeout)
            assert message is not None, "the session never announced itself"
            self._session_id = message["id"]
        return self._session_id

    def type(self, text: str) -> None:
        self.browser.send({"type": "input", "data": base64.b64encode(text.encode()).decode("ascii")})

    def wait_for(self, needle: str, timeout: float = 30.0) -> str:
        """Read output until `needle` appears; returns everything read."""
        text = self.browser.output_until(needle, timeout)
        assert needle in text, f"{needle!r} never came; the last output was {text[-500:]!r}"
        return text

    def log_in(self, user: str = USER, password: Optional[str] = PASSWORD) -> None:
        """Log in at the `login:` prompt and wait for the shell."""
        self.wait_for("login:")
        self.type(f"{user}\n")
        self.wait_for("assword")
        self.type(f"{password}\n")
        time.sleep(SHELL_START_SECONDS)
        code, text = self.run("true")
        assert code == 0, f"the shell did not come up: {text!r}"
        self._logged_in = True

    def run(self, command: str, timeout: float = 60.0) -> Tuple[int, str]:
        """Run a command in the shell; returns its exit code and the output."""
        self.type(f'{command}; echo WB-DO"NE"-$?\n')
        text = self.wait_for(DONE_MARKER, timeout)
        return int(text.split(DONE_MARKER)[-1].split()[0]), text

    def start_in_background(self, command: str) -> None:
        """Type a command without waiting for it to finish."""
        self.type(f"{command}\n")

    def close(self) -> None:
        """Type `exit` and wait for close code 1000; otherwise just disconnect.

        At the `login:` prompt `exit` would be taken as a user name; login times out on its own.
        """
        if self.browser.sock.fileno() == -1:  # already disconnected
            return
        if self._logged_in and self.browser.close_code is None:
            try:
                self.type("exit\n")
            except OSError:
                pass
            deadline = time.monotonic() + EXIT_TIMEOUT
            while self.close_code is None and time.monotonic() < deadline:
                pass
            assert self.close_code == websocket.CloseCode.SESSION_FINISHED, "exit did not end the session"
        self.browser.disconnect()


def listener_answers() -> bool:
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as probe:
        try:
            probe.connect(listener.LISTEN_SOCKET_PATH)
        except OSError:
            return False
    return True


@unittest.skipUnless(ENABLED, "set WB_TERMINAL_INTEGRATION=1 to run against the installed service")
@unittest.skipUnless(os.geteuid() == 0, "needs root to drive systemd")
@unittest.skipUnless(service_installed(), f"{SERVICE} is not installed")
class IntegrationTestCase(unittest.TestCase):
    """Starts the service; consoles opened by a test are closed after it."""

    def setUp(self):
        self.assertEqual(systemctl("start", SERVICE).returncode, 0)
        # Type=simple: start returns before the socket is bound, or while a killed unit waits
        # out RestartSec with a stale socket file.
        deadline = time.monotonic() + 15
        while not listener_answers():
            self.assertLess(time.monotonic(), deadline, "the listener never came up")
            time.sleep(0.2)
        self.consoles = []
        self.addCleanup(self.close_consoles)

    def open_console(self, session_id: Optional[str] = None) -> Console:
        console = Console(session_id)
        self.consoles.append(console)
        return console

    def logged_in_console(self) -> Console:
        console = self.open_console()
        console.session_id()
        console.log_in()
        return console

    def close_consoles(self) -> None:
        for console in self.consoles:
            console.close()

    def assert_still_open(self, console: Console) -> None:
        """No close frame and no EOF."""
        self.assertIsNone(console.close_code)
