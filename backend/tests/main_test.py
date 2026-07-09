import json
import os
import shutil
import tempfile
import unittest
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from unittest.mock import MagicMock, mock_open, patch

from wb.homeui_backend.cert import CertificateState
from wb.homeui_backend.gates import CUSTOM_MENU_DIR as GATES_CUSTOM_MENU_DIR
from wb.homeui_backend.gates import ApplyResult
from wb.homeui_backend.http_response import (
    response_200,
    response_204,
    response_304,
    response_400,
    response_401,
    response_403,
    response_404,
)
from wb.homeui_backend.main import (
    CUSTOM_MENU_DIRS,
    RequestHandler,
    WebRequestHandler,
    WebRequestHandlerContext,
    auth_check_handler,
    auth_who_am_i_handler,
    custom_menu_handler,
    delete_user_handler,
    device_info_handler,
    effective_https_enabled,
    get_required_user_type,
    get_users_handler,
    make_certificate_usable_change_handler,
    security_check_handler,
    update_https_handler,
    update_user_handler,
)
from wb.homeui_backend.rate_limiter import RateLimiter
from wb.homeui_backend.security import MQTT_CHECK_TOPIC, run_security_check
from wb.homeui_backend.sessions_storage import Session, SessionsStorage
from wb.homeui_backend.users_storage import User, UsersStorage, UserType


