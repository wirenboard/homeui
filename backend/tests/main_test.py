import json
import unittest
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from unittest.mock import MagicMock, mock_open, patch

from wb.homeui_backend.cert import CertificateState
from wb.homeui_backend.http_response import (
    response_200,
    response_204,
    response_400,
    response_401,
    response_403,
    response_404,
)
from wb.homeui_backend.main import (
    WebRequestHandlerContext,
    auth_check_handler,
    auth_who_am_i_handler,
    delete_user_handler,
    device_info_handler,
    get_users_handler,
    update_user_handler,
)
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
        )

    def test_device_info_handler(self):
        self.request.headers = {"X-Forwarded-Host-Ip": "1.2.3.4"}
        self.context.sn = "ABC123"
        self.context.certificate_thread = MagicMock()
        self.context.certificate_thread.get_certificate_state.return_value = CertificateState.VALID
        mock_file = mock_open(read_data="SUITE=stable\n")
        with patch("wb.homeui_backend.main.open", mock_file):
            response = device_info_handler(self.request, self.context)

        self.assertEqual(response.status, 200)
        self.assertEqual(
            response.headers,
            [
                ["Content-type", "application/json"],
                ["Access-Control-Allow-Origin", "*"],
            ],
        )
        self.assertEqual(json.loads(response.body), {"sn": "ABC123", "ip": "1.2.3.4", "https_cert": "valid", "release_suite": "stable"})


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
