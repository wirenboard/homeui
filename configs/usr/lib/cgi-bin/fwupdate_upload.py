#!/usr/bin/env python3

import os
import sys
import tempfile
from cgi import FieldStorage

if os.path.islink("/var/run/wb-watch-update.dir"):
    RW_DIR = os.path.realpath("/var/run/wb-watch-update.dir")
else:
    RW_DIR = os.environ.get("UPLOADS_DIR", "/var/www/uploads")  # nginx user should has rw access

TMP_DIR = os.path.join(RW_DIR, "state", "tmp")  # excluded from wb-watch-update
os.makedirs(TMP_DIR, exist_ok=True)


def _error(msg=""):
    sys.stdout.write("Status: 400 %s\r\n\r\n" % msg)
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
        location = TMP_DIR  # has rw access & excluded from wb-watch-update
        if self._binary_file:
            return tempfile.TemporaryFile("wb+", dir=location)
        else:
            return tempfile.TemporaryFile("w+", encoding=self.encoding, newline="\n", dir=location)


form = DiskFieldStorage(encoding="utf-8")
if "file" not in form.keys():  # get("file") does not work (due to FieldStorage internals)
    _error("Incorrect request")

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
