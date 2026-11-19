import base64
import errno
import fcntl
import io
import os
import select
import signal
import socket
import struct
import tempfile
import termios
import time
import tty
import unittest
from contextlib import contextmanager, redirect_stderr
from unittest.mock import patch

from tests.terminal_helpers import (
    SERVICE_CGROUP,
    SESSION_SCOPE,
    FakeBrowser,
    FakeClock,
    FakeLogin,
    TerminalTestBase,
    session_ids,
)
from wb.homeui_backend.terminal import registry, session, websocket

OUR_SESSION = "d" * 32
OTHER_SESSION = "e" * 32
FIRST = "a" * 32
SECOND = "b" * 32
OUR_SCOPE = 7
OTHER_SCOPE = 8
# Far more than a PTY buffers while nobody reads it (about 12 KB on Linux).
PASTE = bytes(range(256)) * 512
PASTE_CHUNK = 16384
STUCK_LOOP_SECONDS = 10


def read_window_size(fd):
    """The terminal's window size from the kernel: (rows, columns)."""
    packed = fcntl.ioctl(fd, termios.TIOCGWINSZ, struct.pack("HHHH", 0, 0, 0, 0))
    rows, cols, _width, _height = struct.unpack("HHHH", packed)
    return rows, cols


def encoded(data):
    return base64.b64encode(data).decode("ascii")


def read_available(fd):
    """Non-blocking read of whatever is available."""
    ready, _writable, _failed = select.select([fd], [], [], 0)
    return os.read(fd, 65536) if ready else b""


@contextmanager
def no_longer_than(seconds):
    """Fail via SIGALRM instead of hanging the test run if the loop blocks."""

    def give_up(_signum, _frame):
        raise AssertionError("the session loop got stuck")

    previous = signal.signal(signal.SIGALRM, give_up)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous)


def read_until_eof(sock, timeout=2.0):
    """Read until the peer closes the connection."""
    sock.settimeout(timeout)
    received = bytearray()
    while True:
        chunk = sock.recv(4096)
        if not chunk:
            return bytes(received)
        received += chunk


class SessionTestBase(TerminalTestBase):
    """A TerminalSession in-process: a real PTY and login stand-in, a fake /proc and clock."""

    def setUp(self):
        super().setUp()
        self.clock = FakeClock()
        self.login = FakeLogin()
        self.addCleanup(self.login.stop)
        self.login_pid = self.login.process.pid
        self.set_login_cgroup(SERVICE_CGROUP)
        self.patch(session, "time", self.clock)
        self.patch(session, "login_alive", self.login.alive)
        self.session = session.TerminalSession(OUR_SESSION, self.login.pty)
        self.addCleanup(self.session.stop, websocket.CloseCode.SESSION_FINISHED, "end of test")

    def set_login_cgroup(self, cgroup):
        self.proc.add_process(self.login_pid, cgroup=cgroup)

    def control_path(self):
        """The session's control socket."""
        return registry.control_socket_path(self.runtime_dir, OUR_SESSION, self.login_pid)

    def window_size(self):
        """Window size read from the slave side, as (rows, columns)."""
        return read_window_size(self.login.slave_fd)

    def connect(self):
        browser = FakeBrowser()
        self.addCleanup(browser.sock.close)
        self.assertTrue(self.session.attach(browser.server_side))
        return browser

    def log_in(self):
        """Simulate a successful login: logind moves login into a session scope."""
        self.set_login_cgroup(SESSION_SCOPE.format(OUR_SCOPE))
        self.session.poll()

    def installation_in_another_session(self, pid=8800):
        """Another console session holds the apt lock."""
        self.add_session(OTHER_SESSION, 909, cgroup=SESSION_SCOPE.format(OTHER_SCOPE))
        self.hold_apt_lock(pid, SESSION_SCOPE.format(OTHER_SCOPE))

    def installation_in_this_session(self, pid=8802):
        """This session holds the apt lock."""
        self.hold_apt_lock(pid, SESSION_SCOPE.format(OUR_SCOPE))

    def paste(self, browser, data):
        """Send a long paste as the UI does: one message per chunk."""
        for start in range(0, len(data), PASTE_CHUNK):
            browser.send({"type": "input", "data": encoded(data[start : start + PASTE_CHUNK])})

    def read_terminal_input(self, size, timeout=10.0):
        """Read from the slave side while polling the session."""
        received = bytearray()
        deadline = time.monotonic() + timeout
        while len(received) < size and time.monotonic() < deadline:
            self.session.poll(0.05)
            received += read_available(self.login.slave_fd)
        return bytes(received)


