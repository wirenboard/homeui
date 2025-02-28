#!/usr/bin/env python3

import os
import sys
import tempfile
from cgi import FieldStorage


def get_rw_dir():
    if os.path.islink("/var/run/wb-watch-update.dir"):
        return os.path.realpath("/var/run/wb-watch-update.dir")
    else:
        return os.environ.get("UPLOADS_DIR", "/var/www/uploads")  # nginx user should has rw access


def get_tmp_dir(RW_DIR):
    return os.path.join(RW_DIR, "state", "tmp")  # excluded from wb-watch-update


def _error(msg=""):
    sys.stdout.write("Status: 400 Bad Request\r\n\r\nBad Request: %s" % msg)
    sys.exit(1)


def _die(msg=""):
    sys.stdout.write("Status: 500 Internal Server Error\r\n\r\nInternal Server Error: %s" % msg)
    sys.exit(1)


def to_chunks(fp, chunk_size=8192):
    while True:
        bs = fp.read(chunk_size)
        if not bs:
            break
        yield bs


class DiskFieldStorage(FieldStorage):
    """
    Default FieldStorage's make_file implementation produces tempfile in /tmp dir
    Which is not appropriate due to the lack of free space on wb
    """


    def make_file(self):
        location = get_tmp_dir(get_rw_dir())  # has rw access & excluded from wb-watch-update
        if self._binary_file:
            return tempfile.TemporaryFile("wb+", dir=location)
        else:
            return tempfile.TemporaryFile("w+", encoding=self.encoding, newline="\n", dir=location)


def main():

    RW_DIR = get_rw_dir()
    TMP_DIR = get_tmp_dir(RW_DIR)

    os.makedirs(TMP_DIR, exist_ok=True)

    form = DiskFieldStorage(encoding="utf-8")
    if "file" not in form.keys():  # get("file") does not work (due to FieldStorage internals)
        _error("Incorrect request")

    # handle extra POST arguments
    do_expand_rootfs = "expand_rootfs" in form.keys() and str(form.getvalue("expand_rootfs")) == 'true'
    do_factory_reset = "factory_reset" in form.keys() and str(form.getvalue("factory_reset")) == 'true'
    if do_factory_reset or do_expand_rootfs:
        # we need to update-with-reboot in order to expand rootfs, so we're changing output directory to .wb_update
        RW_DIR = "/mnt/data/.wb-update/"
        os.makedirs(RW_DIR, exist_ok=True)
        # create flags file
        flags_file = os.path.join(RW_DIR, 'install_update.web.flags')
        with open(flags_file, "w") as flags_file_h:
            if do_factory_reset:
                flags_file_h.write('--factoryreset ')
            if do_expand_rootfs:
                flags_file_h.write('--force-repartition ')

    # handle upload
    uploading_file = form["file"]
    if hasattr(uploading_file, "filename") and hasattr(uploading_file, "file"):
        fname = uploading_file.filename or "fwupdate"
        fp_upload = uploading_file.file
    else:
        _error("Incorrect request body")

    with open(os.path.join(RW_DIR, fname), "wb") as fp_save:  # wb-watch-update triggers on fd close
        for chunk in to_chunks(fp_upload):
            fp_save.write(chunk)
    sys.stdout.write("Status: 200\r\n\r\n")


try:
    main()
except Exception as e:
    _die(str(e))
