#!/usr/bin/env python3

import argparse
import json
import logging
import os
import socketserver
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

from .cert import CertificateCheckingThread
from .config_file import Config
from .db import open_db
from .http_response import (
    HttpResponse,
    response_200,
    response_201,
    response_204,
    response_400,
    response_401,
    response_403,
    response_404,
    response_429,
    response_500,
)
from .rate_limiter import RateLimiter
from .sessions_storage import Session, SessionsStorage
from .users_storage import User, UsersStorage, UserType

DEFAULT_SOCKET_FILE = "/tmp/wb-homeui.socket"
DEFAULT_DB_FILE = "/var/lib/wb-homeui/users.db"

ADMIN_COOKIE_LIFETIME = timedelta(days=14)

# A very long lifetime as we don't want cookies to expire by browser policy
# We will check cookie validity internally
DEFAULT_COOKIE_LIFETIME = timedelta(days=365 * 20)


def make_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def make_id_cookie(session: Session) -> cookies.SimpleCookie:
    cookie = cookies.SimpleCookie()
    cookie["id"] = session.id
    cookie["id"]["path"] = "/"
    cookie["id"]["httponly"] = True
    cookie["id"]["samesite"] = "Lax"
    expires = session.start_date + DEFAULT_COOKIE_LIFETIME
    cookie["id"]["expires"] = expires.strftime("%a, %d %b %Y %H:%M:%S GMT")
    return cookie


def make_set_cookie_header(cookie: cookies.SimpleCookie) -> list[str]:
    return ["Set-Cookie", cookie.output(header="")]


def get_session(
    request: BaseHTTPRequestHandler, users_storage: UsersStorage, sessions_storage: SessionsStorage
) -> Optional[Session]:
    try:
        request_cookie = cookies.SimpleCookie()
        request_cookie.load(request.headers.get("Cookie", ""))
        cookie_id = request_cookie.get("id")
        if cookie_id is None:
            request.log_error("Cookie not found")
            return None
        session = sessions_storage.get_session_by_id(cookie_id.value, users_storage)
        if session is None:
            request.log_error("Session not found")
            return None
        now = datetime.now(timezone.utc)
        if session.user.type == UserType.ADMIN and session.start_date + ADMIN_COOKIE_LIFETIME < now:
            request.log_error("Cookie expired")
            return None
        return session
    except Exception as e:
        request.log_error("Failed to get user from cookie: %s", str(e))
    return None


def validate_login_request(form: dict) -> None:
    if "password" not in form.keys():
        raise TypeError("No password field")

    new_password = form.get("password")
    if not new_password or not isinstance(new_password, str):
        raise TypeError("Invalid password field")

    if "login" not in form.keys():
        raise TypeError("No login field")

    new_login = form.get("login")
    if not new_login or not isinstance(new_login, str):
        raise TypeError("Invalid login field")


def validate_add_user_request(request: dict) -> None:
    validate_login_request(request)

    if request.get("type") not in [e.value for e in UserType]:
        raise TypeError("Invalid type field")

    if not isinstance(request.get("autologin", False), bool):
        raise TypeError("Invalid autologin field")


def validate_update_user_request(request: dict) -> None:
    if request.get("type") not in [e.value for e in UserType]:
        raise TypeError("Invalid type field")

    new_password = request.get("password")
    if new_password and not isinstance(new_password, str):
        raise TypeError("Invalid password field")

    new_login = request.get("login")
    if new_login and not isinstance(new_login, str):
        raise TypeError("Invalid login field")

    new_autologin = request.get("autologin", False)
    if not isinstance(new_autologin, bool):
        raise TypeError("Invalid autologin field")


@dataclass
class WebRequestHandlerContext:
    sn: str
    users_storage: UsersStorage
    sessions_storage: SessionsStorage
    certificate_thread: CertificateCheckingThread
    session: Optional[Session] = None


def get_required_user_type(request: BaseHTTPRequestHandler) -> UserType:
    return UserType(request.headers.get("Required-User-Type", UserType.ADMIN.value))


