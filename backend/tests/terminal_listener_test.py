import grp
import os
import queue
import select
import socket
import subprocess  # nosec B404 - real processes as eviction victims
import sys
import threading
import time
import unittest
from unittest.mock import MagicMock, patch

from tests.terminal_helpers import (
    SESSION_SCOPE,
    FakeBrowser,
    TerminalTestBase,
    listening_socket,
)
from wb.homeui_backend.terminal import listener, registry

FIRST = "a" * 32
SECOND = "b" * 32
NEW_ID = "c0ffee00" * 4
LOGIN_PID = 4242
# Upper bound for waits on the listener's worker threads.
THREAD_BOUND = 10.0

# Stand-in for a session process listening on its control socket. On the stop order "leave"
# unlinks its socket and exits 0; "stay" ignores it, so a SIGKILL from the listener shows as -9.
VICTIM_SCRIPT = """
import os
import socket
import sys
import time

path, behaviour = sys.argv[1], sys.argv[2]
server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
server.bind(path)
server.listen(4)
sys.stdout.write("ready\\n")
sys.stdout.flush()
conn, _addr = server.accept()
conn.recv(1)
if behaviour == "leave":
    os.unlink(path)
    sys.exit(0)
time.sleep(300)
"""

# Upper bounds, not pauses: generous for slow, loaded ARM builders and only reached on failure.
EVICTION_BOUND = 10.0
VICTIM_READY_TIMEOUT = 30.0
VICTIM_EXIT_TIMEOUT = 10.0


def own_group_name():
    """The test process's own group name."""
    return grp.getgrgid(os.getgid()).gr_name


class RecordingListener(listener.TerminalListener):
    """A listener whose `start_unit` registers a control socket the test accepts on, instead of systemd."""

    def __init__(self, socket_path=None):
        super().__init__(socket_path)
        self.started = []
        self.controls = []

    def start_unit(self, session_id, remote_addr):
        self.started.append((session_id, remote_addr))
        self.controls.append(
            listening_socket(registry.control_socket_path(registry.RUNTIME_DIR, session_id, LOGIN_PID))
        )
        return True

    def close_controls(self):
        for control in self.controls:
            control.close()


def received_descriptor(control):
    """The descriptor received on a control socket, or None if nothing came."""
    ready, _writable, _failed = select.select([control], [], [], THREAD_BOUND)
    if not ready:
        return None
    conn, _addr = control.accept()
    with conn:
        return registry.receive_control_message(conn).fd


class StartupTest(TerminalTestBase):
    def setUp(self):
        super().setUp()
        self.listener = listener.TerminalListener(os.path.join(self.root, "listen.sock"))
        self.addCleanup(self.listener.close)

    def test_only_the_group_of_nginx_may_write_to_the_socket(self):
        """Socket is 0660 with the nginx group: write access to it means console access."""
        listen_path = os.path.join(self.root, "listen.sock")
        with patch.object(listener, "LISTEN_SOCKET_GROUP", own_group_name()):
            self.listener.start()

        info = os.stat(listen_path)
        self.assertEqual(info.st_mode & 0o777, 0o660)
        self.assertEqual(info.st_gid, os.getgid())
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
            client.connect(listen_path)

    def test_without_that_group_the_listener_does_not_start(self):
        """A missing group fails startup rather than leaving the socket open to all."""
        with patch.object(listener, "LISTEN_SOCKET_GROUP", "no-such-group-here"):
            with self.assertRaises(KeyError):
                self.listener.start()


class ListenerTestBase(TerminalTestBase):
    """A listener serving its socket from a thread, with `start_unit` recording instead of systemd."""

    def setUp(self):
        super().setUp()
        self.listener = RecordingListener(os.path.join(self.root, "listen.sock"))
        self.addCleanup(self.listener.close_controls)
        with patch.object(listener, "LISTEN_SOCKET_GROUP", own_group_name()):
            self.listener.start()
        self.addCleanup(self.listener.close)
        threading.Thread(target=self.serve, daemon=True).start()

    def serve(self):
        try:
            self.listener.serve_forever()
        except OSError:  # socket closed at the end of the test
            pass

    def connect_raw(self):
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.connect(os.path.join(self.root, "listen.sock"))
        self.addCleanup(sock.close)
        return sock

    def connect(self, session_id=None):
        return FakeBrowser(sock=self.connect_raw(), session_id=session_id)

    def wait_until(self, condition, message):
        deadline = time.monotonic() + THREAD_BOUND
        while not condition():
            self.assertLess(time.monotonic(), deadline, message)
            time.sleep(0.01)

    def wait_for_starts(self, count):
        self.wait_until(lambda: len(self.listener.controls) >= count, "no session was started")

    def assert_handed_the_request(self, control):
        """A descriptor arrived with the HTTP request still unread in it."""
        fd = received_descriptor(control)
        self.assertIsNotNone(fd, "no descriptor came to the session")
        with socket.socket(fileno=fd) as received:
            self.assertIn(b"Sec-WebSocket-Key", received.recv(4096, socket.MSG_PEEK))

    def assert_a_new_session_got_it(self):
        self.wait_for_starts(1)
        self.assert_handed_the_request(self.listener.controls[0])

    def assert_closed(self, sock):
        """The listener let go of the connection: no answer, no close code, the tab reconnects."""
        sock.settimeout(THREAD_BOUND)
        try:
            self.assertEqual(sock.recv(1), b"")
        except ConnectionResetError:  # a close with the request left unread
            pass


