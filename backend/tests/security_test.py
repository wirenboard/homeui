import http.client
import io
import json
import os
import tempfile
import unittest
import urllib.error
from email.message import Message
from unittest.mock import patch
from urllib.parse import parse_qs

from wb.homeui_backend import security
from wb.homeui_backend.security import (
    MQTT_CHECK_TOPIC,
    PROBE_REQUEST_TIMEOUT,
    PROBE_URL,
    run_security_check,
)


@patch("wb.homeui_backend.security.urllib.request.urlopen")
class RunSecurityCheckTest(unittest.TestCase):
    def setUp(self):
        with tempfile.NamedTemporaryFile("w", suffix=".conf", delete=False) as config:
            json.dump({"probeOpenPorts": True}, config)
        self.addCleanup(os.remove, config.name)
        config_patch = patch.object(security, "SECURITY_CONFIG_FILE", config.name)
        config_patch.start()
        self.addCleanup(config_patch.stop)

        mqtt_patch = patch.object(security, "MQTTClient")
        self.mqtt_client = mqtt_patch.start().return_value
        self.addCleanup(mqtt_patch.stop)

    def test_posts_form_and_publishes_result(self, urlopen):
        """The serial and the UI URL go to the probe as a urlencoded POST form, with our
        User-Agent and the probe timeout; the probe's answer is published as is."""
        urlopen.return_value = io.BytesIO(b'{"result": "not found"}')

        run_security_check("AWB8TEST", "https://host:443/?a=b&c")

        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, PROBE_URL)
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("User-agent"), "wb-homeui-backend")
        self.assertEqual(
            parse_qs(request.data.decode()),
            {"serial": ["AWB8TEST"], "url": ["https://host:443/?a=b&c"]},
        )
        self.assertEqual(urlopen.call_args.kwargs["timeout"], PROBE_REQUEST_TIMEOUT)
        self.mqtt_client.publish.assert_called_once_with(MQTT_CHECK_TOPIC, '{"result": "not found"}', True)

    def test_probe_failure_publishes_nothing(self, urlopen):
        """An HTTP error, no connection, a timeout, a broken response or a body that is not
        JSON is logged, and no result is published."""
        for outcome in (
            urllib.error.HTTPError(PROBE_URL, 500, "error", Message(), None),
            urllib.error.URLError(ConnectionRefusedError()),
            TimeoutError(),
            http.client.IncompleteRead(b""),
            io.BytesIO(b"<html></html>"),
        ):
            with self.subTest(outcome=outcome):
                if isinstance(outcome, Exception):
                    urlopen.side_effect = outcome
                else:
                    urlopen.side_effect = None
                    urlopen.return_value = outcome
                with self.assertLogs(level="ERROR"):
                    run_security_check("AWB8TEST", "https://host:443/")

                self.mqtt_client.publish.assert_not_called()
