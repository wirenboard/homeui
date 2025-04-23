#!/usr/bin/env python3
# pylint: disable=duplicate-code

import os
import sys
import tempfile
from cgi import FieldStorage  # pylint: disable=deprecated-module


def get_rw_dir():
    if os.path.islink("/var/run/wb-watch-update.dir"):
        return os.path.realpath("/var/run/wb-watch-update.dir")

    return os.environ.get("UPLOADS_DIR", "/var/www/uploads")  # nginx user should has rw access


def get_tmp_dir(rw_dir):
    return os.path.join(rw_dir, "state", "tmp")  # excluded from wb-watch-update


def _error(msg=""):
    sys.stdout.write(f"Status: 400 Bad Request\r\n\r\nBad Request: {msg}")
    sys.exit(1)


def _die(msg=""):
    sys.stdout.write(f"Status: 500 Internal Server Error\r\n\r\nInternal Server Error: {msg}")
    sys.exit(1)


def to_chunks(fp, chunk_size=8192):
    while True:
        bs = fp.read(chunk_size)
        if not bs:
            break
        yield bs


class DiskFieldStorage(FieldStorage):  # pylint: disable=too-few-public-methods
    """
    Default FieldStorage's make_file implementation produces tempfile in /tmp dir
    Which is not appropriate due to the lack of free space on wb
    """

    def make_file(self):
        location = get_tmp_dir(get_rw_dir())  # has rw access & excluded from wb-watch-update
        if self._binary_file:
            return tempfile.TemporaryFile("wb+", dir=location)

        return tempfile.TemporaryFile("w+", encoding=self.encoding, newline="\n", dir=location)


def main():

    rw_dir = get_rw_dir()
    tmp_dir = get_tmp_dir(rw_dir)

    os.makedirs(tmp_dir, exist_ok=True)

    form = DiskFieldStorage(encoding="utf-8")
    if "file" not in form.keys():  # get("file") does not work (due to FieldStorage internals)
        _error("Incorrect request")

    # handle extra POST arguments
    do_expand_rootfs = "expand_rootfs" in form.keys() and str(form.getvalue("expand_rootfs")) == "true"
    do_factory_reset = "factory_reset" in form.keys() and str(form.getvalue("factory_reset")) == "true"
    is_from_cloud = "from_cloud" in form.keys() and str(form.getvalue("from_cloud")) == "true"
    if do_factory_reset or do_expand_rootfs or is_from_cloud:
        # we need to update-with-reboot in order to expand rootfs,
        # so we're changing output directory to .wb_update
        rw_dir = "/mnt/data/.wb-update/"
        os.makedirs(rw_dir, exist_ok=True)
        # create flags file
        flags_file = os.path.join(rw_dir, "install_update.web.flags")
        with open(flags_file, "w", encoding="utf-8") as flags_file_h:
            if do_factory_reset:
                flags_file_h.write("--factoryreset ")
            if do_expand_rootfs:
                flags_file_h.write("--force-repartition ")
            if is_from_cloud:
                flags_file_h.write("--from-cloud ")

    # handle upload
    uploading_file = form["file"]
    if hasattr(uploading_file, "filename") and hasattr(uploading_file, "file"):
        fname = uploading_file.filename or "fwupdate"
        fp_upload = uploading_file.file

        with open(os.path.join(rw_dir, fname), "wb") as fp_save:  # wb-watch-update triggers on fd close
            for chunk in to_chunks(fp_upload):
                fp_save.write(chunk)
        sys.stdout.write("Status: 200\r\n\r\n")
    else:
        _error("Incorrect request body")


try:
    main()
except Exception as e:  # pylint: disable=broad-exception-caught
    _die(str(e))