class RoutingTest(ListenerTestBase):
    def test_a_plain_connection_starts_a_session(self):
        """A request without an id starts a unit with a new id and the client address, then
        hands the connection over the control socket."""
        self.connect()
        self.assert_a_new_session_got_it()
        self.assertEqual(len(self.listener.started), 1)
        session_id, remote_addr = self.listener.started[0]
        self.assertRegex(session_id, "^[0-9a-f]{32}$")
        self.assertEqual(remote_addr, "10.0.0.5")

    def test_a_malformed_id_is_just_an_unknown_one(self):
        """The id is only compared with the registry, never used as a path."""
        self.connect(session_id="../../etc/passwd")
        self.assert_a_new_session_got_it()

    def test_an_id_nobody_has_gets_a_session_of_its_own(self):
        """A stale id (after a reboot or an expired session) gets a new session."""
        self.connect(session_id=FIRST)
        self.assert_a_new_session_got_it()

    def test_a_request_that_is_not_http_is_refused(self):
        sock = self.connect_raw()
        sock.sendall(b"garbage\r\n\r\n")
        self.assert_closed(sock)
        self.assertEqual(self.listener.started, [])


class ReattachTest(ListenerTestBase):
    def test_the_connection_is_handed_to_the_session_that_owns_it(self):
        """A known id: the descriptor goes to that session; no new session is started."""
        control = self.add_session(FIRST, 101)
        self.connect(session_id=FIRST)
        self.assert_handed_the_request(control)
        self.assertEqual(self.listener.started, [])

    def test_a_session_that_stopped_answering_is_swept_and_replaced(self):
        """A dead session's socket refuses connections: it is removed and a new session started."""
        self.add_orphan_socket(FIRST, 101)
        self.connect(session_id=FIRST)
        self.assert_a_new_session_got_it()
        self.assertFalse(os.path.exists(registry.control_socket_path(self.runtime_dir, FIRST, 101)))


class NewSessionTest(ListenerTestBase):
    def test_a_failed_start_drops_the_client_without_a_code(self):
        """No retry: the client is dropped without a close code, so the tab reconnects itself."""
        start_unit = MagicMock(return_value=False)
        with patch.object(self.listener, "start_unit", start_unit):
            self.assert_closed(self.connect().sock)
        start_unit.assert_called_once()

    def test_a_unit_that_started_without_a_socket_is_logged(self):
        """systemd-run reported success but no socket appeared in the registry."""
        with patch.object(self.listener, "start_unit", return_value=True), self.assertLogs(
            level="ERROR"
        ) as logs:
            self.assert_closed(self.connect().sock)
        self.assertIn("its socket is not there", "\n".join(logs.output))