class AttachTest(SessionTestBase):
    def test_a_new_connection_learns_the_session_id(self):
        """The first message to a client is the session id."""
        browser = self.connect()
        messages = browser.messages()
        self.assertEqual(messages[0], {"type": "session", "id": OUR_SESSION})
        self.assertTrue(self.session.connected)

    def test_the_session_is_in_the_registry_under_its_own_name(self):
        self.assertEqual(session_ids(), [OUR_SESSION])
        self.assertEqual(registry.list_sessions()[0].login_pid, self.login_pid)

    def test_what_happened_while_nobody_watched_is_replayed(self):
        """Output buffered while detached is replayed to the next connection."""
        first = self.connect()
        os.write(self.login.slave_fd, b"work in progress\r\n")
        self.session.poll(0.5)
        self.assertIn("output", [message["type"] for message in first.messages()])

        first.disconnect()
        self.session.poll(0.5)
        second = self.connect()
        replayed = [m for m in second.messages() if m["type"] == "output"]
        self.assertIn(b"work in progress", base64.b64decode(replayed[0]["data"]))

    def test_the_replay_keeps_only_the_newest_output(self):
        """The replay buffer is capped and keeps the newest output."""
        self.patch(session, "OUTPUT_BUFFER_BYTES", 16)
        os.write(self.login.slave_fd, b"0123456789" * 4)
        self.session.poll(0.5)

        browser = self.connect()
        replayed = browser.message_of_type("output")
        self.assertEqual(base64.b64decode(replayed["data"]), b"4567890123456789")

    def test_input_reaches_the_terminal(self):
        browser = self.connect()
        browser.send({"type": "input", "data": base64.b64encode(b"uptime\n").decode("ascii")})
        self.session.poll(0.5)
        self.assertEqual(os.read(self.login.slave_fd, 64), b"uptime\n")

    def test_a_resize_reaches_the_terminal(self):
        """The browser's window size is applied to the PTY.

        Read back from the slave side to catch a rows/columns swap in the ioctl struct.
        """
        browser = self.connect()
        browser.send({"type": "resize", "cols": 100, "rows": 40})
        self.session.poll(0.5)
        self.assertEqual(self.window_size(), (40, 100))

    def test_a_size_that_is_not_a_pair_of_numbers_is_ignored(self):
        browser = self.connect()
        browser.send({"type": "resize", "cols": "80", "rows": None})
        self.session.poll(0.5)
        self.assertTrue(self.session.running)

    def test_a_size_no_terminal_could_have_never_reaches_the_pty(self):
        """Zero, negative and oversized sizes are ignored; a valid size and the login still work after.

        `login` exits on a zero-sized terminal, and too large a value fails the ioctl.
        """
        browser = self.connect()
        browser.send({"type": "resize", "cols": 100, "rows": 40})
        self.session.poll(0.5)
        self.assertEqual(self.window_size(), (40, 100))

        for cols, rows in ((0, 0), (80, 0), (0, 24), (-1, -1), (70000, 24), (80, 70000)):
            with self.subTest(cols=cols, rows=rows):
                browser.send({"type": "resize", "cols": cols, "rows": rows})
                self.session.poll(0.5)
                self.assertTrue(self.session.running)
                self.assertEqual(self.window_size(), (40, 100))

        browser.send({"type": "resize", "cols": 120, "rows": 50})
        self.session.poll(0.5)
        self.assertEqual(self.window_size(), (50, 120))

        self.log_in()
        self.assertTrue(self.session.logged_in)

    def test_input_that_is_not_base64_never_reaches_the_terminal(self):
        """Malformed input messages are dropped without writing anything; later input gets through."""
        browser = self.connect()
        for message in (
            {"type": "input", "data": 17},
            {"type": "input", "data": "not base64 at all!"},
            {"type": "input"},
        ):
            browser.send(message)
        self.session.poll(0.5)
        self.assertTrue(self.session.running)

        browser.send({"type": "input", "data": base64.b64encode(b"after\n").decode("ascii")})
        self.session.poll(0.5)
        self.assertEqual(os.read(self.login.slave_fd, 64), b"after\n")

    def test_a_terminal_that_refuses_writes_does_not_take_the_session_down(self):
        """A failing PTY write is logged and the session keeps running."""
        browser = self.connect()
        real_write = os.write

        def refuse_the_pty(fd, data):
            if fd == self.login.master_fd:
                raise OSError(errno.EIO, "no terminal on the other end")
            return real_write(fd, data)

        browser.send({"type": "input", "data": base64.b64encode(b"uptime\n").decode("ascii")})
        with patch.object(session.os, "write", refuse_the_pty):
            with self.assertLogs(level="WARNING") as logs:
                self.session.poll(0.5)

        self.assertIn("cannot write to its PTY", "\n".join(logs.output))
        self.assertTrue(self.session.running)

    def test_input_the_terminal_cannot_take_yet_waits_without_stopping_the_session(self):
        """A long paste into a program that does not read: the excess waits in the session.

        Output still reaches the browser meanwhile, and once the program reads, the whole paste
        arrives in order.
        """
        tty.setraw(self.login.slave_fd)
        browser = self.connect()
        self.paste(browser, PASTE)
        with no_longer_than(STUCK_LOOP_SECONDS):
            for _ in range(5):
                self.session.poll(0.1)
            os.write(self.login.slave_fd, b"still here")
            self.session.poll(0.5)
            self.assertIn("still here", browser.output_until("still here", 2.0))

            self.assertEqual(self.read_terminal_input(len(PASTE)), PASTE)
        self.assertTrue(self.session.running)

    def test_input_beyond_what_the_session_keeps_is_dropped(self):
        """Pending input is bounded: a message that would overflow it is dropped whole.

        The first chunk fills the PTY and leaves a tail pending; the second does not fit.
        """
        self.patch(session, "PENDING_INPUT_BYTES", PASTE_CHUNK)
        tty.setraw(self.login.slave_fd)
        browser = self.connect()
        self.paste(browser, PASTE[: 2 * PASTE_CHUNK])
        with no_longer_than(STUCK_LOOP_SECONDS), self.assertLogs(level="WARNING") as logs:
            for _ in range(5):
                self.session.poll(0.1)
        self.assertIn(f"dropped {PASTE_CHUNK} bytes of input", "\n".join(logs.output))

        with no_longer_than(STUCK_LOOP_SECONDS):
            self.assertEqual(self.read_terminal_input(2 * PASTE_CHUNK, timeout=1.0), PASTE[:PASTE_CHUNK])

    def test_a_descriptor_on_the_control_socket_brings_the_next_window(self):
        """A descriptor sent to the control socket becomes the new client."""
        browser = FakeBrowser(session_id=OUR_SESSION)
        self.addCleanup(browser.sock.close)
        self.assertTrue(registry.send_fd(self.control_path(), browser.server_side.fileno()))
        browser.server_side.close()
        self.session.poll(0.5)
        self.assertEqual(browser.message_of_type("session"), {"type": "session", "id": OUR_SESSION})

    def test_a_control_connection_that_brings_nothing_is_not_an_order(self):
        """An empty control connection (listener died or timed out) is neither a client nor a stop order."""
        self.connect()
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as idle:
            idle.connect(self.control_path())
        with self.assertLogs(level="WARNING") as logs:
            self.session.poll(0.5)
        self.assertIn("neither a client nor an order", "\n".join(logs.output))
        self.assertTrue(self.session.running)
        self.assertTrue(self.session.connected)

    def test_a_client_that_goes_away_takes_its_descriptor_with_it(self):
        """The session closes a dropped client's socket; it holds the only copy, so it would leak."""
        browser = self.connect()
        self.assertNotEqual(browser.server_side.fileno(), -1)

        browser.disconnect()
        self.session.poll(0.5)

        self.assertFalse(self.session.connected)
        self.assertEqual(browser.server_side.fileno(), -1)

    def test_a_connection_that_fails_the_handshake_is_let_go(self):
        """A later connection failing the handshake is closed (426), and the session keeps running."""
        self.connect()
        stranger, session_side = socket.socketpair(socket.AF_UNIX, socket.SOCK_STREAM)
        self.addCleanup(stranger.close)
        self.assertTrue(registry.send_fd(self.control_path(), session_side.fileno()))
        session_side.close()  # the session now holds the only copy
        stranger.sendall(b"GET /api/terminal HTTP/1.1\r\nHost: wb\r\n\r\n")  # no Upgrade

        self.session.poll(0.5)
        self.assertTrue(self.session.running)
        self.assertIn(b"426 Upgrade Required", read_until_eof(stranger))


