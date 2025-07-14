#!/usr/bin/env python3

import re

from setuptools import setup


def get_version():
    with open("../debian/changelog", "r", encoding="utf-8") as f:
        return re.match(r"wb-mqtt-homeui \((?P<version>.*)\)", f.readline()).group("version")


setup(
    name="wb-homeui-backend",
    version=get_version(),
    author="Petr Krasnoshchekov",
    author_email="petr.krasnoshchekov@wirenboard.com",
    maintainer="Wiren Board Team",
    maintainer_email="info@wirenboard.com",
    description="Backend service for Wiren Board web interface",
    license="MIT",
    url="https://github.com/wirenboard/wb-mqtt-homeui",
    packages=[
        "wb.homeui_backend",
    ],
    test_suite="tests",
)
