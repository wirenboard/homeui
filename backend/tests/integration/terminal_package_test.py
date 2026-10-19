"""Installing the terminal's own package from a web console it serves.

Besides ``WB_TERMINAL_INTEGRATION=1`` and root, needs ``WB_TERMINAL_PASSWORD`` and a package file:

    WB_TERMINAL_INTEGRATION=1 WB_TERMINAL_PASSWORD=... \\
        WB_TERMINAL_DEB=/tmp/wb-homeui-backend_2.220.0_all.deb \\
        WB_TERMINAL_DEB_LEGACY=/tmp/wb-homeui-backend_2.210.0_all.deb \\
        .venv/bin/pytest tests/integration/terminal_package_test.py -v

The rollback test is skipped without the legacy build.
"""

import os
import unittest

from tests.integration.console import PACKAGE, PASSWORD, IntegrationTestCase

DEB = os.environ.get("WB_TERMINAL_DEB")
DEB_LEGACY = os.environ.get("WB_TERMINAL_DEB_LEGACY")
INSTALL_TIMEOUT = 300.0


class PackageTestCase(IntegrationTestCase):
    """Runs dpkg in a console and checks the package and the console afterwards."""

    def install(self, console, deb, downgrade=False):
        option = "--force-downgrade " if downgrade else ""
        code, text = console.run(f"dpkg -i {option}{deb}", timeout=INSTALL_TIMEOUT)
        self.assertEqual(code, 0, text)

    def assert_package_is_whole(self, console):
        """Nothing half-configured, and the package is installed."""
        code, audit = console.run("dpkg --audit")
        self.assertEqual(code, 0)
        self.assertNotIn(PACKAGE, audit.split("dpkg --audit")[-1])
        code, status = console.run(f"dpkg -s {PACKAGE} | grep ^Status:")
        self.assertEqual(code, 0)
        self.assertIn("install ok installed", status)

    def assert_console_still_works(self, console):
        """The same websocket still has a working shell."""
        self.assert_still_open(console)
        code, text = console.run('echo still-"here"')
        self.assertEqual(code, 0)
        self.assertIn("still-here", text)


@unittest.skipUnless(PASSWORD, "set WB_TERMINAL_PASSWORD: these tests need a shell, not a prompt")
class PackageFromTheConsoleTest(PackageTestCase):
    @unittest.skipUnless(DEB, "set WB_TERMINAL_DEB to the package to install")
    def test_a_package_that_restarts_the_terminal_installs_from_the_console_itself(self):
        """dpkg -i in the console restarts the listener; the session process finishes the install
        and keeps the same websocket."""
        console = self.logged_in_console()

        self.install(console, DEB)
        self.assert_package_is_whole(console)
        self.assert_console_still_works(console)

    @unittest.skipUnless(DEB and DEB_LEGACY, "set WB_TERMINAL_DEB and WB_TERMINAL_DEB_LEGACY")
    def test_a_rollback_to_a_build_from_before_session_processes_goes_through(self):
        """Downgrade to a build from before session processes, then upgrade back, from one console.

        Guards rollback compatibility: the old build's restart kills its service cgroup, and the
        session, being a unit of its own, must survive it.
        """
        console = self.logged_in_console()

        self.install(console, DEB_LEGACY, downgrade=True)
        self.assert_package_is_whole(console)
        self.assert_console_still_works(console)

        self.install(console, DEB)
        self.assert_package_is_whole(console)
        self.assert_console_still_works(console)
