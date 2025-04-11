import json
import unittest
from http.server import BaseHTTPRequestHandler
from unittest.mock import MagicMock

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
)
from wb.homeui_backend.users_storage import User, UsersStorage, UserType


class DeleteUserHandlerTest(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock()
        self.context = WebRequestHandlerContext(users_storage=MagicMock())

    def test_bad_url(self):
        self.request.path = "/users/aaaa/bbbb"
        self.context.user = User("1", "user1", "password1", UserType.ADMIN)
        response = delete_user_handler(self.request, self.context)
        self.assertEqual(response, response_404())

    def test_not_found(self):
        self.request.path = "/users/aaaa"
        self.context.user = User("1", "user1", "password1", UserType.ADMIN)
        self.context.users_storage.get_user_by_id.return_value = None
        response = delete_user_handler(self.request, self.context)
        self.assertEqual(response, response_404())

    def test_delete_self(self):
        self.request.path = "/users/1"
        self.context.user = User("1", "user1", "password1", UserType.ADMIN)
        self.context.users_storage.get_user_by_id.return_value = self.context.user
        response = delete_user_handler(self.request, self.context)

        self.context.users_storage.get_user_by_id.assert_called_once_with(self.context.user.user_id)
        self.assertEqual(response, response_400("Can't delete yourself"))

    def test_success(self):
        self.request.path = "/users/123"
        self.context.user = User("1", "user1", "password1", UserType.ADMIN)
        user_id = "123"
        user = MagicMock()
        user.user_id = user_id
        self.context.users_storage.get_user_by_id.return_value = user
        response = delete_user_handler(self.request, self.context)

        self.context.users_storage.get_user_by_id.assert_called_once_with(user_id)
        self.context.users_storage.delete_user.assert_called_once_with(user_id)
        self.assertEqual(response, response_204())


class GetUsersHandlerTests(unittest.TestCase):
    def test_admin(self):
        users_storage = MagicMock(spec=UsersStorage)
        user = User("1", "user1", "password1", UserType.ADMIN)
        users = [
            User("1", "user1", "password1", UserType.USER),
            User("2", "user2", "password2", UserType.ADMIN),
        ]
        users_storage.get_users.return_value = users

        response = get_users_handler(None, WebRequestHandlerContext(user=user, users_storage=users_storage))

        expected_body = [
            {"id": "1", "login": "user1", "type": UserType.USER.value},
            {"id": "2", "login": "user2", "type": UserType.ADMIN.value},
        ]
        self.assertEqual(
            response, response_200([["Content-type", "application/json"]], json.dumps(expected_body))
        )


class CheckAuthHandlerTests(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock(spec=BaseHTTPRequestHandler)
        self.context = WebRequestHandlerContext(users_storage=MagicMock())

    def test_no_required_user_type_no_user_without_users(self):
        self.context.users_storage.has_users.return_value = False
        self.request.headers = {}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_401())

    def test_no_required_user_type_no_user_with_users(self):
        self.context.users_storage.has_users.return_value = True
        self.request.headers = {}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_401())

    def test_required_user_no_user_without_users(self):
        self.context.users_storage.has_users.return_value = False
        self.request.headers = {"Required-User-Type": "user"}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_401())

    def test_required_user_no_user_with_users(self):
        self.context.users_storage.has_users.return_value = True
        self.request.headers = {"Required-User-Type": "user"}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_401())

    def test_required_user_user_with_users(self):
        self.context.users_storage.has_users.return_value = True
        self.request.headers = {"Required-User-Type": "user"}
        self.context.user = User("1", "user", "password", UserType.USER)
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_200())

    def test_required_admin_user_with_users(self):
        self.context.users_storage.has_users.return_value = True
        self.request.headers = {"Required-User-Type": "admin"}
        self.context.user = User("1", "user", "password", UserType.USER)
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_403())

    def test_required_user_admin_with_users(self):
        self.context.users_storage.has_users.return_value = True
        self.request.headers = {"Required-User-Type": "user"}
        self.context.user = User("1", "user", "password", UserType.ADMIN)
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_200())

    def test_allow_if_no_users(self):
        self.context.users_storage.has_users.return_value = False
        self.request.headers = {"Allow-If-No-Users": "true"}
        response = auth_check_handler(self.request, self.context)
        self.assertEqual(response, response_200())


class WhoAmIHandlerTests(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock(spec=BaseHTTPRequestHandler)
        self.context = WebRequestHandlerContext(users_storage=MagicMock())

    def test_with_authenticated_user(self):
        self.context.users_storage.has_users.return_value = True
        self.context.user = User("1", "user", "password", UserType.USER)
        response = auth_who_am_i_handler(self.request, self.context)
        expected_response = response_200(
            headers=[["Content-type", "application/json"]], body='{"user_type": "user"}'
        )
        self.assertEqual(response, expected_response)

    def test_with_unauthenticated_user(self):
        self.context.users_storage.has_users.return_value = True
        self.context.user = None
        response = auth_who_am_i_handler(self.request, self.context)
        self.assertEqual(response, response_401())

    def test_with_no_users_configured(self):
        self.context.users_storage.has_users.return_value = False
        self.context.user = None
        response = auth_who_am_i_handler(self.request, self.context)
        self.assertEqual(response, response_404())

        self.context.user = User("1", "user", "password", UserType.USER)
        response = auth_who_am_i_handler(self.request, self.context)
        self.assertEqual(response, response_404())


class DeviceInfoHandlerTests(unittest.TestCase):
    def setUp(self):
        self.request = MagicMock()
        self.context = WebRequestHandlerContext(users_storage=MagicMock())

    def test_device_info_handler(self):
        self.request.headers = {"X-Forwarded-Host-Ip": "1.2.3.4"}
        self.context.sn = "ABC123"
        self.context.certificate_thread = MagicMock()
        self.context.certificate_thread.get_state.return_value = CertificateState.VALID
        response = device_info_handler(self.request, self.context)

        self.assertEqual(response.status, 200)
        self.assertEqual(
            response.headers,
            [
                ["Content-type", "application/json"],
                ["Access-Control-Allow-Origin", "*"],
            ],
        )
        self.assertEqual(json.loads(response.body), {"sn": "ABC123", "ip": "1.2.3.4", "https_cert": "valid"})