def auth_check_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    # if no users are configured allow all requests
    if not context.users_storage.has_users():
        return response_200()

    method = request.headers.get("X-Original-Method", "GET")
    allow_unauthorized_get = request.headers.get("Allow-Unauthorized-Get", "false").lower() == "true"
    if method == "GET" and allow_unauthorized_get:
        headers = []
        if context.session is not None:
            headers.append(["Wb-User-Type", context.session.user.type.value])
        return response_200(headers=headers)

    required_user_type = get_required_user_type(request)

    if context.session is None:
        autologin_user = context.users_storage.get_autologin_user()
        if autologin_user is not None and autologin_user.has_access_to(required_user_type):
            return response_200(headers=[["Wb-User-Type", autologin_user.type.value]])
        return response_401()

    if context.session.user.has_access_to(required_user_type):
        context.sessions_storage.update_session_start_date(context.session)
        request.log_message(
            "Session %s start_date updated to %s", context.session.id, context.session.start_date
        )
        return response_200(headers=[["Wb-User-Type", context.session.user.type.value]])
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

    res = {"user_type": user.type.value}
    session = context.sessions_storage.add_session(user)
    return response_200(
        headers=[
            make_set_cookie_header(make_id_cookie(session)),
            ["Content-type", "application/json"],
        ],
        body=json.dumps(res),
    )


def auth_logout_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    if context.session is not None:
        context.sessions_storage.delete_session(context.session)
    cookie = cookies.SimpleCookie()
    cookie["id"] = ""
    cookie["id"]["path"] = "/"
    cookie["id"]["expires"] = "Thu, 01 Jan 1970 00:00:00 GMT"
    return response_200(headers=[make_set_cookie_header(cookie)])


def auth_who_am_i_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    if not context.users_storage.has_users():
        return response_404()

    if context.session is not None:
        res = {"user_type": context.session.user.type.value}
        return response_200([["Content-type", "application/json"]], json.dumps(res))

    autologin_user = context.users_storage.get_autologin_user()
    if autologin_user is not None:
        res = {
            "user_type": autologin_user.type.value,
            "autologin": True,
        }
        return response_200([["Content-type", "application/json"]], json.dumps(res))

    return response_401()