class EvictionTest(ListenerTestBase):
    """A new connection with all slots taken evicts the oldest session, then gets a session itself."""

    def start_victim(self, session_id, login_pid, behaviour="leave"):
        """A separate process listening on a session socket, with its login in the fake /proc.

        It must be a separate process: the listener kills whoever listens on a socket that ignores
        the stop order. Ages work as in `add_session`.
        """
        path = registry.control_socket_path(self.runtime_dir, session_id, login_pid)
        victim = subprocess.Popen(  # pylint: disable=consider-using-with  # outlives this call
            [sys.executable, "-c", VICTIM_SCRIPT, path, behaviour],  # nosec B603 - fixed argv, no shell
            stdout=subprocess.PIPE,
            text=True,
            start_new_session=True,
        )
        self.addCleanup(victim.wait)
        self.addCleanup(victim.kill)
        self.addCleanup(victim.stdout.close)
        self.wait_until_ready(victim)
        self.proc.add_process(login_pid, cgroup=SESSION_SCOPE.format(login_pid))
        self.wait_for_the_clock_to_move(os.stat(path).st_ctime)
        return victim

    def wait_until_ready(self, victim):
        """Wait for the stand-in to start listening."""
        ready, _writable, _failed = select.select([victim.stdout], [], [], VICTIM_READY_TIMEOUT)
        self.assertTrue(ready, "the stand-in for a session never came up")
        self.assertEqual(victim.stdout.readline().strip(), "ready")

    def test_the_oldest_session_is_told_to_go(self):
        """The oldest session (here the second by name) is told to go."""
        victim = self.start_victim(SECOND, 202)
        self.add_session(FIRST, 101)

        with patch.object(listener, "MAX_SESSIONS", 2), patch.object(
            listener, "EVICTION_TIMEOUT", EVICTION_BOUND
        ):
            self.connect()
            self.assert_a_new_session_got_it()

        self.assertEqual(victim.wait(timeout=VICTIM_EXIT_TIMEOUT), 0)
        self.assertFalse(os.path.exists(registry.control_socket_path(self.runtime_dir, SECOND, 202)))
        self.assertTrue(os.path.exists(registry.control_socket_path(self.runtime_dir, FIRST, 101)))

    def test_a_session_that_does_not_go_is_killed(self):
        """A session ignoring the stop order is killed and its socket removed.

        The pid comes from the socket's peer, not from the login pid in the socket name.
        """
        victim = self.start_victim(FIRST, 101, behaviour="stay")

        with patch.object(listener, "MAX_SESSIONS", 1), patch.object(listener, "EVICTION_TIMEOUT", 0.2):
            self.connect()
            self.assert_a_new_session_got_it()

        self.assertEqual(victim.wait(timeout=VICTIM_EXIT_TIMEOUT), -9)
        self.assertFalse(os.path.exists(registry.control_socket_path(self.runtime_dir, FIRST, 101)))

    def test_a_victim_nobody_listens_for_is_swept(self):
        """The oldest session is dead: removing its socket frees the slot."""
        self.add_orphan_socket(FIRST, 101)

        with patch.object(listener, "MAX_SESSIONS", 1):
            self.connect()
            self.assert_a_new_session_got_it()

        self.assertFalse(os.path.exists(registry.control_socket_path(self.runtime_dir, FIRST, 101)))

    def test_a_plain_http_request_neither_evicts_nor_starts_a_session(self):
        """A GET without websocket upgrade is dropped before eviction."""
        victim = self.start_victim(FIRST, 101)
        sock = self.connect_raw()

        with patch.object(listener, "MAX_SESSIONS", 1), patch.object(
            listener, "EVICTION_TIMEOUT", EVICTION_BOUND
        ):
            sock.sendall(b"GET /api/terminal HTTP/1.1\r\nHost: wb\r\n\r\n")
            self.assert_closed(sock)

        self.assertEqual(self.listener.started, [])
        self.assertIsNone(victim.poll())
        self.assertTrue(os.path.exists(registry.control_socket_path(self.runtime_dir, FIRST, 101)))


class ServeTest(ListenerTestBase):
    """A thread per connection."""

    def test_a_session_that_is_starting_holds_up_nobody(self):
        """While one connection waits for its unit to start, a reattach to another session is served."""
        release = threading.Event()
        self.addCleanup(release.set)
        starting = threading.Event()
        record = self.listener.start_unit

        def slow_start(session_id, remote_addr):
            starting.set()
            release.wait(THREAD_BOUND)
            return record(session_id, remote_addr)

        control = self.add_session(FIRST, 101)
        with patch.object(self.listener, "start_unit", slow_start):
            self.connect()
            self.assertTrue(starting.wait(THREAD_BOUND), "the first connection never got to the start")
            self.connect(FIRST)
            ready, _writable, _failed = select.select([control], [], [], THREAD_BOUND)
            self.assertTrue(ready, "the reattach waited for the start")
            self.assertFalse(release.is_set())
            release.set()
            self.assert_a_new_session_got_it()

    def test_connections_beyond_the_limit_are_dropped(self):
        """With MAX_CONNECTIONS connections busy starting, even a reattach is dropped at once;
        once they are done, it is served again."""
        release = threading.Event()
        self.addCleanup(release.set)
        busy = queue.Queue()
        record = self.listener.start_unit

        def slow_start(session_id, remote_addr):
            busy.put(session_id)
            release.wait(THREAD_BOUND)
            return record(session_id, remote_addr)

        control = self.add_session(FIRST, 101)
        with patch.object(self.listener, "start_unit", slow_start):
            for _ in range(listener.MAX_CONNECTIONS):
                self.connect()
            for _ in range(listener.MAX_CONNECTIONS):
                busy.get(timeout=THREAD_BOUND)
            with self.assertLogs(level="WARNING"):
                self.assert_closed(self.connect(FIRST).sock)
            release.set()
            # The threads finish once the starts are done; the tab retries, as a real one does.
            deadline = time.monotonic() + THREAD_BOUND
            ready = []
            while not ready and time.monotonic() < deadline:
                self.connect(FIRST)
                ready, _writable, _failed = select.select([control], [], [], 0.1)
            self.assertTrue(ready, "a connection within the limit was not served")
            self.wait_for_starts(listener.MAX_CONNECTIONS)


