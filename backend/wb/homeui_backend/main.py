#!/usr/bin/env python3

import argparse
import json
import logging
import os
import socketserver
import sqlite3
import subprocess
import traceback
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from http import cookies
from http.server import BaseHTTPRequestHandler
from sys import argv
from typing import Any, Callable, Optional
from urllib.parse import urlparse

import bcrypt
import jwt

from .cert import CertificateCheckingThread
from .http_response import (
    HttpResponse,
    response_200,
    response_201,
    response_204,
    response_400,
    response_401,
    response_403,
    response_404,
    response_500,
)
from .keys_storage import KeysStorage
from .users_storage import User, UsersStorage, UserType

DEFAULT_SOCKET_FILE = "/tmp/wb-homeui.socket"
DEFAULT_DB_FILE = "/var/lib/wb-homeui/users.db"
DB_SCHEMA_VERSION = 0


def make_cookie_value(user_id: str, keys_storage: KeysStorage, expires: Optional[datetime] = None) -> str:
    data: dict[str, Any] = {
        "id": user_id,
    }
    if expires is not None:
        data["exp"] = int(expires.timestamp())
    return jwt.encode(data, keys_storage.get_key(), algorithm="HS256").decode("utf-8")


def decode_cookie_data(cookie: str, keys_storage: KeysStorage) -> dict[str, str]:
    return jwt.decode(cookie, keys_storage.get_key(), algorithms=["HS256"])


def make_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def make_id_cookie(cookie_data: str, secure: bool, expires: Optional[datetime]) -> cookies.SimpleCookie:
    cookie = cookies.SimpleCookie()
    cookie["id"] = cookie_data
    cookie["id"]["path"] = "/"
    cookie["id"]["httponly"] = True
    cookie["id"]["samesite"] = "Lax"
    if secure:
        cookie["id"]["secure"] = True
    if expires:
        cookie["id"]["expires"] = expires.strftime("%a, %d %b %Y %H:%M:%S GMT")
    return cookie


def make_set_cookie_header(cookie: cookies.SimpleCookie) -> list[str]:
    return ["Set-Cookie", cookie.output(header="")]


def get_current_user(
    request: BaseHTTPRequestHandler, users_storage: UsersStorage, keys_storage: KeysStorage
) -> Optional[User]:
    try:
        request_cookie = cookies.SimpleCookie()
        request_cookie.load(request.headers.get("Cookie", ""))
        cookie_id = request_cookie.get("id")
        if cookie_id is not None:
            cookie_data = decode_cookie_data(cookie_id.value, keys_storage)
            now = datetime.now(timezone.utc)
            exp = datetime.fromtimestamp(int(cookie_data.get("exp", int(now.timestamp()))), tz=timezone.utc)
            if exp < now:
                request.log_error("Cookie expired")
                return None
            return users_storage.get_user_by_id(cookie_data.get("id", ""))
        request.log_error("Cookie not found")
    except Exception as e:
        request.log_error("Failed to get user from cookie: %s", str(e))
    return None


def validate_login_request(form: dict) -> None:
    if "password" not in form.keys():
        raise TypeError("No password field in POST arguments")

    if not isinstance(form.get("password"), str) or not form.get("password"):
        raise TypeError("Invalid password field in POST arguments")

    if "login" not in form.keys():
        raise TypeError("No login field in POST arguments")

    if not isinstance(form.get("login"), str) or not form.get("login"):
        raise TypeError("Invalid login field in POST arguments")


def validate_add_user_request(request: dict) -> None:
    if request.get("type") not in [e.value for e in UserType]:
        raise TypeError("Invalid type field in POST arguments")

    if "password" not in request.keys():
        raise TypeError("No password field in POST arguments")

    if not isinstance(request.get("password"), str) or not request.get("password"):
        raise TypeError("Invalid password field in POST arguments")

    if "login" not in request.keys():
        raise TypeError("No login field in POST arguments")

    if not isinstance(request.get("login"), str) or not request.get("login"):
        raise TypeError("Invalid login field in POST arguments")


@dataclass
class WebRequestHandlerContext:
    sn: str
    users_storage: UsersStorage
    keys_storage: KeysStorage
    certificate_thread: CertificateCheckingThread
    user: Optional[User] = None


def get_required_user_type(request: BaseHTTPRequestHandler) -> UserType:
    return UserType(request.headers.get("Required-User-Type", UserType.ADMIN.value))


def get_allow_if_no_users(request: BaseHTTPRequestHandler) -> bool:
    return request.headers.get("Allow-If-No-Users", "false") == "true"


def auth_check_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    allow_if_no_users = get_allow_if_no_users(request)

    # if no users are configured and allow_if_no_users is set to true allow all requests
    if allow_if_no_users and not context.users_storage.has_users():
        return response_200()

    if context.user is None:
        return response_401()

    required_user_type = get_required_user_type(request)
    if context.user.has_access_to(required_user_type):
        return response_200(headers=[["Wb-User-Type", context.user.type.value]])
    return response_403()