def add_user_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    try:
        length = int(request.headers.get("Content-Length", 0))
        form = json.loads(request.rfile.read(length).decode("utf-8"))
        validate_add_user_request(form)
    except Exception as e:
        return response_400(str(e))

    user_to_add = User(
        "",
        form.get("login"),
        make_password_hash(form.get("password")),
        UserType(form.get("type")),
        form.get("autologin", False),
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

    delete_user_sessions = False
    new_login = form.get("login")
    if new_login is not None:
        user_with_the_same_login = context.users_storage.get_user_by_login(new_login)

        if user_with_the_same_login is not None and user_with_the_same_login.user_id != user_id:
            return response_400("Login already exists")
        if user.login != new_login:
            user.login = new_login
            delete_user_sessions = True

    new_password = form.get("password")
    if new_password is not None:
        if not check_password(new_password, user.pwd_hash):
            user.pwd_hash = make_password_hash(new_password)
            delete_user_sessions = True

    new_type = form.get("type")
    if new_type is not None:
        if user.type == UserType.ADMIN and UserType(new_type) != UserType.ADMIN:
            admin_count = context.users_storage.count_users_by_type(UserType.ADMIN)
            if admin_count == 1:
                return response_400("Can't change the last admin's type")
        user.type = UserType(new_type)

    user.autologin = form.get("autologin", False)

    if delete_user_sessions:
        context.sessions_storage.delete_sessions_by_user(user)
    context.users_storage.update_user(user)
    return response_200()


def delete_user_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    user_id = get_user_id_from_query(request)
    if user_id is None:
        return response_404()
    user = context.users_storage.get_user_by_id(user_id)
    if user is None:
        return response_404()
    if context.session is not None and user.user_id == context.session.user.user_id:
        return response_400("Can't delete yourself")
    if user.type == UserType.ADMIN and context.users_storage.count_users_by_type(UserType.ADMIN) == 1:
        return response_400("Can't delete the last admin")
    context.sessions_storage.delete_sessions_by_user(user)
    context.users_storage.delete_user(user_id)
    return response_204()


def get_users_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    users = map(
        lambda user: {
            "id": user.user_id,
            "login": user.login,
            "type": user.type.value,
            "autologin": user.autologin,
        },
        context.users_storage.get_users(),
    )
    return response_200([["Content-type", "application/json"]], json.dumps(list(users)))


def device_info_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    host_ip = request.headers.get("X-Forwarded-Host-Ip", "")
    res = {
        "sn": context.sn,
        "ip": host_ip,
        "https_cert": context.certificate_thread.get_certificate_state().value,
    }
    return response_200(
        [
            ["Content-type", "application/json"],
            ["Access-Control-Allow-Origin", "*"],
        ],
        json.dumps(res),
    )


def https_request_cert_handler(
    request: BaseHTTPRequestHandler, context: WebRequestHandlerContext
) -> HttpResponse:
    context.certificate_thread.request_certificate()
    return response_200()


def get_https_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    return response_200(
        [["Content-type", "application/json"]],
        json.dumps({"enabled": context.certificate_thread.is_certificate_update_allowed()}),
    )


def update_https_handler(request: BaseHTTPRequestHandler, context: WebRequestHandlerContext) -> HttpResponse:
    try:
        length = int(request.headers.get("Content-Length", 0))
        form = json.loads(request.rfile.read(length).decode("utf-8"))
    except Exception as e:
        return response_400(str(e))
    https_enabled = form.get("enabled")
    if https_enabled is not None:
        if not isinstance(https_enabled, bool):
            raise TypeError("Invalid enabled field")
        WebRequestHandler.config.set_https_enabled(https_enabled)
        if https_enabled:
            context.certificate_thread.enable_certificate_update()
        else:
            context.certificate_thread.disable_certificate_update()
    return response_200()


@dataclass
class RequestHandler:
    fn: Callable[[BaseHTTPRequestHandler, WebRequestHandlerContext], HttpResponse]
    rate_per_minute_limit: Optional[int] = None


def find_handler(url: str, handlers: dict[str, RequestHandler]) -> Optional[RequestHandler]:
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
    sessions_storage: SessionsStorage
    enable_debug: bool = False
    sn: str = ""
    certificate_thread: CertificateCheckingThread
    rate_limiter: RateLimiter
    config: Config

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

    def _request_handler(self, handlers: dict[str, RequestHandler]) -> HttpResponse:
        handler = find_handler(self.path, handlers)

        if handler is None:
            return response_404()

        if not self.rate_limiter.check_call(
            self.path, datetime.now(timezone.utc), handler.rate_per_minute_limit
        ):
            return response_429()

        session = get_session(self, self.users_storage, self.sessions_storage)
        return handler.fn(
            self,
            WebRequestHandlerContext(
                self.sn,
                self.users_storage,
                self.sessions_storage,
                self.certificate_thread,
                session,
            ),
        )

    def process_request(self, handlers: dict[str, RequestHandler]) -> None:
        try:
            response = self._request_handler(handlers)
        except Exception as e:
            response = response_500("%s\n%s" % (str(e), traceback.format_exc()))
        self.process_response(response)

    def do_GET(self) -> None:
        self.process_request(
            {
                "/auth/check": RequestHandler(fn=auth_check_handler, rate_per_minute_limit=100),
                "/auth/who_am_i": RequestHandler(fn=auth_who_am_i_handler),
                "/users": RequestHandler(fn=get_users_handler),
                "/device/info": RequestHandler(fn=device_info_handler),
                "/api/https": RequestHandler(fn=get_https_handler),
            }
        )

    def do_POST(self) -> None:
        self.process_request(
            {
                "/users": RequestHandler(fn=add_user_handler),
                "/auth/login": RequestHandler(fn=auth_login_handler, rate_per_minute_limit=30),
                "/auth/logout": RequestHandler(fn=auth_logout_handler),
                "/api/https/request_cert": RequestHandler(fn=https_request_cert_handler),
            }
        )

    def do_PATCH(self) -> None:
        self.process_request(
            {
                "/users/*": RequestHandler(fn=update_user_handler),
                "/api/https": RequestHandler(fn=update_https_handler),
            }
        )

    def do_DELETE(self) -> None:
        self.process_request({"/users/*": RequestHandler(fn=delete_user_handler)})

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

    con = open_db(args.db_file)

    sn = get_sn()

    WebRequestHandler.users_storage = UsersStorage(con)
    WebRequestHandler.sessions_storage = SessionsStorage(con)
    WebRequestHandler.enable_debug = args.debug
    WebRequestHandler.sn = sn
    WebRequestHandler.config = Config(WebRequestHandler.users_storage)
    WebRequestHandler.certificate_thread = CertificateCheckingThread(
        sn, WebRequestHandler.config.is_https_enabled()
    )
    WebRequestHandler.rate_limiter = RateLimiter()

    try:
        os.remove(args.socket_file)
    except OSError:
        pass
    server = UnixSocketHttpServer((args.socket_file), WebRequestHandler)
    os.chmod(args.socket_file, 0o662)
    server.serve_forever()
