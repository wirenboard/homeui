"""Cross-version contract between the listener and sessions, pinned to literal values.

Sessions outlive the package that started them, so after an upgrade or rollback a listener talks
to sessions of another version. They share only the registry location, socket naming and the
control-socket wire format. A failure here means running sessions become unreachable after an
upgrade or rollback: change these values only with a migration plan.
"""

import os
import socket
import unittest

import pytest
from tests.terminal_helpers import TerminalTestBase, listening_socket
from wb.homeui_backend.terminal import registry

SESSION_ID = "0123456789abcdef0123456789abcdef"
SOCKET_NAME = f"{SESSION_ID}.4242.sock"


class LiteralValuesTest(unittest.TestCase):
    def test_the_registry_is_where_every_version_looks(self):
        self.assertEqual(registry.RUNTIME_DIR, "/run/wb-terminal-server")

    def test_the_order_to_go_is_a_single_zero_byte(self):
        self.assertEqual(registry.GO_BYTE, b"\0")

    def test_a_socket_is_named_by_the_id_and_the_login_pid(self):
        self.assertEqual(
            os.path.basename(registry.control_socket_path("/run/x", SESSION_ID, 4242)), SOCKET_NAME
        )
        found = registry.SOCKET_NAME_RE.match(SOCKET_NAME)
        self.assertIsNotNone(found)
        self.assertEqual(found.group("session_id"), SESSION_ID)
        self.assertEqual(found.group("login_pid"), "4242")


@pytest.mark.parametrize(
    "name",
    [
        f"{SESSION_ID.upper()}.4242.sock",
        f"{SESSION_ID}.sock",
        f"{SESSION_ID}.0.sock",
        f"{SESSION_ID}.04242.sock",
        f"{SESSION_ID}.-4242.sock",
        f"{SESSION_ID}.4242.sock.tmp",
        f"{SESSION_ID}.4242",
        f"{SESSION_ID}-4242.sock",
        f"{SESSION_ID[:-1]}.4242.sock",
        f"{SESSION_ID * 2}0.4242.sock",
        f"x{SESSION_ID}.4242.sock",
    ],
)
def test_other_names_are_not_sessions(name):
    assert registry.SOCKET_NAME_RE.match(name) is None


class ControlSocketWireTest(TerminalTestBase):
    """The control-socket wire format."""

    def setUp(self):
        super().setUp()
        self.path = registry.control_socket_path(self.runtime_dir, SESSION_ID, 4242)
        self.server = listening_socket(self.path)
        self.addCleanup(self.server.close)

    def test_a_client_is_one_go_byte_with_the_descriptor_attached(self):
        """send_fd sends GO_BYTE with the client's descriptor in SCM_RIGHTS."""
        client, _peer = self.socket_pair()
        self.assertTrue(registry.send_fd(self.path, client.fileno()))
        conn, _addr = self.server.accept()
        with conn:
            data, fds, _flags, _addr = socket.recv_fds(conn, 16, 2)
        for fd in fds:
            self.addCleanup(os.close, fd)
        self.assertEqual(data, registry.GO_BYTE)
        self.assertEqual(len(fds), 1)

    def test_what_send_fd_sends_is_received_as_that_client(self):
        """What send_fd sends is received as a client (not a stop order) on the same connection."""
        client, peer = self.socket_pair()
        self.assertTrue(registry.send_fd(self.path, client.fileno()))
        conn, _addr = self.server.accept()
        with conn:
            message = registry.receive_control_message(conn)
        self.addCleanup(os.close, message.fd)
        self.assertFalse(message.go)
        with socket.socket(fileno=os.dup(message.fd)) as received:
            received.sendall(b"hello")
        self.assertEqual(peer.recv(16), b"hello")

    def test_a_bare_go_byte_is_the_order_to_go(self):
        sender, receiver = self.socket_pair()
        sender.sendall(registry.GO_BYTE)
        self.assertEqual(registry.receive_control_message(receiver), registry.ControlMessage(go=True))