def auth_login_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    try:
        length = int(request.headers.get("Content-Length", 0))
        form = json.loads(request.rfile.read(length).decode("utf-8"))
        validate_login_request(form)
    except Exception as e:
        return response_400(str(e))

    user = context.users_storage.get_user_by_login(form.get("login"))

    if user is None or not check_password(form.get("password"), user.pwd_hash):
        return response_401()

    x_forwarded_scheme = request.headers.get("X-Forwarded-Scheme", "http")
    res = {"user_type": user.type.value}
    expires = None
    if user.type == UserType.ADMIN:
        # Set cookie expiration to 14 days for admin users
        expires = datetime.now(timezone.utc) + timedelta(days=14)
    return response_200(
        headers=[
            make_set_cookie_header(
                make_id_cookie(
                    make_cookie_value(user.user_id, context.keys_storage, expires),
                    x_forwarded_scheme == "https",
                    expires,
                )
            ),
            ["Content-type", "application/json"],
        ],
        body=json.dumps(res),
    )


def auth_logout_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    cookie = cookies.SimpleCookie()
    cookie["id"] = ""
    cookie["id"]["path"] = "/"
    cookie["id"]["expires"] = "Thu, 01 Jan 1970 00:00:00 GMT"
    return response_200(headers=[make_set_cookie_header(cookie)])


def auth_who_am_i_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    if context.users_storage.has_users():
        if context.user is None:
            return response_401()
        res = {"user_type": context.user.type.value}
        return response_200([["Content-type", "application/json"]], json.dumps(res))
    return response_404()


def add_user_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    try:
        length = int(request.headers.get("Content-Length", 0))
        form = json.loads(request.rfile.read(length).decode("utf-8"))
        validate_add_user_request(form)
    except Exception as e:
        return response_400(str(e))

    user_to_add = User(
        "", form.get("login"), make_password_hash(form.get("password")), UserType(form.get("type"))
    )

    if not context.users_storage.has_users() and user_to_add.type != UserType.ADMIN:
        return response_400("First setup admin")

    if context.users_storage.get_user_by_login(form.get("login")) is not None:
        return response_400("Login already exists")

    context.users_storage.add_user(user_to_add)
    return response_201([["Content-type", "text/plain"]], user_to_add.user_id)


def get_user_id_from_query(request: BaseHTTPRequestHandler) -> Optional[str]:
    url = urlparse(request.path).path
    query_components = url.split("/")
    return query_components[2] if len(query_components) == 3 else None


def update_user_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    user_id = get_user_id_from_query(request)
    if user_id is None:
        return response_404()

    user = context.users_storage.get_user_by_id(user_id)
    if user is None:
        return response_404()

    try:
        length = int(request.headers.get("Content-Length", 0))
        form = json.loads(request.rfile.read(length).decode("utf-8"))
    except Exception as e:
        return response_400(str(e))

    invalidate_user = False
    new_login = form.get("login")
    if new_login is not None:
        user_with_the_same_login = context.users_storage.get_user_by_login(new_login)

        if user_with_the_same_login is not None and user_with_the_same_login.user_id != user_id:
            return response_400("Login already exists")
        if user.login != new_login:
            user.login = new_login
            invalidate_user = True

    new_password = form.get("password")
    if new_password is not None:
        if not check_password(new_password, user.pwd_hash):
            user.pwd_hash = make_password_hash(new_password)
            invalidate_user = True

    new_type = form.get("type")
    if new_type is not None:
        if user.type == UserType.ADMIN and UserType(new_type) != UserType.ADMIN:
            admin_count = context.users_storage.count_users_by_type(UserType.ADMIN)
            if admin_count == 1:
                return response_400("Can't change the last admin's type")
        user.type = UserType(new_type)

    if invalidate_user:
        context.users_storage.delete_user(user.user_id)
        context.users_storage.add_user(user)
    else:
        context.users_storage.update_user(user)
    return response_200()


def delete_user_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    user_id = get_user_id_from_query(request)
    if user_id is None:
        return response_404()
    user = context.users_storage.get_user_by_id(user_id)
    if user is None:
        return response_404()
    if context.user is not None and user.user_id == context.user.user_id:
        return response_400("Can't delete yourself")
    if user.type == UserType.ADMIN and context.users_storage.count_users_by_type(UserType.ADMIN) == 1:
        return response_400("Can't delete the last admin")
    context.users_storage.delete_user(user_id)
    return response_204()


def get_users_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    users = map(
        lambda user: {"id": user.user_id, "login": user.login, "type": user.type.value},
        context.users_storage.get_users(),
    )
    return response_200([["Content-type", "application/json"]], json.dumps(list(users)))


def device_info_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    host_ip = request.headers.get("X-Forwarded-Host-Ip", "")
    res = {
        "sn": context.sn,
        "ip": host_ip,
        "https_cert": context.certificate_thread.get_state().value,
    }
    return response_200(
        [
            ["Content-type", "application/json"],
            ["Access-Control-Allow-Origin", "*"],
        ],
        json.dumps(res),
    )


