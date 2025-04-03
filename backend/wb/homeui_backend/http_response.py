#!/usr/bin/env python3

from dataclasses import dataclass, field


@dataclass
class HttpResponse:
    status: int
    headers: list[list[str]] = field(default_factory=list)
    body: str = None


def response_200(headers: list = None, body: str = None) -> HttpResponse:
    return HttpResponse(200, headers, body)


def response_201(headers: list = None, body: str = None) -> HttpResponse:
    return HttpResponse(201, headers, body)


def response_204() -> HttpResponse:
    return HttpResponse(204)


def response_400(msg: str) -> HttpResponse:
    return HttpResponse(400, body=f"Bad Request: {msg}")


def response_401() -> HttpResponse:
    return HttpResponse(401)


def response_403() -> HttpResponse:
    return HttpResponse(403)


def response_404() -> HttpResponse:
    return HttpResponse(404)


def response_500(error: str) -> HttpResponse:
    return HttpResponse(500, body=error)
