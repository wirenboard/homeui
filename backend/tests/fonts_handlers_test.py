import json
import unittest
from unittest.mock import MagicMock

from wb.homeui_backend.fonts import FontsStore
from wb.homeui_backend.http_response import response_404
from wb.homeui_backend.main import (
    WebRequestHandlerContext,
    delete_font_handler,
    get_fonts_handler,
    upload_font_handler,
)


class FontHandlerFixture(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock()
        self.request.headers = {}
        self.store = MagicMock(spec=FontsStore)
        placeholder_deps = {
            "sn": "",
            "users_storage": MagicMock(),
            "sessions_storage": MagicMock(),
            "certificate_thread": MagicMock(),
            "security_check_thread": MagicMock(),
            "dashboards_store": MagicMock(),
        }
        self.context = WebRequestHandlerContext(**placeholder_deps, fonts_store=self.store)


class GetFontsHandlerTest(FontHandlerFixture):
    def test_returns_list(self):
        self.store.list_fonts.return_value = [
            {"name": "A.ttf", "size": 100},
            {"name": "B.woff2", "size": 200},
        ]

        response = get_fonts_handler(self.request, self.context)

        self.assertEqual(response.status, 200)
        body = json.loads(response.body)
        self.assertEqual(len(body), 2)
        self.assertEqual(body[0]["name"], "A.ttf")

    def test_returns_empty_list(self):
        self.store.list_fonts.return_value = []

        response = get_fonts_handler(self.request, self.context)

        self.assertEqual(response.status, 200)
        self.assertEqual(json.loads(response.body), [])


MULTIPART_BOUNDARY = "----TestBoundary"


def make_multipart_body(filename: str, content: bytes) -> bytes:
    body = (
        f"------TestBoundary\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: application/octet-stream\r\n"
        f"\r\n"
    ).encode("utf-8")
    body += content
    body += b"\r\n------TestBoundary--\r\n"
    return body


class UploadFontHandlerTest(FontHandlerFixture):
    def test_upload_returns_201(self):
        body = make_multipart_body("MyFont.ttf", b"fake-ttf-data")
        self.request.headers = {
            "Content-Type": f"multipart/form-data; boundary={MULTIPART_BOUNDARY}",
            "Content-Length": str(len(body)),
        }
        self.request.rfile.read.return_value = body
        self.store.save_font.return_value = {"name": "MyFont.ttf", "size": 13}

        response = upload_font_handler(self.request, self.context)

        self.assertEqual(response.status, 201)
        result = json.loads(response.body)
        self.assertEqual(result["name"], "MyFont.ttf")
        self.store.save_font.assert_called_once()

    def test_upload_bad_extension_returns_400(self):
        body = make_multipart_body("bad.txt", b"data")
        self.request.headers = {
            "Content-Type": f"multipart/form-data; boundary={MULTIPART_BOUNDARY}",
            "Content-Length": str(len(body)),
        }
        self.request.rfile.read.return_value = body
        self.store.save_font.side_effect = ValueError("Unsupported font extension: .txt")

        response = upload_font_handler(self.request, self.context)

        self.assertEqual(response.status, 400)

    def test_missing_content_type_returns_400(self):
        self.request.headers = {"Content-Type": "application/json"}

        response = upload_font_handler(self.request, self.context)

        self.assertEqual(response.status, 400)
        self.store.save_font.assert_not_called()


class DeleteFontHandlerTest(FontHandlerFixture):
    def test_delete_returns_204(self):
        self.request.path = "/api/fonts/MyFont.ttf"
        self.store.delete_font.return_value = True

        response = delete_font_handler(self.request, self.context)

        self.store.delete_font.assert_called_once_with("MyFont.ttf")
        self.assertEqual(response.status, 204)

    def test_delete_missing_returns_404(self):
        self.request.path = "/api/fonts/NoSuch.ttf"
        self.store.delete_font.return_value = False

        response = delete_font_handler(self.request, self.context)

        self.assertEqual(response, response_404())

    def test_percent_encoded_name_is_decoded(self):
        """A percent-encoded font name is decoded before reaching the store."""
        self.request.path = "/api/fonts/My%20Font.ttf"
        self.store.delete_font.return_value = True

        delete_font_handler(self.request, self.context)

        self.store.delete_font.assert_called_once_with("My Font.ttf")

    def test_malformed_path_returns_404(self):
        self.request.path = "/api/fonts"
        response = delete_font_handler(self.request, self.context)
        self.assertEqual(response, response_404())
        self.store.delete_font.assert_not_called()