def https_setup_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    context.certificate_thread.request_certificate()
    return response_200()


def find_handler(
    url: str, handlers: dict
) -> Optional[Callable[[BaseHTTPRequestHandler, WebRequestHandlerContext], HttpResponse]]:
    url_components = urlparse(url).path.split("/")
    for pattern, handler in handlers.items():
        pattern_components = pattern.split("/")
        if len(url_components) == len(pattern_components):
            i = 0
            while pattern_components[i] == "*" or pattern_components[i] == url_components[i]:
                if i == len(pattern_components) - 1:
                    return handler
                i += 1
    return None


class WebRequestHandler(BaseHTTPRequestHandler):
    users_storage: UsersStorage
    keys_storage: KeysStorage
    enable_debug: bool = False
    sn: str = ""
    certificate_thread: CertificateCheckingThread

    def process_response(self, response: HttpResponse) -> None:
        if response.status == 200:
            self.send_response(200)
            if response.headers is not None:
                for header in response.headers:
                    self.send_header(header[0], header[1])
            self.end_headers()
            if response.body is not None:
                self.wfile.write(response.body.encode("utf-8"))
        else:
            self.send_error(code=response.status, explain=response.body)
            if response.body is not None:
                self.log_error(response.body)

    def process_request(self, handlers: dict) -> None:
        try:
            handler = find_handler(self.path, handlers)
            if handler is None:
                response = response_404()
            else:
                current_user = get_current_user(self, self.users_storage, self.keys_storage)
                response = handler(
                    self,
                    WebRequestHandlerContext(
                        self.sn,
                        self.users_storage,
                        self.keys_storage,
                        self.certificate_thread,
                        current_user,
                    ),
                )
        except Exception as e:
            response = response_500("%s\n%s" % (str(e), traceback.format_exc()))
        self.process_response(response)

    def do_GET(self) -> None:
        self.process_request(
            {
                "/auth/check": auth_check_handler,
                "/auth/who_am_i": auth_who_am_i_handler,
                "/users": get_users_handler,
                "/device/info": device_info_handler,
            }
        )

    def do_POST(self) -> None:
        self.process_request(
            {
                "/users": add_user_handler,
                "/auth/login": auth_login_handler,
                "/auth/logout": auth_logout_handler,
                "/api/https/setup": https_setup_handler,
            }
        )

    def do_PATCH(self) -> None:
        self.process_request({"/users/*": update_user_handler})

    def do_DELETE(self) -> None:
        self.process_request({"/users/*": delete_user_handler})

    def log_message(self, format: str, *args: Any) -> None:
        if self.enable_debug:
            super().log_message(format, *args)

    def send_error(self, code, message=None, explain=None):
        self.error_message_format = "%(explain)s"
        try:
            super().send_error(code, message, explain)
        except BrokenPipeError:
            # nginx may close the connection before we send the response
            # resulting in a broken pipe error
            self.log_message("Failed to send error response: broken pipe")


class UnixSocketHttpServer(socketserver.UnixStreamServer):
    def get_request(self):
        request, client_address = super().get_request()
        if len(client_address) == 0:
            # BaseHTTPRequestHandler expects a tuple with the client address and port
            client_address = (self.server_address, 0)
        return (request, client_address)


def get_sn() -> str:
    output = subprocess.check_output(["wb-gen-serial", "-s"])
    sn = output.decode("utf-8").strip()
    return sn


def open_db(db_file: str, schema_version: int) -> sqlite3.Connection:
    if os.path.exists(db_file):
        con = sqlite3.connect(db_file)
        cur = con.cursor()
        cur.execute("PRAGMA user_version")
        version = cur.fetchone()[0]
        if version != schema_version:
            raise RuntimeError(f"Database schema version mismatch. Need {schema_version}, got {version}")
        return con
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    con = sqlite3.connect(db_file)
    cur = con.cursor()
    cur.execute(f"PRAGMA user_version = {schema_version}")
    return con


def main():
    parser = argparse.ArgumentParser(prog=argv[0], description="Home UI authentication service")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--socket-file", default=DEFAULT_SOCKET_FILE, help="Socket file")
    parser.add_argument("--db-file", default=DEFAULT_DB_FILE, help="Database file path")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(levelname)s:%(message)s",
    )

    con = open_db(args.db_file, DB_SCHEMA_VERSION)

    sn = get_sn()

    WebRequestHandler.users_storage = UsersStorage(con)
    WebRequestHandler.keys_storage = KeysStorage(con)
    WebRequestHandler.enable_debug = args.debug
    WebRequestHandler.sn = sn
    WebRequestHandler.certificate_thread = CertificateCheckingThread(sn)

    try:
        os.remove(args.socket_file)
    except OSError:
        pass
    server = UnixSocketHttpServer((args.socket_file), WebRequestHandler)
    os.chmod(args.socket_file, 0o662)
    server.serve_forever()
