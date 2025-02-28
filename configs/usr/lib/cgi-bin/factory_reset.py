#!/usr/bin/env python3

import os
import sys
from cgi import FieldStorage


def _error(msg=""):
    sys.stdout.write("Status: 400 Bad Request\r\n\r\nBad Request: %s" % msg)
    sys.exit(1)


def _die(msg=""):
    sys.stdout.write("Status: 500 Internal Server Error\r\n\r\nInternal Server Error: %s" % msg)
    sys.exit(1)


def check_for_form(form):
    try:
        form.keys()
    except Exception:
        _error("No form in request")


def check_for_confirmation(form):
    do_factory_reset = "factory_reset" in form.keys() and str(form.getvalue("factory_reset")) == 'true'
    if not do_factory_reset:
        _error("no factory_reset=true in POST arguments")


def main():
    form = FieldStorage(encoding="utf-8")
    check_for_form(form)
    check_for_confirmation(form)

    # we need to update-with-reboot in order to factory reset, so we're changing output directory to .wb_update
    RW_DIR = "/mnt/data/.wb-update/"
    os.makedirs(RW_DIR, exist_ok=True)

    # create flags file
    FLAGS_FILE = os.path.join(RW_DIR, 'install_update.web.flags')
    with open(FLAGS_FILE, "w") as flags_file_h:
        flags_file_h.write('--factoryreset --from-emmc-factoryreset ')

    # make hardlink to factoryreset.fit
    SRC_FIT = "/mnt/data/.wb-restore/factoryreset.fit"
    DST_FIT = os.path.join(RW_DIR, "webupd.fit")
    os.link(SRC_FIT, DST_FIT)

    # open/close it for writing to trigger wb-watch-update
    with open(DST_FIT, "ab") as fp:
        pass

    sys.stdout.write("Status: 200\r\n\r\n")


try:
    main()
except Exception as e:
    _die(str(e))
