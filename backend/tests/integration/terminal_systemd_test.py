"""A service restart under a running command must not disturb the console.

Opt-in, see `tests/integration/console.py`; also needs `WB_TERMINAL_PASSWORD`.
"""

import re
import time
import unittest

from tests.integration.console import (
    EXIT_TIMEOUT,
    PASSWORD,
    SERVICE,
    IntegrationTestCase,
    systemctl,
)
from tests.terminal_helpers import session_ids
from wb.homeui_backend.terminal import websocket

# Split in two so the echoed command line does not match.
TICK_PREFIX = "WB-TI"
TICK_SUFFIX = "CK-"
TICK_MARKER = TICK_PREFIX + TICK_SUFFIX
TICK_RE = re.compile(re.escape(TICK_MARKER) + r"(\d+)")
TICK_SECONDS = 0.2


class TerminalServiceTest(IntegrationTestCase):
    @unittest.skipUnless(PASSWORD, "set WB_TERMINAL_PASSWORD: the running command needs a shell")
    def test_a_restart_goes_unnoticed_by_the_console(self):
        """A counter keeps printing on the same websocket across a service restart, and the new
        listener hands a reconnect with that id to the same session."""
        console = self.logged_in_console()
        session_id = console.session_id()
        console.start_in_background(
            f'i=0; while true; do i=$((i+1)); echo {TICK_PREFIX}"{TICK_SUFFIX}"$i; sleep {TICK_SECONDS}; done'
        )
        before = console.wait_for(f"{TICK_MARKER}3\r")

        self.assertEqual(systemctl("restart", SERVICE).returncode, 0)
        # Output printed while systemctl was running counts as before the restart.
        before += console.browser.output_until(f"{TICK_MARKER}never", TICK_SECONDS * 5)
        last_before = max(int(count) for count in TICK_RE.findall(before))
        console.wait_for(f"{TICK_MARKER}{last_before + 5}\r")
        self.assert_still_open(console)

        console.type("\x03")
        code, _text = console.run("true")
        self.assertEqual(code, 0)

        self.assertIn(session_id, session_ids())
        second = self.open_console(session_id)
        self.assertEqual(second.session_id(), session_id)
        self.assertEqual(console.close_code, websocket.CloseCode.TAKEN_OVER)

        # The same shell, now in the second console.
        second.type("exit\n")
        deadline = time.monotonic() + EXIT_TIMEOUT
        while second.close_code is None and time.monotonic() < deadline:
            pass
        self.assertEqual(second.close_code, websocket.CloseCode.SESSION_FINISHED)
