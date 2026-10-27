import http.client
import io
import os
import shutil
import socket
import tempfile
import unittest
import urllib.error
from email.message import Message
from http import HTTPStatus
from unittest.mock import MagicMock, patch

from wb.homeui_backend import dali_images
from wb.homeui_backend.dali_images import MAX_IMAGE_SIZE, FetchError, fetch_image


def make_response(body: bytes, content_type: str = "image/webp", length_left: int = 0) -> MagicMock:
    headers = Message()
    headers["Content-Type"] = content_type
    response = MagicMock()
    response.headers = headers
    response.length = length_left
    response.read.side_effect = io.BytesIO(body).read
    response.__enter__.return_value = response
    return response


def http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError("https://pictures.example/1.webp", code, "error", Message(), None)


@patch("wb.homeui_backend.dali_images.urllib.request.urlopen")
class FetchImageTest(unittest.TestCase):
    def test_returns_the_picture(self, urlopen):
        """The GTIN goes into the template, the body and its type come back as is."""
        urlopen.return_value = make_response(b"RIFF....WEBP")

        self.assertEqual(fetch_image("6975617411324"), (b"RIFF....WEBP", "image/webp"))
        self.assertEqual(
            urlopen.call_args.args[0].full_url,
            "https://fw-releases.wirenboard.com/static/dali/6975617411324.webp",
        )
        self.assertEqual(urlopen.call_args.kwargs["timeout"], dali_images.FETCH_TIMEOUT_S)

    def test_missing_picture_is_not_found(self, urlopen):
        urlopen.side_effect = http_error(404)

        with self.assertRaises(FetchError) as ctx:
            fetch_image("1")
        self.assertEqual(ctx.exception.status, HTTPStatus.NOT_FOUND)

    def test_other_http_error_is_bad_gateway(self, urlopen):
        urlopen.side_effect = http_error(500)

        with self.assertRaises(FetchError) as ctx:
            fetch_image("1")
        self.assertEqual(ctx.exception.status, HTTPStatus.BAD_GATEWAY)

    def test_timeout_is_gateway_timeout(self, urlopen):
        for error in (TimeoutError(), urllib.error.URLError(TimeoutError())):
            with self.subTest(error=error):
                urlopen.side_effect = error
                with self.assertRaises(FetchError) as ctx:
                    fetch_image("1")
                self.assertEqual(ctx.exception.status, HTTPStatus.GATEWAY_TIMEOUT)

    def test_network_error_is_bad_gateway(self, urlopen):
        """No DNS or no route: the external host is unreachable."""
        for error in (urllib.error.URLError(socket.gaierror(-3, "no DNS")), ConnectionResetError()):
            with self.subTest(error=error):
                urlopen.side_effect = error
                with self.assertRaises(FetchError) as ctx:
                    fetch_image("1")
                self.assertEqual(ctx.exception.status, HTTPStatus.BAD_GATEWAY)

    def test_rejects_not_an_image(self, urlopen):
        """A captive portal or an error page answering 200 must not end up in the cache."""
        urlopen.return_value = make_response(b"<html></html>", "text/html")

        with self.assertRaises(FetchError) as ctx:
            fetch_image("1")
        self.assertEqual(ctx.exception.status, HTTPStatus.BAD_GATEWAY)

    def test_rejects_too_large(self, urlopen):
        urlopen.return_value = make_response(bytes(MAX_IMAGE_SIZE + 1))

        with self.assertRaises(FetchError) as ctx:
            fetch_image("1")
        self.assertEqual(ctx.exception.status, HTTPStatus.BAD_GATEWAY)

    def test_rejects_a_body_cut_short(self, urlopen):
        """The connection dropped mid-body: a partial picture must not end up in the cache.
        With Content-Length read() returns the short body, a chunked body raises."""
        cut_short = make_response(b"RIFF", length_left=8)
        chunked = make_response(b"")
        chunked.read.side_effect = http.client.IncompleteRead(b"RIFF")
        for response in (cut_short, chunked):
            with self.subTest(response=response):
                urlopen.return_value = response
                with self.assertRaises(FetchError) as ctx:
                    fetch_image("1")
                self.assertEqual(ctx.exception.status, HTTPStatus.BAD_GATEWAY)


class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self, socket_file: str):
        super().__init__("localhost")
        self.socket_file = socket_file

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(self.socket_file)


class DaliImagesServerTest(unittest.TestCase):
    def setUp(self):
        tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, tmp_dir, ignore_errors=True)
        self.socket_file = os.path.join(tmp_dir, "images.socket")
        self.server = dali_images.start_server(self.socket_file, False)
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def get(self, path: str) -> http.client.HTTPResponse:
        connection = UnixHTTPConnection(self.socket_file)
        self.addCleanup(connection.close)
        connection.request("GET", path)
        return connection.getresponse()

    @patch("wb.homeui_backend.dali_images.urllib.request.urlopen")
    def test_serves_the_picture(self, urlopen):
        urlopen.return_value = make_response(b"RIFF....WEBP")

        response = self.get("/dali-images/6975617411324.webp")

        self.assertEqual(response.status, HTTPStatus.OK)
        self.assertEqual(response.getheader("Content-Type"), "image/webp")
        self.assertEqual(response.read(), b"RIFF....WEBP")

    @patch("wb.homeui_backend.dali_images.urllib.request.urlopen")
    def test_passes_fetch_error_status(self, urlopen):
        urlopen.side_effect = http_error(404)

        self.assertEqual(self.get("/dali-images/1.webp").status, HTTPStatus.NOT_FOUND)

    @patch("wb.homeui_backend.dali_images.urllib.request.urlopen")
    def test_rejects_a_path_that_is_not_a_gtin(self, urlopen):
        """Only digits without leading zeros, so one picture has one cache entry."""
        for path in (
            "/dali-images/abc.webp",
            "/dali-images/0123.webp",
            "/dali-images/1.png",
            "/other/1.webp",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.get(path).status, HTTPStatus.NOT_FOUND)
        urlopen.assert_not_called()
