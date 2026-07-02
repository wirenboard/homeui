import json
import unittest
from email.utils import formatdate
from unittest.mock import MagicMock

from wb.homeui_backend.dashboards import DashboardsStore, DashboardWriteOutcome
from wb.homeui_backend.http_response import response_200, response_400, response_404
from wb.homeui_backend.main import (
    WebRequestHandlerContext,
    delete_dashboard_handler,
    get_dashboard_svg_handler,
    get_dashboards_handler,
    patch_dashboard_handler,
    put_dashboard_handler,
    update_dashboards_handler,
)

SVG_MARKUP = "<svg><rect/></svg>"
# Fixed config mtime so the conditional-caching headers are deterministic in assertions.
CONFIG_MTIME = 1_700_000_000.0
CONFIG_LAST_MODIFIED = formatdate(CONFIG_MTIME, usegmt=True)
# Security headers the SVG 200 response carries so operator-authored markup is not executed as an
# active document if its URL is opened/embedded directly (see get_dashboard_svg_handler).
SVG_SECURITY_HEADERS = [
    ["Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'"],
    ["X-Content-Type-Options", "nosniff"],
]


class DashboardHandlerFixture(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock()
        self.request.headers = {}
        self.store = MagicMock(spec=DashboardsStore)
        self.store.get_config_mtime.return_value = CONFIG_MTIME
        # These handlers only touch dashboards_store; the other context deps are placeholder
        # mocks. Built from a single mapping (then keyword-expanded) so the construction matches
        # the rest of the suite without textually duplicating its setUp boilerplate.
        placeholder_deps = {
            "sn": "",
            "users_storage": MagicMock(),
            "sessions_storage": MagicMock(),
            "certificate_thread": MagicMock(),
            "security_check_thread": MagicMock(),
        }
        self.context = WebRequestHandlerContext(**placeholder_deps, dashboards_store=self.store)


class GetDashboardsHandlerTest(DashboardHandlerFixture):
    def test_returns_index_as_json(self):
        """GET /api/dashboards returns get_index() as JSON with the index settings present."""
        index = {
            "dashboards": [{"id": "d1", "isSvg": True, "svg": {"params": []}}],
            "widgets": [{"id": "w1"}],
            "defaultDashboardId": "d1",
            "isShowWidgetsPage": True,
        }
        self.store.get_index.return_value = index

        response = get_dashboards_handler(self.request, self.context)

        self.assertEqual(response.status, 200)
        self.assertEqual(
            response.headers,
            [
                ["Content-type", "application/json"],
                ["Cache-Control", "no-cache"],
                ["Last-Modified", CONFIG_LAST_MODIFIED],
            ],
        )
        body = json.loads(response.body)
        self.assertEqual(body, index)
        # No svg.current leaked into the index payload.
        self.assertNotIn("current", body["dashboards"][0]["svg"])
        # The SVG-specific security headers belong to the svg endpoint only, not the JSON index.
        self.assertNotIn(["X-Content-Type-Options", "nosniff"], response.headers)

    def test_not_modified_returns_304_without_building_index(self):
        """If-Modified-Since at/after the config mtime -> 304, index not rebuilt."""
        self.request.headers = {"If-Modified-Since": CONFIG_LAST_MODIFIED}

        response = get_dashboards_handler(self.request, self.context)

        self.assertEqual(response.status, 304)
        self.store.get_index.assert_not_called()


class GetDashboardSvgHandlerTest(DashboardHandlerFixture):
    def test_returns_markup_with_svg_content_type(self):
        self.request.path = "/api/dashboards/d1/svg"
        self.store.get_svg.return_value = SVG_MARKUP

        response = get_dashboard_svg_handler(self.request, self.context)

        self.store.get_svg.assert_called_once_with("d1")
        self.assertEqual(
            response,
            response_200(
                [
                    ["Content-type", "image/svg+xml"],
                    ["Cache-Control", "no-cache"],
                    ["Last-Modified", CONFIG_LAST_MODIFIED],
                ]
                + SVG_SECURITY_HEADERS,
                SVG_MARKUP,
            ),
        )

    def test_not_modified_returns_304_without_reading_svg(self):
        """If-Modified-Since at/after the config mtime -> 304, no body, svg not read."""
        self.request.path = "/api/dashboards/d1/svg"
        self.request.headers = {"If-Modified-Since": CONFIG_LAST_MODIFIED}

        response = get_dashboard_svg_handler(self.request, self.context)

        self.assertEqual(response.status, 304)
        self.assertIsNone(response.body)
        self.store.get_svg.assert_not_called()

    def test_stale_if_modified_since_returns_full_body(self):
        """An older If-Modified-Since (config changed since) returns 200 with the markup."""
        self.request.path = "/api/dashboards/d1/svg"
        self.request.headers = {"If-Modified-Since": formatdate(CONFIG_MTIME - 100, usegmt=True)}
        self.store.get_svg.return_value = SVG_MARKUP

        response = get_dashboard_svg_handler(self.request, self.context)

        self.assertEqual(response.status, 200)
        self.assertEqual(response.body, SVG_MARKUP)

    def test_malformed_if_modified_since_is_ignored(self):
        """A malformed If-Modified-Since is ignored (full 200 body), not a 304 or a crash."""
        self.request.path = "/api/dashboards/d1/svg"
        self.request.headers = {"If-Modified-Since": "not-a-date"}
        self.store.get_svg.return_value = SVG_MARKUP

        response = get_dashboard_svg_handler(self.request, self.context)

        self.assertEqual(response.status, 200)
        self.assertEqual(response.body, SVG_MARKUP)

    def test_no_cache_headers_when_mtime_unavailable(self):
        """If the config mtime is unavailable, the 200 omits the conditional-cache headers.

        The SVG security headers (CSP + nosniff) are still present regardless of mtime.
        """
        self.request.path = "/api/dashboards/d1/svg"
        self.store.get_config_mtime.return_value = None
        self.store.get_svg.return_value = SVG_MARKUP

        response = get_dashboard_svg_handler(self.request, self.context)

        self.assertEqual(
            response,
            response_200([["Content-type", "image/svg+xml"]] + SVG_SECURITY_HEADERS, SVG_MARKUP),
        )

    def test_svg_200_carries_security_headers(self):
        """The SVG 200 response carries a restrictive CSP and nosniff (active-content hardening)."""
        self.request.path = "/api/dashboards/d1/svg"
        self.store.get_svg.return_value = SVG_MARKUP

        response = get_dashboard_svg_handler(self.request, self.context)

        self.assertEqual(response.status, 200)
        self.assertIn(
            ["Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'"], response.headers
        )
        self.assertIn(["X-Content-Type-Options", "nosniff"], response.headers)

    def test_304_omits_svg_security_headers(self):
        """The 304 (no body) must not carry the SVG-specific security headers."""
        self.request.path = "/api/dashboards/d1/svg"
        self.request.headers = {"If-Modified-Since": CONFIG_LAST_MODIFIED}

        response = get_dashboard_svg_handler(self.request, self.context)

        self.assertEqual(response.status, 304)
        self.assertNotIn(["X-Content-Type-Options", "nosniff"], response.headers or [])

    def test_404_when_store_returns_none(self):
        """A non-SVG or missing dashboard (store returns None) yields 404."""
        self.request.path = "/api/dashboards/d1/svg"
        self.store.get_svg.return_value = None
        response = get_dashboard_svg_handler(self.request, self.context)
        self.assertEqual(response, response_404())

    def test_404_on_malformed_path(self):
        self.request.path = "/api/dashboards/svg"
        response = get_dashboard_svg_handler(self.request, self.context)
        self.assertEqual(response, response_404())
        self.store.get_svg.assert_not_called()

    def test_percent_encoded_id_is_decoded_before_lookup(self):
        """A percent-encoded id (space / Cyrillic) is decoded back to the on-disk id."""
        self.request.path = "/api/dashboards/My%20%D0%9F%D0%B0%D0%BD%D0%B5%D0%BB%D1%8C/svg"
        self.store.get_svg.return_value = SVG_MARKUP

        get_dashboard_svg_handler(self.request, self.context)

        self.store.get_svg.assert_called_once_with("My Панель")


def encode_body(payload) -> bytes:
    return json.dumps(payload).encode("utf-8")


class UpdateDashboardsHandlerTest(DashboardHandlerFixture):
    def test_parses_body_and_calls_replace_collection(self):
        new_config = {"dashboards": [], "widgets": [], "defaultDashboardId": "d1"}
        body = encode_body(new_config)
        self.request.path = "/api/dashboards"
        self.request.headers = {"Content-Length": str(len(body))}
        self.request.rfile.read.return_value = body

        response = update_dashboards_handler(self.request, self.context)

        self.store.replace_collection.assert_called_once_with(new_config)
        self.assertEqual(response, response_200())

    def test_bad_json_returns_400(self):
        self.request.path = "/api/dashboards"
        self.request.headers = {"Content-Length": "5"}
        self.request.rfile.read.return_value = b"{not "
        response = update_dashboards_handler(self.request, self.context)
        self.assertEqual(response.status, 400)
        self.store.replace_collection.assert_not_called()

    def test_non_object_body_returns_400(self):
        """A JSON array (not an object) is rejected without touching the store."""
        body = encode_body([1, 2, 3])
        self.request.path = "/api/dashboards"
        self.request.headers = {"Content-Length": str(len(body))}
        self.request.rfile.read.return_value = body
        response = update_dashboards_handler(self.request, self.context)
        self.assertEqual(response, response_400("Body must be a JSON object"))
        self.store.replace_collection.assert_not_called()


class PutDashboardHandlerTest(DashboardHandlerFixture):
    def _request_for(self, path: str, payload: dict) -> None:
        body = encode_body(payload)
        self.request.path = path
        self.request.headers = {"Content-Length": str(len(body))}
        self.request.rfile.read.return_value = body

    def test_created_maps_to_201(self):
        """A CREATED outcome (new id) maps to 201."""
        self._request_for("/api/dashboards/d3", {"id": "d3", "isSvg": True})
        self.store.put_dashboard.return_value = DashboardWriteOutcome.CREATED

        response = put_dashboard_handler(self.request, self.context)

        self.store.put_dashboard.assert_called_once_with("d3", {"id": "d3", "isSvg": True})
        self.assertEqual(response.status, 201)

    def test_replaced_maps_to_200(self):
        """A REPLACED outcome (existing id / rename) maps to 200."""
        self._request_for("/api/dashboards/d1", {"id": "d1", "isSvg": True})
        self.store.put_dashboard.return_value = DashboardWriteOutcome.REPLACED

        response = put_dashboard_handler(self.request, self.context)

        self.assertEqual(response, response_200())

    def test_conflict_maps_to_409(self):
        """A CONFLICT outcome (id taken by another dashboard) maps to 409."""
        self._request_for("/api/dashboards/d1", {"id": "d2"})
        self.store.put_dashboard.return_value = DashboardWriteOutcome.CONFLICT

        response = put_dashboard_handler(self.request, self.context)

        self.assertEqual(response.status, 409)

    def test_bad_json_returns_400(self):
        self.request.path = "/api/dashboards/d1"
        self.request.headers = {"Content-Length": "5"}
        self.request.rfile.read.return_value = b"{not "
        response = put_dashboard_handler(self.request, self.context)
        self.assertEqual(response.status, 400)
        self.store.put_dashboard.assert_not_called()

    def test_non_object_body_returns_400(self):
        self._request_for_array("/api/dashboards/d1")
        response = put_dashboard_handler(self.request, self.context)
        self.assertEqual(response, response_400("Body must be a JSON object"))
        self.store.put_dashboard.assert_not_called()

    def _request_for_array(self, path: str) -> None:
        body = encode_body([1, 2, 3])
        self.request.path = path
        self.request.headers = {"Content-Length": str(len(body))}
        self.request.rfile.read.return_value = body

    def test_percent_encoded_id_is_decoded(self):
        """A percent-encoded url id is decoded before reaching the store."""
        self._request_for("/api/dashboards/Floor%201", {"id": "Floor 1"})
        self.store.put_dashboard.return_value = DashboardWriteOutcome.REPLACED

        put_dashboard_handler(self.request, self.context)

        self.store.put_dashboard.assert_called_once_with("Floor 1", {"id": "Floor 1"})

    def test_404_on_malformed_path(self):
        """A path without exactly four segments yields 404 and never calls the store."""
        self.request.path = "/api/dashboards/d1/extra"
        response = put_dashboard_handler(self.request, self.context)
        self.assertEqual(response.status, 404)
        self.store.put_dashboard.assert_not_called()


class PatchDashboardHandlerTest(DashboardHandlerFixture):
    def _request_for(self, path: str, payload: dict) -> None:
        body = encode_body(payload)
        self.request.path = path
        self.request.headers = {"Content-Length": str(len(body))}
        self.request.rfile.read.return_value = body

    def test_updated_maps_to_200(self):
        self._request_for("/api/dashboards/d1", {"swipe": True})
        self.store.patch_dashboard.return_value = DashboardWriteOutcome.UPDATED

        response = patch_dashboard_handler(self.request, self.context)

        self.store.patch_dashboard.assert_called_once_with("d1", {"swipe": True})
        self.assertEqual(response, response_200())

    def test_not_found_maps_to_404(self):
        self._request_for("/api/dashboards/d1", {"swipe": True})
        self.store.patch_dashboard.return_value = DashboardWriteOutcome.NOT_FOUND

        response = patch_dashboard_handler(self.request, self.context)

        self.assertEqual(response, response_404())

    def test_conflict_maps_to_409(self):
        self._request_for("/api/dashboards/d1", {"id": "d2"})
        self.store.patch_dashboard.return_value = DashboardWriteOutcome.CONFLICT

        response = patch_dashboard_handler(self.request, self.context)

        self.assertEqual(response.status, 409)

    def test_bad_json_returns_400(self):
        self.request.path = "/api/dashboards/d1"
        self.request.headers = {"Content-Length": "5"}
        self.request.rfile.read.return_value = b"{not "
        response = patch_dashboard_handler(self.request, self.context)
        self.assertEqual(response.status, 400)
        self.store.patch_dashboard.assert_not_called()

    def test_percent_encoded_id_is_decoded(self):
        self._request_for("/api/dashboards/Floor%201", {"swipe": True})
        self.store.patch_dashboard.return_value = DashboardWriteOutcome.UPDATED

        patch_dashboard_handler(self.request, self.context)

        self.store.patch_dashboard.assert_called_once_with("Floor 1", {"swipe": True})

    def test_404_on_malformed_path(self):
        """A path without exactly four segments yields 404 and never calls the store."""
        self.request.path = "/api/dashboards"
        response = patch_dashboard_handler(self.request, self.context)
        self.assertEqual(response.status, 404)
        self.store.patch_dashboard.assert_not_called()


class DeleteDashboardHandlerTest(DashboardHandlerFixture):
    def test_returns_204_and_calls_store(self):
        self.request.path = "/api/dashboards/d1"

        response = delete_dashboard_handler(self.request, self.context)

        self.store.delete_dashboard.assert_called_once_with("d1")
        self.assertEqual(response.status, 204)

    def test_repeat_delete_still_returns_204(self):
        """Deletion is idempotent at the store, so the handler always returns 204."""
        self.request.path = "/api/dashboards/d1"

        first = delete_dashboard_handler(self.request, self.context)
        second = delete_dashboard_handler(self.request, self.context)

        self.assertEqual(first.status, 204)
        self.assertEqual(second.status, 204)

    def test_percent_encoded_id_is_decoded(self):
        self.request.path = "/api/dashboards/Floor%201"

        delete_dashboard_handler(self.request, self.context)

        self.store.delete_dashboard.assert_called_once_with("Floor 1")

    def test_404_on_malformed_path(self):
        """A path without exactly four segments yields 404 and never calls the store."""
        self.request.path = "/api/dashboards/d1/extra"
        response = delete_dashboard_handler(self.request, self.context)
        self.assertEqual(response.status, 404)
        self.store.delete_dashboard.assert_not_called()