class DeleteUserHandlerTest(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock()
        self.users_storage_mock = MagicMock(spec=UsersStorage)
        self.context = WebRequestHandlerContext(
            sn="",
            users_storage=self.users_storage_mock,
            sessions_storage=MagicMock(),
            certificate_thread=MagicMock(),
            security_check_thread=MagicMock(),
            dashboards_store=MagicMock(),
            session=Session(
                "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
            ),
        )

    def test_bad_url(self):
        self.request.path = "/users/aaaa/bbbb"
        response = delete_user_handler(self.request, self.context)
        self.assertEqual(response, response_404())

    def test_not_found(self):
        self.request.path = "/users/aaaa"
        self.users_storage_mock.get_user_by_id.return_value = None
        response = delete_user_handler(self.request, self.context)
        self.assertEqual(response, response_404())

    def test_delete_self(self):
        self.request.path = "/users/1"
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        response = delete_user_handler(self.request, self.context)

        self.users_storage_mock.get_user_by_id.assert_called_once_with(self.context.session.user.user_id)
        self.assertEqual(response, response_400("Can't delete yourself"))

    def test_success(self):
        self.request.path = "/users/123"
        user_id = "123"
        user = MagicMock()
        user.user_id = user_id
        self.users_storage_mock.get_user_by_id.return_value = user
        response = delete_user_handler(self.request, self.context)

        self.users_storage_mock.get_user_by_id.assert_called_once_with(user_id)
        self.users_storage_mock.delete_user.assert_called_once_with(user_id)
        self.assertEqual(response, response_204())


class GetUsersHandlerTests(unittest.TestCase):
    def test_admin(self):
        users_storage = MagicMock(spec=UsersStorage)
        session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        users = [
            User("1", "user1", "password1", UserType.USER, False),
            User("2", "user2", "password2", UserType.ADMIN, False),
        ]
        users_storage.get_users.return_value = users

        context = WebRequestHandlerContext(
            sn="",
            users_storage=users_storage,
            sessions_storage=MagicMock(),
            certificate_thread=MagicMock(),
            security_check_thread=MagicMock(),
            dashboards_store=MagicMock(),
            session=session,
        )

        request_mock = MagicMock(spec=BaseHTTPRequestHandler)
        response = get_users_handler(request_mock, context)

        expected_body = [
            {"id": "1", "login": "user1", "type": UserType.USER.value, "autologin": False},
            {"id": "2", "login": "user2", "type": UserType.ADMIN.value, "autologin": False},
        ]
        self.assertEqual(
            response, response_200([["Content-type", "application/json"]], json.dumps(expected_body))
        )


class CheckAuthHandlerTests(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock(spec=BaseHTTPRequestHandler)
        self.users_storage_mock = MagicMock(spec=UsersStorage)
        self.sessions_storage_mock = MagicMock(spec=SessionsStorage)
        self.context = WebRequestHandlerContext(
            sn="",
            users_storage=self.users_storage_mock,
            sessions_storage=self.sessions_storage_mock,
            certificate_thread=MagicMock(),
            security_check_thread=MagicMock(),
            dashboards_store=MagicMock(),
        )

    def test_no_required_user_type_no_user_without_users(self):
        self.users_storage_mock.has_users.return_value = False
        self.users_storage_mock.get_autologin_user.return_value = None
        self.request.headers = {}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_200())

    def test_no_required_user_type_no_user_with_users(self):
        self.users_storage_mock.has_users.return_value = True
        self.users_storage_mock.get_autologin_user.return_value = None
        self.request.headers = {}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_401())

    def test_required_user_no_user_without_users(self):
        self.users_storage_mock.has_users.return_value = False
        self.users_storage_mock.get_autologin_user.return_value = None
        self.request.headers = {"Required-User-Type": "user"}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_200())

    def test_required_user_no_user_with_users(self):
        self.users_storage_mock.has_users.return_value = True
        self.users_storage_mock.get_autologin_user.return_value = None
        self.request.headers = {"Required-User-Type": "user"}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_401())

    def test_required_user_user_with_users(self):
        self.users_storage_mock.has_users.return_value = True
        self.request.headers = {"Required-User-Type": "user"}
        self.context.session = Session(
            "1", User("1", "user", "password", UserType.USER, False), datetime.now(timezone.utc)
        )
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_200(headers=[["Wb-User-Type", "user"]]))

    def test_required_admin_user_with_users(self):
        self.users_storage_mock.has_users.return_value = True
        self.request.headers = {"Required-User-Type": "admin"}
        self.context.session = Session(
            "1", User("1", "user", "password", UserType.USER, False), datetime.now(timezone.utc)
        )
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_403())

    def test_required_user_admin_with_users(self):
        self.users_storage_mock.has_users.return_value = True
        self.request.headers = {"Required-User-Type": "user"}
        self.context.session = Session(
            "1", User("1", "user", "password", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_200(headers=[["Wb-User-Type", "admin"]]))
        self.sessions_storage_mock.update_session_start_date.assert_called_once_with(self.context.session)


class DashboardsAuthorizationTest(unittest.TestCase):
    """The dashboards write endpoints require Required-User-Type=operator (set by nginx).

    Authorization is centralized in auth_check_handler via User.has_access_to, so this asserts
    that boundary directly: read (user) is open to user/operator/admin, write (operator) is
    refused for a plain user but allowed for operator/admin.
    """

    def setUp(self):
        self.request = MagicMock(spec=BaseHTTPRequestHandler)
        self.users_storage_mock = MagicMock(spec=UsersStorage)
        self.users_storage_mock.has_users.return_value = True
        self.sessions_storage_mock = MagicMock(spec=SessionsStorage)
        self.context = WebRequestHandlerContext(
            sn="",
            users_storage=self.users_storage_mock,
            sessions_storage=self.sessions_storage_mock,
            certificate_thread=MagicMock(),
            security_check_thread=MagicMock(),
            dashboards_store=MagicMock(),
        )

    def _check(self, required: str, user_type: UserType) -> int:
        self.request.headers = {"Required-User-Type": required}
        self.context.session = Session("1", User("1", "u", "p", user_type, False), datetime.now(timezone.utc))
        return auth_check_handler(self.request, self.context).status

    def test_read_allowed_for_user_operator_admin(self):
        for user_type in (UserType.USER, UserType.OPERATOR, UserType.ADMIN):
            with self.subTest(user_type=user_type):
                self.assertEqual(self._check("user", user_type), 200)

    def test_write_refused_for_user(self):
        self.assertEqual(self._check("operator", UserType.USER), 403)

    def test_write_allowed_for_operator_and_admin(self):
        for user_type in (UserType.OPERATOR, UserType.ADMIN):
            with self.subTest(user_type=user_type):
                self.assertEqual(self._check("operator", user_type), 200)


class WhoAmIHandlerTests(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock(spec=BaseHTTPRequestHandler)
        self.request.headers = {}
        self.users_storage_mock = MagicMock(spec=UsersStorage)
        self.context = WebRequestHandlerContext(
            sn="",
            users_storage=self.users_storage_mock,
            sessions_storage=MagicMock(),
            certificate_thread=MagicMock(),
            security_check_thread=MagicMock(),
            dashboards_store=MagicMock(),
        )

    def test_with_authenticated_user(self):
        self.users_storage_mock.has_users.return_value = True
        self.context.session = Session(
            "1", User("1", "user", "password", UserType.USER, False), datetime.now(timezone.utc)
        )
        response = auth_who_am_i_handler(self.request, self.context)
        expected_response = response_200(
            headers=[["Content-type", "application/json"]], body='{"user_id": "1", "user_type": "user"}'
        )
        self.assertEqual(response, expected_response)

    def test_with_unauthenticated_user_no_autologin(self):
        self.users_storage_mock.has_users.return_value = True
        self.users_storage_mock.get_autologin_user.return_value = None
        self.context.session = None
        response = auth_who_am_i_handler(self.request, self.context)
        self.assertEqual(response, response_401())

    def test_with_no_users_configured(self):
        self.users_storage_mock.has_users.return_value = False
        self.context.session = None
        response = auth_who_am_i_handler(self.request, self.context)
        self.assertEqual(response, response_404())

        self.context.session = Session(
            "1", User("1", "user", "password", UserType.USER, False), datetime.now(timezone.utc)
        )
        response = auth_who_am_i_handler(self.request, self.context)
        self.assertEqual(response, response_404())


class DeviceInfoHandlerTests(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock()
        self.context = WebRequestHandlerContext(
            sn="",
            users_storage=MagicMock(),
            sessions_storage=MagicMock(),
            certificate_thread=MagicMock(),
            security_check_thread=MagicMock(),
            dashboards_store=MagicMock(),
        )

    def test_device_info_handler(self):
        self.request.headers = {"X-Forwarded-Host-Ip": "1.2.3.4"}
        self.context.sn = "ABC123"
        self.context.certificate_thread = MagicMock()
        self.context.certificate_thread.get_certificate_state.return_value = CertificateState.VALID
        self.context.security_check_thread = MagicMock()
        mock_file = mock_open(read_data="SUITE=stable\nRELEASE_NAME=wb-2602\n")
        with patch("wb.homeui_backend.main.open", mock_file), patch(
            "wb.homeui_backend.main.get_rootfs_expanded", return_value=True
        ) as get_rootfs_expanded_mock:
            response = device_info_handler(self.request, self.context)

        mock_file.assert_called_once_with("/usr/lib/wb-release", "r", encoding="utf-8")
        get_rootfs_expanded_mock.assert_called_once_with()

        self.assertEqual(response.status, 200)
        self.assertEqual(
            response.headers,
            [
                ["Content-type", "application/json"],
                ["Access-Control-Allow-Origin", "*"],
            ],
        )
        self.assertEqual(
            json.loads(response.body),
            {
                "sn": "ABC123",
                "ip": "1.2.3.4",
                "https_cert": "valid",
                "release_suite": "stable",
                "release_name": "wb-2602",
                "rootfs_expanded": True,
            },
        )


class UpdateUserHandlerTest(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock()
        self.users_storage_mock = MagicMock(spec=UsersStorage)
        self.sessions_storage_mock = MagicMock(spec=SessionsStorage)
        self.context = WebRequestHandlerContext(
            sn="",
            users_storage=self.users_storage_mock,
            sessions_storage=self.sessions_storage_mock,
            certificate_thread=MagicMock(),
            security_check_thread=MagicMock(),
            dashboards_store=MagicMock(),
        )

    def test_bad_url(self):
        self.request.path = "/users/aaaa/bbbb"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        response = update_user_handler(self.request, self.context)
        self.assertEqual(response, response_404())

    def test_not_found(self):
        self.request.path = "/users/aaaa"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = None
        response = update_user_handler(self.request, self.context)
        self.assertEqual(response, response_404())

    def test_no_content(self):
        self.request.path = "/users/1"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        self.request.headers = {}
        self.request.rfile.read.return_value = b'{"invalid_json": '  # malformed JSON
        response = update_user_handler(self.request, self.context)
        self.assertEqual(response, response_400("Expecting value: line 1 column 18 (char 17)"))

    def test_bad_json(self):
        self.request.path = "/users/1"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        self.request.headers = {"Content-Type": "application/json", "Content-Length": "18"}
        self.request.rfile.read.return_value = b'{"invalid_json": '  # malformed JSON
        response = update_user_handler(self.request, self.context)
        self.assertEqual(response, response_400("Expecting value: line 1 column 18 (char 17)"))

    def test_update_type(self):
        self.request.path = "/users/1"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        self.request.headers = {"Content-Type": "application/json", "Content-Length": "18"}
        self.request.rfile.read.return_value = b'{"type": "user"}'
        response = update_user_handler(self.request, self.context)
        self.users_storage_mock.update_user.assert_called_once_with(
            User("1", "user1", "password1", UserType.USER, False)
        )
        self.assertEqual(response, response_200())

    def test_update_last_admin_type(self):
        self.request.path = "/users/1"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        self.users_storage_mock.count_users_by_type.return_value = 1
        self.request.headers = {"Content-Type": "application/json", "Content-Length": "18"}
        self.request.rfile.read.return_value = b'{"type": "user"}'
        response = update_user_handler(self.request, self.context)
        self.assertEqual(response, response_400("Can't change the last admin's type"))

    def test_update_login(self):
        self.request.path = "/users/1"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        self.users_storage_mock.get_user_by_login.return_value = None
        self.request.headers = {"Content-Type": "application/json", "Content-Length": "18"}
        self.request.rfile.read.return_value = b'{"login": "user2"}'
        response = update_user_handler(self.request, self.context)
        self.sessions_storage_mock.delete_sessions_by_user.assert_called_once_with(self.context.session.user)
        self.users_storage_mock.update_user.assert_called_once_with(
            User("1", "user2", "password1", UserType.ADMIN, False)
        )
        self.assertEqual(response, response_200())

    def test_update_duplicate_login(self):
        self.request.path = "/users/1"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        self.users_storage_mock.get_user_by_login.return_value = User(
            "2", "user2", "password2", UserType.USER, False
        )
        self.request.headers = {"Content-Type": "application/json", "Content-Length": "18"}
        self.request.rfile.read.return_value = b'{"login": "user2"}'
        response = update_user_handler(self.request, self.context)
        self.assertEqual(response, response_400("Login already exists"))

    def test_update_same_password(self):
        self.request.path = "/users/1"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        self.users_storage_mock.get_user_by_login.return_value = None
        self.request.headers = {"Content-Type": "application/json", "Content-Length": "18"}
        self.request.rfile.read.return_value = b'{"password": "password1"}'
        with patch("wb.homeui_backend.main.check_password") as check_password_mock:
            check_password_mock.return_value = True
            response = update_user_handler(self.request, self.context)
            check_password_mock.assert_called_once_with("password1", "password1")
            self.users_storage_mock.update_user.assert_called_once_with(
                User("1", "user1", "password1", UserType.ADMIN, False)
            )
            self.assertEqual(response, response_200())

    def test_update_password(self):
        self.request.path = "/users/1"
        self.context.session = Session(
            "1", User("1", "user1", "password1", UserType.ADMIN, False), datetime.now(timezone.utc)
        )
        self.users_storage_mock.get_user_by_id.return_value = self.context.session.user
        self.users_storage_mock.get_user_by_login.return_value = None
        self.request.headers = {"Content-Type": "application/json", "Content-Length": "18"}
        self.request.rfile.read.return_value = b'{"password": "password2"}'
        with patch("wb.homeui_backend.main.check_password") as check_password_mock, patch(
            "wb.homeui_backend.main.make_password_hash"
        ) as make_password_hash_mock:
            check_password_mock.return_value = False
            make_password_hash_mock.return_value = "hashed_password"
            response = update_user_handler(self.request, self.context)
            check_password_mock.assert_called_once_with("password2", "password1")
            make_password_hash_mock.assert_called_once_with("password2")
            self.sessions_storage_mock.delete_sessions_by_user.assert_called_once_with(
                self.context.session.user
            )
            self.users_storage_mock.update_user.assert_called_once_with(
                User("1", "user1", "hashed_password", UserType.ADMIN, False)
            )
            self.assertEqual(response, response_200())


class SecurityCheckHandlerTest(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock(spec=BaseHTTPRequestHandler)
        self.request.headers = {
            "X-Forwarded-Proto": "https",
            "X-Forwarded-Host": "example.com",
            "X-Forwarded-Port": "443",
        }
        self.context = WebRequestHandlerContext(
            sn="awb8test",
            users_storage=MagicMock(),
            sessions_storage=MagicMock(),
            certificate_thread=MagicMock(),
            security_check_thread=MagicMock(),
            dashboards_store=MagicMock(),
            session=None,
        )

    def test_security_check_enqueued_and_returns_200(self):
        response = security_check_handler(self.request, self.context)
        self.assertEqual(response.status, 200)

        expected_url = "https://example.com:443/"
        self.context.security_check_thread.request_check.assert_called_once_with(expected_url)

    def test_run_security_check_cooldown_publishes_not_found(self):
        config = json.dumps({"probeOpenPorts": True})
        with patch("wb.homeui_backend.security.open", mock_open(read_data=config)):
            with patch("wb.homeui_backend.security.requests.post") as mock_post:
                mock_response = MagicMock()
                mock_response.json.return_value = {"result": "cooldown"}
                mock_post.return_value = mock_response
                with patch("wb.homeui_backend.security.MQTTClient") as mock_mqtt_client_cls:
                    mock_client = MagicMock()
                    mock_mqtt_client_cls.return_value = mock_client

                    run_security_check("awb8test", "https://example.com/")

                    mock_client.start.assert_called_once()
                    mock_client.publish.assert_called_once_with(
                        MQTT_CHECK_TOPIC, '{"result": "not found"}', True
                    )
                    mock_client.stop.assert_called_once()


class GetRequiredUserTypeTest(unittest.TestCase):
    def test_role_header_parsing(self):
        """A missing, empty (a gate left $wb_role unset) or unknown Required-User-Type
        must fail safe to admin, never raise into a 500."""
        for headers, expected in (
            ({"Required-User-Type": "user"}, UserType.USER),
            ({}, UserType.ADMIN),
            ({"Required-User-Type": ""}, UserType.ADMIN),
            ({"Required-User-Type": "bogus"}, UserType.ADMIN),
        ):
            with self.subTest(headers=headers):
                request = MagicMock()
                request.headers = headers
                self.assertEqual(get_required_user_type(request), expected)


class RequestHandlerRateLimitKeyTest(unittest.TestCase):
    """The per-endpoint rate limit must key on the parsed path, not the raw request
    target. Requests differing only by query string have to share one bucket, so a
    client can't bypass the limit (nor grow RateLimiter.calls unbounded) by varying
    ?params. Guards the urlparse() key normalisation in _request_handler."""

    @staticmethod
    def _handler():
        handler = WebRequestHandler.__new__(WebRequestHandler)
        handler.rate_limiter = RateLimiter()
        handler.users_storage = MagicMock(spec=UsersStorage)
        handler.sessions_storage = MagicMock(spec=SessionsStorage)
        handler.certificate_thread = MagicMock()
        handler.security_check_thread = MagicMock()
        handler.dashboards_store = MagicMock()
        handler.sn = ""
        return handler

    def test_query_string_variants_share_one_bucket(self):
        """Three GETs to /auth/check differing only by ?nonce against a limit of 2:
        they collapse onto a single bucket, so the third is throttled (429)."""
        limit = 2
        handler = self._handler()
        handler.process_response = MagicMock()
        handlers = {
            "/auth/check": RequestHandler(
                fn=lambda request, context: response_200(), rate_per_minute_limit=limit
            )
        }

        statuses = []
        with patch("wb.homeui_backend.main.get_session", return_value=None):
            for nonce in range(limit + 1):
                handler.path = f"/auth/check?nonce={nonce}"
                handler.process_request(handlers)
                statuses.append(handler.process_response.call_args.args[0].status)

        self.assertEqual(statuses, [200, 200, 429])
        self.assertEqual(list(handler.rate_limiter.calls), ["/auth/check"])


class CustomMenuHandlerTest(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root)

    def _make_dir(self, name, files):
        dir_path = os.path.join(self.root, name)
        os.makedirs(dir_path)
        for file_name, items in files.items():
            with open(os.path.join(dir_path, file_name), "w", encoding="utf-8") as f:
                json.dump(items, f)
        return dir_path

    def _call(self, dirs):
        with patch("wb.homeui_backend.main.CUSTOM_MENU_DIRS", tuple(dirs)):
            response = custom_menu_handler(MagicMock(), MagicMock())
        self.assertEqual(response.status, 200)
        return json.loads(response.body)

    def test_default_read_order_is_package_generated_user(self):
        self.assertEqual(
            CUSTOM_MENU_DIRS,
            (
                "/usr/share/wb-mqtt-homeui/custom-menu",
                "/var/lib/wb-homeui/custom-menu",
                "/etc/wb-homeui/custom-menu",
            ),
        )
        # apply_gates writes its menu drop-ins into the served "generated" slot.
        self.assertEqual(CUSTOM_MENU_DIRS[1], GATES_CUSTOM_MENU_DIR)

    def test_collects_items_from_all_dirs_in_read_order(self):
        """All three dirs are served, ordered by dir declaration order (beats file names)."""
        pkg = self._make_dir("pkg", {"z-pkg.json": [{"id": "pkg"}]})
        gen = self._make_dir("gen", {"a-gen.json": [{"id": "gen"}]})
        user = self._make_dir("user", {"m-user.json": [{"id": "user"}]})
        body = self._call([pkg, gen, user])
        self.assertEqual(body, [[{"id": "pkg"}], [{"id": "gen"}], [{"id": "user"}]])

    def test_missing_dirs_are_skipped(self):
        """Absent dirs in the read list are skipped, not fatal; all absent serves []."""
        user = self._make_dir("user", {"item.json": [{"id": "user"}]})
        body = self._call([os.path.join(self.root, "absent1"), user, os.path.join(self.root, "absent2")])
        self.assertEqual(body, [[{"id": "user"}]])
        self.assertEqual(self._call([os.path.join(self.root, "absent1")]), [])

    def test_path_that_is_a_file_is_skipped(self):
        """A file accidentally created at a menu-dir path must not 500 the endpoint."""
        user = self._make_dir("user", {"item.json": [{"id": "user"}]})
        file_path = os.path.join(self.root, "not-a-dir")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("oops")
        self.assertEqual(self._call([file_path, user]), [[{"id": "user"}]])


class ProcessResponseTest(unittest.TestCase):
    def test_sends_304_via_send_response_without_body(self):
        """A 304 is emitted through send_response with its headers and no body, not send_error."""
        handler = WebRequestHandler.__new__(WebRequestHandler)
        handler.send_response = MagicMock()
        handler.send_header = MagicMock()
        handler.end_headers = MagicMock()
        handler.send_error = MagicMock()
        handler.wfile = MagicMock()

        handler.process_response(response_304([["Cache-Control", "no-cache"]]))

        handler.send_response.assert_called_once_with(304)
        handler.send_header.assert_called_once_with("Cache-Control", "no-cache")
        handler.end_headers.assert_called_once()
        handler.wfile.write.assert_not_called()
        handler.send_error.assert_not_called()


class UpdateHttpsHandlerTest(unittest.TestCase):
    def _toggle(self, enabled: bool, apply_result: ApplyResult, cert_usable: bool = True):
        config = MagicMock()
        config.is_https_enabled.return_value = enabled
        context = MagicMock()
        context.certificate_thread.is_certificate_usable.return_value = cert_usable
        request = MagicMock()
        body = json.dumps({"enabled": enabled})
        request.headers = {"Content-Length": str(len(body))}
        request.rfile.read.return_value = body.encode()
        with patch.object(WebRequestHandler, "config", config, create=True), patch(
            "wb.homeui_backend.main.apply_gates", return_value=apply_result
        ) as apply_mock:
            response = update_https_handler(request, context)
        return response, apply_mock

    def test_gates_error_is_reported_in_response(self):
        """A failed gates re-render after the toggle must surface in the response
        body (the toggle itself is applied) instead of being logged only."""
        response, _ = self._toggle(False, ApplyResult(ok=False, error="boom"))
        self.assertEqual(
            response,
            response_200(
                [["Content-type", "application/json"]],
                json.dumps({"enabled": False, "gatesError": "boom"}),
            ),
        )

    def test_gates_success_keeps_plain_response(self):
        response, _ = self._toggle(False, ApplyResult(ok=True))
        self.assertEqual(response, response_200())

    def test_gates_follow_effective_https(self):
        """Toggling HTTPS on applies https gates only if the certificate is usable
        too, so TLS configs never point at a missing file."""
        for usable in (False, True):
            with self.subTest(usable=usable):
                response, apply_mock = self._toggle(True, ApplyResult(ok=True), cert_usable=usable)
                apply_mock.assert_called_once_with(usable)
                self.assertEqual(response, response_200())


class EffectiveHttpsEnabledTest(unittest.TestCase):
    def _effective(self, flag: bool, usable: bool) -> bool:
        config = MagicMock()
        config.is_https_enabled.return_value = flag
        thread = MagicMock()
        thread.is_certificate_usable.return_value = usable
        return effective_https_enabled(config, thread)

    def test_requires_both_flag_and_usable_cert(self):
        self.assertTrue(self._effective(flag=True, usable=True))
        self.assertFalse(self._effective(flag=True, usable=False))
        self.assertFalse(self._effective(flag=False, usable=True))
        self.assertFalse(self._effective(flag=False, usable=False))


class CertificateUsableChangeHandlerTest(unittest.TestCase):
    def _run_handler(self, flag: bool, usable: bool, apply_ok: bool = True):
        config = MagicMock()
        config.is_https_enabled.return_value = flag
        with patch("wb.homeui_backend.main.remove_nginx_https_config") as remove_mock, patch(
            "wb.homeui_backend.main.update_nginx_config"
        ) as update_mock, patch(
            "wb.homeui_backend.main.apply_gates",
            return_value=ApplyResult(ok=apply_ok, error=None if apply_ok else "nginx -t failed"),
        ) as apply_mock:
            make_certificate_usable_change_handler("TESTSN", config)(usable)
        return remove_mock, update_mock, apply_mock

    def test_degradation_removes_tls_config_and_renders_http_gates(self):
        """The certificate disappeared: the main-UI https.conf is dropped before the
        gates re-render, so nginx -t never sees a dangling ssl_certificate."""
        remove_mock, update_mock, apply_mock = self._run_handler(flag=True, usable=False)
        remove_mock.assert_called_once_with()
        update_mock.assert_not_called()
        apply_mock.assert_called_once_with(False)

    def test_recovery_recreates_tls_config_and_renders_https_gates(self):
        remove_mock, update_mock, apply_mock = self._run_handler(flag=True, usable=True)
        update_mock.assert_called_once_with("TESTSN")
        remove_mock.assert_not_called()
        apply_mock.assert_called_once_with(True)

    def test_failed_gates_apply_raises_to_keep_transition_pending(self):
        """A failed gates re-render propagates, so the cert thread retries the transition."""
        with self.assertRaises(RuntimeError):
            self._run_handler(flag=True, usable=True, apply_ok=False)

    def test_recovery_with_flag_off_keeps_http_gates(self):
        _, update_mock, apply_mock = self._run_handler(flag=False, usable=True)
        update_mock.assert_called_once_with("TESTSN")
        apply_mock.assert_called_once_with(False)
