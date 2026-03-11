import json
import logging
import subprocess

import requests

SECURITY_CONFIG_FILE = "/etc/wb-security.conf"
CHECK_SERVER = "http://probe.wirenboard.com"
MQTT_CHECK_TOPIC = "/rpc/v1/exp-check"


def _mqtt_publish_check_result(payload: str) -> None:
    try:
        subprocess.run(
            ["mosquitto_pub", "-t", MQTT_CHECK_TOPIC, "-m", payload, "-r"],
            check=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        logging.error("Failed to publish MQTT check result", exc_info=True)


def run_security_check(sn: str, url: str) -> None:
    try:
        with open(SECURITY_CONFIG_FILE, "r", encoding="utf-8") as fp:
            config = json.load(fp)
    except (OSError, json.JSONDecodeError):
        logging.warning("Failed to read security config, treat check as disabled")
        _mqtt_publish_check_result('{"result": "not found"}')
        return

    if not config.get("probeOpenPorts", False):
        _mqtt_publish_check_result('{"result": "not found"}')
        return

    probe_url = f"{CHECK_SERVER}/probe/"
    probe_data = {"serial": sn, "url": url}
    logging.debug("Requesting probe server: %s with data %s", probe_url, probe_data)

    try:
        response = requests.post(
            probe_url,
            data=probe_data,
            timeout=120,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        logging.error("Failed to get response from probe server", exc_info=True)
        return

    if data.get("result") == "cooldown":
        _mqtt_publish_check_result('{"result": "not found"}')
    else:
        _mqtt_publish_check_result(json.dumps(data))