class LoginTest(SessionTestBase):
    def test_the_login_is_noticed_by_the_logind_scope(self):
        """Login is detected when its cgroup becomes a logind scope; the client stays attached."""
        browser = self.connect()
        browser.messages(0.2)
        self.session.poll()
        self.assertFalse(self.session.logged_in)
        self.log_in()
        self.assertTrue(self.session.logged_in)
        self.assertTrue(self.session.running)
        self.assertIsNone(browser.close_code)

    def test_the_hangup_login_starts_with_does_not_end_the_session(self):
        """login's vhangup() makes the master read EIO until the tty is reopened; the session survives it."""
        browser = self.connect()
        slave_path = os.ttyname(self.login.slave_fd)
        os.close(self.login.slave_fd)
        self.session.poll(0.5)
        self.assertTrue(self.session.running)

        self.login.slave_fd = os.open(slave_path, os.O_RDWR | os.O_NOCTTY)
        os.write(self.login.slave_fd, b"login: ")
        self.session.poll(0.5)
        self.assertIn("output", [message["type"] for message in browser.messages()])
        self.assertIsNone(browser.close_code)

    def test_when_login_goes_the_session_goes_with_it(self):
        """login exits: the session ends and the client gets 1000."""
        browser = self.connect()
        self.login.stop()
        self.session.poll()
        browser.messages(0.2)
        self.assertEqual(browser.close_code, int(websocket.CloseCode.SESSION_FINISHED))
        self.assertFalse(self.session.running)

    def test_the_last_words_of_login_reach_the_tab_before_the_close(self):
        """Output login wrote just before exiting is still delivered before the close.

        `select` is patched to report nothing, so the output is only read in the final drain.
        """
        browser = self.connect()
        os.write(self.login.slave_fd, b"Login timed out after 60 seconds.")
        self.login.process.kill()
        self.login.process.wait()

        with patch.object(session.select, "select", return_value=([], [], [])):
            self.session.poll()

        self.assertIn("timed out after 60 seconds", browser.output_until("seconds.", timeout=2.0))
        browser.messages(0.2)
        self.assertEqual(browser.close_code, int(websocket.CloseCode.SESSION_FINISHED))


