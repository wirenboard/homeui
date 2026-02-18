#!/usr/bin/env python3

import cgi
import json
import os
import sys
from urllib.parse import parse_qs

TEMPLATES_DIR = "/etc/wb-mqtt-serial.conf.d/templates"
TEMPLATES_DIR = os.environ.get("TEMPLATES_DIR", TEMPLATES_DIR)


def _error(msg=""):
    sys.stdout.write("Status: 400 Bad Request\r\n")
    sys.stdout.write("Content-Type: application/json\r\n\r\n")
    sys.stdout.write(json.dumps({"error": msg}))
    sys.exit(1)


def _not_found(msg=""):
    sys.stdout.write("Status: 404 Not Found\r\n")
    sys.stdout.write("Content-Type: application/json\r\n\r\n")
    sys.stdout.write(json.dumps({"error": msg}))
    sys.exit(1)


def _die(msg=""):
    sys.stdout.write("Status: 500 Internal Server Error\r\n")
    sys.stdout.write("Content-Type: application/json\r\n\r\n")
    sys.stdout.write(json.dumps({"error": msg}))
    sys.exit(1)


def _ok(data):
    sys.stdout.write("Status: 200\r\n")
    sys.stdout.write("Content-Type: application/json\r\n\r\n")
    sys.stdout.write(json.dumps(data))


def handle_post():
    form = cgi.FieldStorage()
    if "file" not in form.keys():
        _error("No file provided")

    uploading_file = form["file"]
    if not hasattr(uploading_file, "filename") or not hasattr(uploading_file, "file"):
        _error("Incorrect request body")

    filename = uploading_file.filename
    if not filename:
        _error("No filename provided")

    if ".." in filename or "/" in filename:
        _error("Invalid filename")
    if not filename.endswith(".json"):
        _error("Filename must end with .json")

    content = uploading_file.file.read()
    if isinstance(content, bytes):
        content = content.decode("utf-8")

    try:
        data = json.loads(content)
    except (json.JSONDecodeError, ValueError) as e:
        _error("Invalid JSON: %s" % str(e))

    if not isinstance(data, dict):
        _error("JSON must be an object")

    os.makedirs(TEMPLATES_DIR, exist_ok=True)

    with open(os.path.join(TEMPLATES_DIR, filename), "w") as f:
        f.write(content)

    _ok({"filename": filename})


def handle_delete():
    params = parse_qs(os.environ.get("QUERY_STRING", ""))
    filename = params.get("filename", [""])[0]

    if not filename:
        _error("No filename provided")

    if ".." in filename or "/" in filename:
        _error("Invalid filename")

    filepath = os.path.join(TEMPLATES_DIR, filename)
    if not os.path.exists(filepath):
        _not_found("File not found: %s" % filename)

    os.remove(filepath)
    _ok({"deleted": filename})


def handle_get():
    if not os.path.isdir(TEMPLATES_DIR):
        _ok([])
        return

    files = [
        {"filename": f} for f in sorted(os.listdir(TEMPLATES_DIR)) if f.endswith(".json")
    ]
    _ok(files)


def main():
    method = os.environ.get("REQUEST_METHOD", "GET")

    if method == "POST":
        handle_post()
    elif method == "DELETE":
        handle_delete()
    elif method == "GET":
        handle_get()
    else:
        _error("Method not allowed: %s" % method)


try:
    main()
except SystemExit:
    raise
except Exception as e:
    _die(str(e))
