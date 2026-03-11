import json
import logging
import subprocess
import threading
from queue import Queue
from typing import Set

import requests

MQTT_CHECK_TOPIC = "/rpc/v1/exp-check"
PROBE_URL = "http://probe.wirenboard.com/probe/"
SECURITY_CONFIG_FILE = "/etc/wb-security.conf"

MOSQUITTO_PUBLISH_TIMEOUT = 10
PROBE_REQUEST_TIMEOUT = 120


def mqtt_publish_check_result(payload: str) -> None:
    try:
        subprocess.run(
            ["mosquitto_pub", "-t", MQTT_CHECK_TOPIC, "-m", payload, "-r"],
            check=True,
            timeout=MOSQUITTO_PUBLISH_TIMEOUT,
        )
    except (OSError, subprocess.SubprocessError):
        logging.error("Failed to publish MQTT check result", exc_info=True)


def run_security_check(sn: str, url: str) -> None:
    try:
        with open(SECURITY_CONFIG_FILE, "r", encoding="utf-8") as fp:
            config = json.load(fp)
    except (OSError, json.JSONDecodeError):
        logging.warning("Failed to read security config, treat check as disabled")
        mqtt_publish_check_result('{"result": "not found"}')
        return

    if not config.get("probeOpenPorts", False):
        mqtt_publish_check_result('{"result": "not found"}')
        return

    probe_data = {"serial": sn, "url": url}
    logging.debug("Requesting probe server: %s with data %s", PROBE_URL, probe_data)

    try:
        response = requests.post(
            PROBE_URL,
            data=probe_data,
            timeout=PROBE_REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        logging.error("Failed to get response from probe server", exc_info=True)
        return

    if data.get("result") == "cooldown":
        mqtt_publish_check_result('{"result": "not found"}')
    else:
        mqtt_publish_check_result(json.dumps(data))


class SecurityCheckingThread:
    def __init__(self, sn: str):
        self.sn = sn
        self._queue: Queue[str] = Queue()
        self._pending: Set[str] = set()
        self._pending_lock = threading.Lock()
        self._thread = threading.Thread(target=self.run, daemon=True)
        self._thread.start()

    def request_check(self, url: str):
        with self._pending_lock:
            if url in self._pending:
                logging.debug("Security check already pending for %s, skipping enqueue", url)
                return
            self._pending.add(url)
            self._queue.put(url)
            logging.debug("Enqueued security check for %s", url)
            return

    def run(self) -> None:
        while True:
            try:
                url = self._queue.get(timeout=1)
            except Exception:  # pylint: disable=broad-exception-caught
                continue

            try:
                logging.debug("Picked up security check for %s", url)
                run_security_check(self.sn, url)
            except Exception:  # pylint: disable=broad-exception-caught
                logging.exception("Unhandled exception in security check")
            finally:
                with self._pending_lock:
                    self._pending.discard(url)
                self._queue.task_done()