class NoticeTest(SessionTestBase):
    def test_an_installation_elsewhere_is_told_about_at_login(self):
        """An installation in another console is announced at login."""
        browser = self.connect()
        self.installation_in_another_session()
        self.log_in()
        self.assertEqual(
            browser.message_of_type("notice"),
            {"type": "notice", "kind": "apt-lock", "session": OTHER_SESSION},
        )

    def test_the_notice_is_rebuilt_for_every_connection(self):
        """The notice is computed per connection, not cached."""
        self.log_in()
        first = self.connect()
        self.assertIsNone(first.message_of_type("notice", 0.2))

        self.installation_in_another_session(pid=8801)
        second = self.connect()
        self.assertEqual(second.message_of_type("notice")["session"], OTHER_SESSION)

    def test_nothing_is_said_before_the_login(self):
        self.installation_in_another_session()
        browser = self.connect()
        self.assertIsNone(browser.message_of_type("notice", 0.2))


class TakeOverTest(SessionTestBase):
    def test_the_previous_window_is_let_go_before_the_new_one_is_served(self):
        """The old client is closed with 4001 before the new one is served."""
        first = self.connect()
        self.log_in()
        second = self.connect()

        first.messages()
        self.assertEqual(first.close_code, int(websocket.CloseCode.TAKEN_OVER))
        self.assertEqual(second.message_of_type("session")["id"], OUR_SESSION)
        self.assertTrue(self.session.running)

    def test_a_window_leaving_as_the_next_one_comes_does_not_stall_the_session(self):
        """The old client's close frame and a new descriptor arrive in the same loop turn.

        The new client must not be read for the old close frame: that read would block until
        timeout and then drop it.
        """
        first = self.connect()
        first.send_close()
        second = FakeBrowser(session_id=OUR_SESSION)
        self.addCleanup(second.sock.close)
        self.assertTrue(registry.send_fd(self.control_path(), second.server_side.fileno()))
        second.server_side.close()

        started = time.monotonic()
        self.session.poll(0.5)
        self.assertLess(time.monotonic() - started, websocket.CLIENT_IO_TIMEOUT / 2)
        self.assertTrue(self.session.connected)
        self.assertEqual(second.message_of_type("session")["id"], OUR_SESSION)
        self.assertIsNone(second.close_code)


