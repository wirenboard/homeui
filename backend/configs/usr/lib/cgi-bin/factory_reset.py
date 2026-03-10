#!/usr/bin/env python3

import os
import sys
from cgi import FieldStorage  # pylint: disable=deprecated-module


def _error(msg=""):
    sys.stdout.write(f"Status: 400 Bad Request\r\n\r\nBad Request: {msg}")
    sys.exit(1)


def _die(msg=""):
    sys.stdout.write(f"Status: 500 Internal Server Error\r\n\r\nInternal Server Error: {msg}")
    sys.exit(1)


def check_for_form(form):
    try:
        form.keys()
    except Exception:
        _error("No form in request")


def check_for_confirmation(form):
    do_factory_reset = "factory_reset" in form.keys() and str(form.getvalue("factory_reset")) == "true"
    if not do_factory_reset:
        _error("no factory_reset=true in POST arguments")


def main():
    form = FieldStorage(encoding="utf-8")
    check_for_form(form)
    check_for_confirmation(form)

    # we need to update-with-reboot in order to factory reset, so we're changing output directory to .wb_update
    rw_dir = "/mnt/data/.wb-update/"
    os.makedirs(rw_dir, exist_ok=True)

    # open/close it for writing to trigger wb-watch-update's special mode
    use_factory_fit_flag = os.path.join(rw_dir, "wb_use_factory_fit.flag")
    with open(use_factory_fit_flag, "ab") as _fp:
        pass

    sys.stdout.write("Status: 200\r\n\r\n")


try:
    main()
except Exception as e:
    _die(str(e))