class StartUnitTest(TerminalTestBase):
    """The real `start_unit` with systemd-run replaced by a script that records its arguments."""

    def start_with(self, body):
        """Run `start_unit` with a fake systemd-run that records its args and then runs `body`."""
        path = os.path.join(self.root, "systemd-run")
        with open(path, "w", encoding="utf-8") as script:
            script.write(f'#!/bin/sh\nprintf "%s\\n" "$@" > "{self.args_path()}"\n{body}\n')
        os.chmod(path, 0o755)
        self.patch(listener, "SYSTEMD_RUN_PATH", path)
        return listener.TerminalListener(os.path.join(self.root, "listen.sock")).start_unit(
            NEW_ID, "10.0.0.5"
        )

    def args_path(self):
        return os.path.join(self.root, "systemd-run.args")

    def test_a_unit_that_came_up_is_a_start(self):
        """Exit 0 means started; systemd-run got the command line from `unit_command`."""
        self.assertTrue(self.start_with("exit 0"))
        with open(self.args_path(), encoding="utf-8") as args:
            self.assertEqual(args.read().splitlines(), listener.unit_command(NEW_ID, "10.0.0.5")[1:])

    def test_a_refusal_is_no_start_and_is_logged(self):
        with self.assertLogs(level="ERROR"):
            self.assertFalse(self.start_with("exit 1"))

    def test_no_systemd_run_is_no_start(self):
        self.patch(listener, "SYSTEMD_RUN_PATH", os.path.join(self.root, "nowhere"))
        with self.assertLogs(level="ERROR"):
            self.assertFalse(listener.TerminalListener().start_unit(NEW_ID, "10.0.0.5"))

    def test_a_start_that_hangs_is_given_up_on(self):
        """The listener has its own timeout on systemd-run."""
        self.patch(listener, "START_TIMEOUT", 0.2)
        self.patch(listener, "START_TIMEOUT_MARGIN", 0)
        with self.assertLogs(level="ERROR") as logs:
            started = self.start_with("exec sleep 30")
        self.assertFalse(started)
        self.assertIn("timed out", "\n".join(logs.output))


class UnitCommandTest(unittest.TestCase):
    def test_the_session_starts_as_a_unit_named_by_its_id(self):
        """Type=notify makes systemd-run wait until the session's socket is in the registry."""
        command = listener.unit_command(NEW_ID, "10.0.0.5")
        self.assertEqual(
            " ".join(command),
            "/usr/bin/systemd-run --quiet --unit=wb-terminal-session-c0ffee00c0ffee00c0ffee00c0ffee00.service"
            " --slice=system.slice --collect"
            " --description=Wiren Board web terminal session c0ffee00c0ffee00c0ffee00c0ffee00"
            " --property=Type=notify --property=NotifyAccess=main --property=TimeoutStartSec=20"
            " --property=SyslogIdentifier=wb-terminal-server"
            " -- /usr/bin/wb-terminal-session c0ffee00c0ffee00c0ffee00c0ffee00 10.0.0.5",
        )

    def test_an_address_is_never_an_option(self):
        """The address comes from a request header, so it goes after `--`."""
        command = listener.unit_command(NEW_ID, "--unit=evil")
        self.assertEqual(command[-4:], ["--", listener.SESSION_ENTRY_POINT, NEW_ID, "--unit=evil"])

    def test_debug_is_passed_on_to_the_session(self):
        """--debug of the listener goes to the session before its arguments, the address stays last."""
        command = listener.unit_command(NEW_ID, "10.0.0.5", debug=True)
        self.assertEqual(
            command[-5:], ["--", listener.SESSION_ENTRY_POINT, registry.DEBUG_OPTION, NEW_ID, "10.0.0.5"]
        )
        self.assertNotIn(registry.DEBUG_OPTION, listener.unit_command(NEW_ID, "10.0.0.5"))