class LifetimeTest(SessionTestBase):
    def test_a_dropped_client_is_waited_for_an_hour(self):
        """Without a client the session ends after DISCONNECTED_SECONDS."""
        browser = self.connect()
        self.log_in()
        browser.disconnect()
        self.session.poll(0.5)
        self.assertFalse(self.session.connected)

        self.clock.advance(session.DISCONNECTED_SECONDS - 1)
        self.assertTrue(self.session.poll())
        self.clock.advance(2)
        self.assertFalse(self.session.poll())
        self.assertFalse(self.session.running)

    def test_the_apt_lock_holds_the_session_open(self):
        """Holding the apt lock keeps a disconnected session alive past the deadline."""
        browser = self.connect()
        self.log_in()
        self.installation_in_this_session()
        browser.disconnect()
        self.session.poll(0.5)

        self.clock.advance(session.DISCONNECTED_SECONDS + 1)
        self.assertTrue(self.session.poll())
        self.clock.advance(session.DISCONNECTED_SECONDS)
        self.assertTrue(self.session.poll())
        self.assertTrue(self.session.running)

    def test_the_check_that_ends_the_session_is_a_fresh_one(self):
        """Once the apt lock is released, an overdue session ends on the next poll."""
        browser = self.connect()
        self.log_in()
        self.installation_in_this_session()
        browser.disconnect()
        self.session.poll(0.5)
        self.clock.advance(session.DISCONNECTED_SECONDS + 1)
        self.assertTrue(self.session.poll())

        self.proc.write_locks([])
        self.assertFalse(self.session.poll())
        self.assertFalse(self.session.running)

    def test_a_connected_session_has_no_deadline_of_its_own(self):
        self.connect()
        self.log_in()
        self.clock.advance(10_000)
        self.assertTrue(self.session.poll())

    def test_a_close_frame_from_the_tab_only_detaches_it(self):
        """A close frame detaches the client; the session keeps running."""
        browser = self.connect()
        self.log_in()
        browser.send_close()
        self.session.poll(0.5)
        self.assertFalse(self.session.connected)
        self.assertTrue(self.session.running)

    def test_a_failed_first_handshake_ends_the_session_and_leaves_nothing(self):
        """A failed first handshake ends the session: nobody has its id to come back.

        Its socket leaves the registry and login exits.
        """
        stranger, session_side = self.socket_pair()
        stranger.sendall(b"GET /api/terminal HTTP/1.1\r\nHost: wb\r\n\r\n")  # no Upgrade
        self.assertTrue(registry.send_fd(self.control_path(), session_side.fileno()))

        self.assertFalse(self.session.poll(0.5))

        self.assertFalse(os.path.exists(self.control_path()))
        self.login.process.wait(timeout=5)

    def test_a_session_nobody_came_to_goes_by_the_deadline(self):
        """A session that never got a client is disconnected from the start and ends on the deadline."""
        self.assertFalse(self.session.connected)
        self.clock.advance(session.DISCONNECTED_SECONDS - 1)
        self.assertTrue(self.session.poll())
        self.clock.advance(2)
        self.assertFalse(self.session.poll())
        self.assertFalse(os.path.exists(self.control_path()))

    def test_a_session_that_fails_leaves_no_socket_behind(self):
        """An exception in the loop still removes the socket, so it does not hold a slot."""
        with patch.object(session, "session_scope", side_effect=RuntimeError("a bug")):
            with self.assertRaises(RuntimeError):
                self.session.run()

        self.assertFalse(self.session.running)
        self.assertFalse(os.path.exists(self.control_path()))
        self.login.process.wait(timeout=5)

    def test_stopping_hangs_up_the_terminal_and_login_goes(self):
        """Stopping closes the PTY; the hangup kills login with SIGHUP."""
        self.session.stop(websocket.CloseCode.SESSION_FINISHED, "end of test")

        with self.assertRaises(OSError):
            os.fstat(self.login.master_fd)
        self.assertEqual(self.login.process.wait(timeout=5), -signal.SIGHUP)


