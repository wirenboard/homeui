#!/usr/bin/env python3

import os

from setuptools import setup


def get_version():
    return os.environ.get("DEB_VERSION", "0.0.0").split("~")[0].replace("-", "+")


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
