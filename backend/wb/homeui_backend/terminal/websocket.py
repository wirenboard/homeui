import json
import logging
import socket
from enum import Enum, IntEnum
from typing import Dict, List, Optional, Sequence

from websockets.frames import Frame, Opcode
from websockets.http11 import Request
from websockets.protocol import State
from websockets.server import ServerProtocol
from websockets.typing import Subprotocol

HANDSHAKE_TIMEOUT = 5.0
CLIENT_IO_TIMEOUT = 5.0

MAX_REQUEST_BYTES = 16384
READ_CHUNK = 65536


class CloseCode(IntEnum):
    SESSION_FINISHED = 1000
    SLOT_TAKEN = 1013
    TAKEN_OVER = 4001


class ClientMessageType(Enum):
    INPUT = "input"
    RESIZE = "resize"


class ServerMessageType(Enum):
    SESSION = "session"
    OUTPUT = "output"
    NOTICE = "notice"


class NoticeKind(Enum):
    APT_LOCK = "apt-lock"


class ClientGone(Exception):
    pass


def requested_session(request: Request) -> Optional[str]:
    values = request.headers.get_all("Sec-WebSocket-Protocol")
    if not values:
        return None
    return values[0].split(",")[0].strip() or None


def client_address(request: Request) -> str:
    return next(iter(request.headers.get_all("X-Real-IP")), "")


def peek_request(sock) -> Optional[Request]:
    try:
        sock.settimeout(HANDSHAKE_TIMEOUT)
        data = sock.recv(MAX_REQUEST_BYTES, socket.MSG_PEEK)
    except OSError:
        return None
    finally:
        # The session sets its own timeouts.
        sock.settimeout(None)
    probe = ServerProtocol()
    probe.receive_data(data)
    return _first_request(probe)


def _echo_subprotocol(_protocol: ServerProtocol, offered: Sequence[Subprotocol]) -> Optional[Subprotocol]:
    """A hack to pass the session id in a header: the browser WebSocket API cannot set headers, so
    the tab offers its id as the only subprotocol (Sec-WebSocket-Protocol), keeping it out of the
    URL and the nginx access log. The browser fails the handshake unless the answer names one of
    the subprotocols it offered, so whatever was offered is echoed back as is.
    """
    return offered[0] if offered else None


def _first_request(protocol: ServerProtocol) -> Optional[Request]:
    for event in protocol.events_received():
        if isinstance(event, Request):
            return event
    return None


def write_pending(sock, protocol) -> None:
    for data in protocol.data_to_send():
        if data:
            sock.sendall(data)
        else:
            try:
                sock.shutdown(socket.SHUT_WR)
            except OSError:
                pass


class WebSocketClient:
    def __init__(self, sock, protocol: ServerProtocol):
        self._sock = sock
        self._protocol = protocol

    @classmethod
    def accept(cls, sock) -> Optional["WebSocketClient"]:
        protocol = ServerProtocol(select_subprotocol=_echo_subprotocol)
        try:
            sock.settimeout(HANDSHAKE_TIMEOUT)
            request = cls._read_request(sock, protocol)
            if request is None:
                write_pending(sock, protocol)
                return None
            protocol.send_response(protocol.accept(request))
            write_pending(sock, protocol)
            if protocol.state is not State.OPEN:
                logging.warning("Refused a terminal connection: %s", protocol.handshake_exc)
                return None
            sock.settimeout(CLIENT_IO_TIMEOUT)
        except OSError:
            return None
        return cls(sock, protocol)

    def fileno(self) -> int:
        return self._sock.fileno()

    def send(self, message: Dict) -> None:
        if self._protocol.state is not State.OPEN:
            raise ClientGone("the connection is already closed")
        try:
            self._protocol.send_text(json.dumps(message).encode("utf-8"))
            write_pending(self._sock, self._protocol)
        except OSError as error:
            raise ClientGone(f"write failed: {error}") from error

    def receive(self) -> List[Dict]:
        try:
            data = self._sock.recv(READ_CHUNK)
        except OSError as error:
            raise ClientGone(f"read failed: {error}") from error
        if not data:
            self._protocol.receive_eof()
            raise ClientGone("the client closed the connection")
        self._protocol.receive_data(data)
        messages = [message for message in map(self._message, self._protocol.events_received()) if message]
        try:
            # Pongs and the close echo that the protocol queued by itself.
            write_pending(self._sock, self._protocol)
        except OSError as error:
            raise ClientGone(f"write failed: {error}") from error
        if self._protocol.state is not State.OPEN and not messages:
            raise ClientGone("the client closed the connection")
        return messages

    def close(self, code: CloseCode, reason: str = "") -> None:
        if self._protocol.state is State.OPEN:
            try:
                self._protocol.send_close(int(code), reason[:120])
                write_pending(self._sock, self._protocol)
            except OSError:
                pass

    def drop(self) -> None:
        try:
            self._sock.close()
        except OSError:
            pass

    # --- Private ---

    @staticmethod
    def _read_request(sock, protocol: ServerProtocol) -> Optional[Request]:
        while protocol.handshake_exc is None:
            data = sock.recv(READ_CHUNK)
            if not data:
                protocol.receive_eof()
                return None
            protocol.receive_data(data)
            if (request := _first_request(protocol)) is not None:
                return request
        return None

    def _message(self, event) -> Optional[Dict]:
        if not isinstance(event, Frame) or event.opcode not in (Opcode.TEXT, Opcode.BINARY) or not event.fin:
            return None
        try:
            message = json.loads(event.data.decode("utf-8"))
        except (ValueError, RecursionError) as error:
            logging.debug("Ignoring an unreadable message from a terminal client: %s", type(error).__name__)
            return None
        return message if isinstance(message, dict) else None
