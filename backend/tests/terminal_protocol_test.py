import os
import socket
import unittest
from unittest.mock import patch

import pytest
from tests.terminal_helpers import (
    FakeBrowser,
    TerminalTestBase,
    abandoned_socket,
    listening_socket,
    unreadable_message,
)
from wb.homeui_backend.terminal import login, registry, websocket


class PeekRequestTest(TerminalTestBase):
    """The listener peeks at the request head without consuming it."""

    def test_the_request_is_read_and_left_where_it_was(self):
        """After the peek for id and address, the handshake still sees the whole request and answers 101."""
        browser = FakeBrowser(session_id="a" * 32)
        self.addCleanup(browser.sock.close)
        self.addCleanup(browser.server_side.close)

        request = websocket.peek_request(browser.server_side)
        self.assertEqual(websocket.requested_session(request), "a" * 32)
        self.assertEqual(websocket.client_address(request), "10.0.0.5")

        client = websocket.WebSocketClient.accept(browser.server_side)
        self.assertIsNotNone(client)
        browser.messages(0.2)
        self.assertEqual(browser.status_code, 101)

    def test_garbage_is_not_waited_for(self):
        left, right = self.socket_pair()
        left.sendall(b"not http at all\r\n\r\n")
        self.assertIsNone(websocket.peek_request(right))

    def test_an_unfinished_head_is_not_a_request(self):
        left, right = self.socket_pair()
        left.sendall(b"GET /api/terminal HTTP/1.1\r\nHost: wb\r\n")
        with patch.object(websocket, "HANDSHAKE_TIMEOUT", 0.2):
            self.assertIsNone(websocket.peek_request(right))

    def test_without_address_headers_there_is_no_address(self):
        left, right = self.socket_pair()
        left.sendall(
            b"GET /api/terminal HTTP/1.1\r\nHost: wb\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            b"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        self.assertEqual(websocket.client_address(websocket.peek_request(right)), "")


class HandshakeSubprotocolTest(TerminalTestBase):
    """The id comes as a subprotocol; browsers fail a handshake that does not select the offered one."""

    def handshake(self, session_id=None):
        browser = FakeBrowser(session_id=session_id)
        self.addCleanup(browser.sock.close)
        self.addCleanup(browser.server_side.close)
        self.assertIsNotNone(websocket.WebSocketClient.accept(browser.server_side))
        browser.messages(0.2)
        self.assertEqual(browser.status_code, 101)
        return browser.response

    def test_the_offered_id_is_selected_as_it_is(self):
        """The offered id is echoed back, even by a new session started for a stale id."""
        response = self.handshake("c" * 32)
        self.assertEqual(response.headers.get_all("Sec-WebSocket-Protocol"), ["c" * 32])

    def test_without_an_offer_none_is_selected(self):
        """No offer, so the response must not name a subprotocol."""
        response = self.handshake()
        self.assertEqual(response.headers.get_all("Sec-WebSocket-Protocol"), [])


def request_with_protocols(target, protocols):
    """A handshake request with these raw `Sec-WebSocket-Protocol` header values."""
    lines = [
        f"GET {target} HTTP/1.1",
        "Host: wb",
        "Upgrade: websocket",
        "Connection: Upgrade",
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
        "Sec-WebSocket-Version: 13",
    ]
    lines += [f"Sec-WebSocket-Protocol: {value}" for value in protocols]
    return ("\r\n".join(lines) + "\r\n\r\n").encode("ascii")


@pytest.mark.parametrize(
    "target,protocols,expected",
    [
        ("/api/terminal", [], None),
        ("/api/terminal", ["a" * 32], "a" * 32),
        ("/api/terminal", ["A" * 32], "A" * 32),
        ("/api/terminal", [" " + "b" * 40 + " , other"], "b" * 40),
        ("/api/terminal", ["b" * 40, "other"], "b" * 40),
        ("/api/terminal?session=" + "a" * 32, [], None),
    ],
)
def test_the_requested_session_is_taken_from_the_subprotocol(target, protocols, expected):
    """The first offered value, trimmed; the URL query is ignored."""
    left, right = socket.socketpair(socket.AF_UNIX, socket.SOCK_STREAM)
    with left, right:
        left.sendall(request_with_protocols(target, protocols))
        assert websocket.requested_session(websocket.peek_request(right)) == expected


def test_new_session_id_is_128_bits_of_hex():
    first, second = registry.new_session_id(), registry.new_session_id()
    assert registry.SOCKET_NAME_RE.match(f"{first}.1.sock")
    assert len(first) == 32
    assert first != second


class WebSocketClientTest(unittest.TestCase):
    """WebSocketClient over a socketpair."""

    def setUp(self):
        self.browser = FakeBrowser()
        self.addCleanup(self.browser.sock.close)
        self.client = websocket.WebSocketClient.accept(self.browser.server_side)
        self.addCleanup(self.browser.server_side.close)

    def test_the_handshake_is_answered(self):
        self.assertIsNotNone(self.client)
        self.browser.messages(0.2)
        self.assertEqual(self.browser.status_code, 101)

    def test_messages_go_both_ways(self):
        self.client.send({"type": "session", "id": "a" * 32})
        self.assertEqual(self.browser.message_of_type("session")["id"], "a" * 32)
        self.browser.send({"type": "input", "data": "AA=="})
        self.assertEqual(self.client.receive(), [{"type": "input", "data": "AA=="}])

    def test_a_message_split_across_frames_is_dropped(self):
        """Fragmented messages are not reassembled (the UI never fragments); the next one is read."""
        self.browser.send_in_two_frames({"type": "input", "data": "SGVsbG8="})
        self.assertEqual(self.client.receive(), [])
        self.browser.send({"type": "input", "data": "AA=="})
        self.assertEqual(self.client.receive(), [{"type": "input", "data": "AA=="}])

    def test_a_ping_does_not_disturb_the_message_flow(self):
        """A ping yields no message; the following message comes through."""
        self.browser.send_ping()
        self.assertEqual(self.client.receive(), [])
        self.browser.send({"type": "resize", "cols": 80, "rows": 24})
        self.assertEqual(self.client.receive(), [{"type": "resize", "cols": 80, "rows": 24}])

    def test_a_message_that_cannot_be_read_is_dropped(self):
        """Too deeply nested JSON is dropped and logged at DEBUG only, without its text.

        The connection then carries on with the next message.
        """
        with self.assertLogs(level="DEBUG") as logs:
            self.browser.send_text(unreadable_message())
            self.assertEqual(self.client.receive(), [])
            self.browser.send_text(unreadable_message())
            self.assertEqual(self.client.receive(), [])
        self.assertTrue(all(line.startswith("DEBUG") for line in logs.output))
        self.assertIn("RecursionError", logs.output[0])

        self.browser.send({"type": "input", "data": "AA=="})
        self.assertEqual(self.client.receive(), [{"type": "input", "data": "AA=="}])

    def test_a_close_from_the_browser_ends_the_connection(self):
        self.browser.disconnect()
        with self.assertRaises(websocket.ClientGone):
            self.client.receive()

    def test_a_bare_close_frame_ends_the_connection_at_once(self):
        """A close frame with the socket still open ends the connection; the browser still gets 1000."""
        self.browser.send_close()
        with self.assertRaises(websocket.ClientGone):
            self.client.receive()
        self.browser.messages(0.2)
        self.assertEqual(self.browser.close_code, 1000)

    def test_a_message_that_comes_with_the_close_frame_is_not_lost(self):
        """Message and close frame in one read: the message is returned, the close on the next read."""
        self.browser.send_and_close({"type": "input", "data": "AA=="})
        self.assertEqual(self.client.receive(), [{"type": "input", "data": "AA=="}])
        self.browser.disconnect()
        with self.assertRaises(websocket.ClientGone):
            self.client.receive()

    def test_close_carries_the_code(self):
        self.client.close(websocket.CloseCode.SLOT_TAKEN, "evicted")
        self.client.drop()
        self.browser.messages(0.2)
        self.assertEqual(self.browser.close_code, 1013)

    def test_closing_twice_is_harmless(self):
        self.client.close(websocket.CloseCode.SESSION_FINISHED, "done")
        self.client.close(websocket.CloseCode.SESSION_FINISHED, "done again")

    def test_writing_to_a_dead_socket_reports_the_client_gone(self):
        self.browser.disconnect()
        with self.assertRaises(websocket.ClientGone):
            for _ in range(1000):
                self.client.send({"type": "output", "data": "AA=="})


class LoginCommandTest(unittest.TestCase):
    def test_login_is_started_with_p_and_the_browser_address(self):
        self.assertEqual(login.login_command("10.0.0.5"), [login.LOGIN_PATH, "-p", "-h", "10.0.0.5"])

    def test_without_an_address_the_default_host_is_used(self):
        self.assertEqual(login.login_command("")[3], login.DEFAULT_LOGIN_HOST)


class DescriptorPassingTest(TerminalTestBase):
    """send_fd: passing a client descriptor to a session over SCM_RIGHTS."""

    def test_a_socket_that_is_not_there_means_the_session_is_gone(self):
        self.assertFalse(registry.send_fd(os.path.join(self.root, "gone.sock"), 0))

    def test_a_socket_nobody_listens_on_is_removed(self):
        """A refused connection means the session is dead, so its socket is removed."""
        path = os.path.join(self.root, "left-behind.sock")
        abandoned_socket(path)
        self.assertFalse(registry.send_fd(path, 0))
        self.assertFalse(os.path.exists(path))

    def test_a_session_that_does_not_take_the_descriptor_keeps_its_socket(self):
        """A timeout means the session is busy, so its socket stays."""
        path = os.path.join(self.root, "busy.sock")
        self.addCleanup(listening_socket(path).close)
        with patch.object(registry, "TRANSFER_TIMEOUT", 0.05), patch(
            "socket.socket.sendmsg", side_effect=socket.timeout("too slow")
        ):
            self.assertFalse(registry.send_fd(path, 0))
        self.assertTrue(os.path.exists(path))
