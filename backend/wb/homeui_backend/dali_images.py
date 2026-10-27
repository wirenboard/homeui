#!/usr/bin/env python3

import http.client
import logging
import os
import re
import socketserver
import threading
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler

DEFAULT_SOCKET_FILE = "/tmp/wb-homeui-dali-images.socket"
IMAGES_URL = "https://fw-releases.wirenboard.com/static/dali/{gtin}.webp"
FETCH_TIMEOUT_S = 10
MAX_IMAGE_SIZE = 1024 * 1024

# GTIN without leading zeros, as the frontend builds it, so each picture has one cache key.
PATH_RE = re.compile(r"^/dali-images/([1-9][0-9]{0,13})\.webp$")


class FetchError(Exception):
    def __init__(self, status: HTTPStatus, reason: str):
        super().__init__(reason)
        self.status = status


def fetch_image(gtin: str) -> tuple[bytes, str]:
    """Download the picture for gtin. Returns (body, content type), raises FetchError."""
    url = IMAGES_URL.format(gtin=gtin)
    request = urllib.request.Request(url, headers={"User-Agent": "wb-homeui-backend"})
    try:
        with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_S) as response:
            content_type = response.headers.get_content_type()
            if not content_type.startswith("image/"):
                raise FetchError(HTTPStatus.BAD_GATEWAY, f"{url}: not an image ({content_type})")
            body = response.read(MAX_IMAGE_SIZE + 1)
            if len(body) > MAX_IMAGE_SIZE:
                raise FetchError(HTTPStatus.BAD_GATEWAY, f"{url}: larger than {MAX_IMAGE_SIZE} bytes")
            # read(amt) returns what came without an error when the connection drops mid-body.
            if response.length:
                raise FetchError(HTTPStatus.BAD_GATEWAY, f"{url}: cut short")
    except urllib.error.HTTPError as e:
        if e.code == HTTPStatus.NOT_FOUND:
            raise FetchError(HTTPStatus.NOT_FOUND, f"{url}: not found") from e
        raise FetchError(HTTPStatus.BAD_GATEWAY, f"{url}: HTTP {e.code}") from e
    except TimeoutError as e:
        raise FetchError(HTTPStatus.GATEWAY_TIMEOUT, f"{url}: timed out") from e
    except urllib.error.URLError as e:
        if isinstance(e.reason, TimeoutError):
            raise FetchError(HTTPStatus.GATEWAY_TIMEOUT, f"{url}: timed out") from e
        raise FetchError(HTTPStatus.BAD_GATEWAY, f"{url}: {e.reason}") from e
    except (OSError, http.client.HTTPException) as e:
        raise FetchError(HTTPStatus.BAD_GATEWAY, f"{url}: {e}") from e
    return body, content_type


class DaliImagesRequestHandler(BaseHTTPRequestHandler):
    enable_debug: bool = False

    def do_GET(self) -> None:  # pylint: disable=invalid-name
        match = PATH_RE.match(self.path)
        if match is None:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            body, content_type = fetch_image(match.group(1))
        except FetchError as e:
            if e.status != HTTPStatus.NOT_FOUND:
                logging.warning("DALI picture: %s", e)
            self.send_error(e.status)
            return
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # pylint: disable=redefined-builtin
        if self.enable_debug:
            super().log_message(format, *args)


class ThreadingUnixHttpServer(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True

    def get_request(self):
        request, client_address = super().get_request()
        if len(client_address) == 0:
            # BaseHTTPRequestHandler expects a tuple with the client address and port
            client_address = (self.server_address, 0)
        return (request, client_address)


def start_server(socket_file: str, enable_debug: bool) -> ThreadingUnixHttpServer:
    """Serve pictures on their own socket and threads: a slow external host must not
    hold up the main server, which also answers nginx auth checks."""
    DaliImagesRequestHandler.enable_debug = enable_debug
    try:
        os.remove(socket_file)
    except OSError:
        pass
    server = ThreadingUnixHttpServer(socket_file, DaliImagesRequestHandler)
    os.chmod(socket_file, 0o662)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server