class StopRequestTest(SessionTestBase):
    def test_a_session_told_to_stop_ends_like_any_other(self):
        """request_stop (SIGTERM): the client gets 1000, the socket leaves the registry, login exits."""
        browser = self.connect()

        self.session.request_stop()
        running = self.session.poll()

        self.assertFalse(running)
        browser.messages(0.2)
        self.assertEqual(browser.close_code, int(websocket.CloseCode.SESSION_FINISHED))
        self.assertEqual(registry.list_sessions(), [])
        self.login.process.wait(timeout=5)


class ClientLostOnWriteTest(SessionTestBase):
    """A client lost on writing output rather than on read.

    The browser does `shutdown(SHUT_RD)`, so only the session's write notices, with EPIPE.
    """

    def stop_receiving(self, browser):
        browser.sock.shutdown(socket.SHUT_RD)

    def produce_output(self, data):
        """Write output on the slave side and wait until the master can read it."""
        os.write(self.login.slave_fd, data)
        select.select([self.login.master_fd], [], [], 1.0)

    def lose_client_on_output(self):
        """Output goes to a browser that no longer receives."""
        browser = self.connect()
        self.stop_receiving(browser)
        self.produce_output(b"output nobody reads\r\n")
        self.assertTrue(self.session.poll(0.5))

    def assert_detached_and_waiting_from_now(self):
        """Detached, still running, and the disconnect deadline counts from now."""
        self.assertFalse(self.session.connected)
        self.assertTrue(self.session.running)
        self.clock.advance(session.DISCONNECTED_SECONDS - 1)
        self.assertTrue(self.session.poll())
        self.clock.advance(2)
        self.assertFalse(self.session.poll())
        self.assertFalse(self.session.running)

    def assert_reattached_with_replay(self, printed):
        """A new client gets the same session and the replayed output."""
        browser = self.connect()
        self.assertEqual(browser.message_of_type("session"), {"type": "session", "id": OUR_SESSION})
        replayed = browser.message_of_type("output")
        self.assertIn(printed, base64.b64decode(replayed["data"]))
        self.assertTrue(self.session.connected)

    def test_output_to_a_gone_client_detaches_it(self):
        """A failed output write detaches the client and starts the disconnect deadline."""
        self.lose_client_on_output()
        self.assert_detached_and_waiting_from_now()

    def test_after_output_to_a_gone_client_the_next_window_gets_the_session(self):
        """Output the lost client missed is replayed to the next one."""
        self.lose_client_on_output()
        self.assertFalse(self.session.connected)
        self.assert_reattached_with_replay(b"output nobody reads")


class EvictionTest(SessionTestBase):
    def test_a_session_told_to_go_closes_its_client_and_leaves_the_registry(self):
        """A bare GO_BYTE is the eviction order: client gets 1013, socket removed, login exits."""
        browser = self.connect()
        self.log_in()
        path = self.control_path()
        self.assertTrue(os.path.exists(path))

        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as order:
            order.connect(path)
            order.sendall(b"\0")
            self.assertFalse(self.session.poll(0.5))

        browser.messages(0.2)
        self.assertEqual(browser.close_code, int(websocket.CloseCode.SLOT_TAKEN))
        self.assertFalse(os.path.exists(path))
        self.assertFalse(self.session.running)
        self.login.process.wait(timeout=5)


class NoticeOwnerTest(TerminalTestBase):
    """apt_lock_owner: which session's installation a console is told about."""

    def test_installation_in_another_session_names_that_session(self):
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.add_session(SECOND, 202, cgroup=SESSION_SCOPE.format(8))
        self.hold_apt_lock(800, SESSION_SCOPE.format(8))
        self.assertEqual(session.apt_lock_owner(FIRST, 101), SECOND)

    def test_a_console_of_another_user_is_not_told_the_id(self):
        """A console of another user is not told: the id would give it root's shell."""
        self.add_session(FIRST, 101, cgroup="/user.slice/user-1001.slice/session-9.scope")
        self.add_session(SECOND, 202, cgroup=SESSION_SCOPE.format(8))
        self.hold_apt_lock(800, SESSION_SCOPE.format(8))
        self.assertIsNone(session.apt_lock_owner(FIRST, 101))

    def test_an_installation_outside_the_console_is_not_worth_a_notice(self):
        """A lock held outside the console (ssh, cron) has no session to point to."""
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.hold_apt_lock(800, "/system.slice/cron.service")
        self.assertIsNone(session.apt_lock_owner(FIRST, 101))

    def test_our_own_installation_is_not_worth_a_notice(self):
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.hold_apt_lock(800, SESSION_SCOPE.format(7))
        self.assertIsNone(session.apt_lock_owner(FIRST, 101))

    def test_nothing_going_on_means_no_notice(self):
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.assertIsNone(session.apt_lock_owner(FIRST, 101))


class SessionArgsTest(unittest.TestCase):
    """`wb-terminal-session [--debug] <session id> <client address>`."""

    def refused(self, argv, entry_point=session.parse_session_args):
        """The usage error argparse writes to stderr; it exits with code 2."""
        stderr = io.StringIO()
        with redirect_stderr(stderr), self.assertRaises(SystemExit) as raised:
            entry_point(argv)
        self.assertEqual(raised.exception.code, 2)
        return stderr.getvalue()

    def test_what_the_listener_passes_is_taken(self):
        args = session.parse_session_args([FIRST, "10.0.0.5"])
        self.assertEqual((args.session_id, args.remote_addr, args.debug), (FIRST, "10.0.0.5", False))

    def test_debug_is_taken(self):
        self.assertTrue(session.parse_session_args(["--debug", FIRST, "10.0.0.5"]).debug)

    def test_an_empty_address_is_left_to_login(self):
        """No X-Real-IP: login uses its default host."""
        self.assertEqual(session.parse_session_args([FIRST, ""]).remote_addr, "")

    def test_anything_else_is_refused(self):
        """A malformed id or a wrong argument count is refused."""
        cases = [
            ["7", "10.0.0.5"],
            [FIRST.upper(), "10.0.0.5"],
            [FIRST[:-1], "10.0.0.5"],
            [FIRST + "0", "10.0.0.5"],
            ["../../etc", "10.0.0.5"],
            [FIRST + "\n", "10.0.0.5"],
            [FIRST],
            [FIRST, "10.0.0.5", "extra"],
        ]
        for argv in cases:
            with self.subTest(argv=argv):
                self.refused(argv)

    def test_the_entry_point_refuses_without_starting_anything(self):
        """Wrong arguments: a usage line on stderr, which goes to the journal, and exit code 2."""
        with patch.object(session, "start_login") as start_login:
            self.assertIn("usage: wb-terminal-session", self.refused(["7", "10.0.0.5"], session.run_session))
        start_login.assert_not_called()


class NotifyReadyTest(unittest.TestCase):
    """sd_notify(READY=1): a datagram on $NOTIFY_SOCKET."""

    def receiver(self, address):
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)
        self.addCleanup(sock.close)
        sock.bind(address)
        sock.settimeout(1.0)
        return sock

    def test_ready_goes_to_a_path(self):
        """$NOTIFY_SOCKET as a filesystem path."""
        root = tempfile.mkdtemp()
        self.addCleanup(os.rmdir, root)
        path = os.path.join(root, "notify")
        self.addCleanup(os.unlink, path)
        receiver = self.receiver(path)
        session.notify_ready(path)
        self.assertEqual(receiver.recv(64), b"READY=1")

    def test_ready_goes_to_an_abstract_address(self):
        """An abstract address: systemd writes '@' for the leading zero byte."""
        name = f"wb-terminal-test-{os.getpid()}"
        receiver = self.receiver("\0" + name)
        session.notify_ready("@" + name)
        self.assertEqual(receiver.recv(64), b"READY=1")

    def test_without_systemd_nothing_is_sent(self):
        """Without $NOTIFY_SOCKET (run by hand) nothing is sent and no error is raised."""
        session.notify_ready(None)
        session.notify_ready("")

    def test_a_socket_nobody_listens_on_is_an_error(self):
        """Fails at once instead of letting the unit start time out."""
        with self.assertRaises(OSError):
            session.notify_ready("/nonexistent/notify")
