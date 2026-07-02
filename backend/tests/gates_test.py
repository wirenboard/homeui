import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from wb.homeui_backend.gates import Gate, apply_gates, load_gates, render_gate
from wb.homeui_backend.users_storage import UserType


def _write_gate(dir_path, name, config):
    with open(os.path.join(dir_path, name + ".json"), "w", encoding="utf-8") as f:
        json.dump(config, f)


class LoadGatesTest(unittest.TestCase):
    def setUp(self):
        self.conf_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.conf_dir)
        patcher = patch("wb.homeui_backend.gates.GATES_CONF_DIR", self.conf_dir)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_loads_valid_gate_with_defaults(self):
        _write_gate(self.conf_dir, "my-service", {"externalPort": 29000, "internalPort": 9000})
        gates, skipped = load_gates()
        self.assertEqual(skipped, [])
        self.assertEqual(len(gates), 1)
        self.assertEqual(gates[0].name, "my-service")
        self.assertEqual(gates[0].role, UserType.ADMIN)
        self.assertTrue(gates[0].auth)

    def test_skips_broken_gates_keeps_valid(self):
        """Every bad file is reported with its reason and must not block the others."""
        _write_gate(self.conf_dir, "ok", {"externalPort": 29000, "internalPort": 9000, "role": "user"})
        _write_gate(self.conf_dir, "bad-port", {"externalPort": 80, "internalPort": 9000})
        _write_gate(self.conf_dir, "bad-role", {"externalPort": 29001, "internalPort": 9001, "role": "root"})
        _write_gate(self.conf_dir, "bad-auth", {"externalPort": 29002, "internalPort": 9003, "auth": "no"})
        gates, skipped = load_gates()
        self.assertEqual([g.name for g in gates], ["ok"])
        self.assertEqual(len(skipped), 3)

    def test_skips_duplicate_external_port(self):
        _write_gate(self.conf_dir, "a", {"externalPort": 29000, "internalPort": 9000})
        _write_gate(self.conf_dir, "b", {"externalPort": 29000, "internalPort": 9001})
        gates, skipped = load_gates()
        self.assertEqual([g.name for g in gates], ["a"])
        self.assertEqual(len(skipped), 1)

    def test_missing_dir_is_empty(self):
        with patch("wb.homeui_backend.gates.GATES_CONF_DIR", os.path.join(self.conf_dir, "absent")):
            self.assertEqual(load_gates(), ([], []))


class RenderGateTest(unittest.TestCase):
    def setUp(self):
        self.gate = Gate(name="svc", external_port=29000, internal_port=9000, role=UserType.OPERATOR)

    def test_https_mode_renders_ssl_listen_and_tls_include(self):
        conf = render_gate(self.gate, https_enabled=True)
        self.assertIn("listen 29000 ssl;", conf)
        self.assertIn("wb-gate-tls.inc", conf)
        self.assertIn("set $wb_role   operator;", conf)
        self.assertIn("proxy_pass http://127.0.0.1:9000;", conf)

    def test_http_mode_renders_plain_listen_without_tls(self):
        conf = render_gate(self.gate, https_enabled=False)
        self.assertIn("listen 29000;", conf)
        self.assertNotIn("wb-gate-tls.inc", conf)

    def test_extra_nginx_inc_is_included_when_present(self):
        """<name>.nginx.inc next to the JSON must be included at server level;
        without the file no include line appears."""
        conf_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, conf_dir)
        with patch("wb.homeui_backend.gates.GATES_CONF_DIR", conf_dir):
            self.assertNotIn(".nginx.inc", render_gate(self.gate, https_enabled=False))
            inc_path = os.path.join(conf_dir, "svc.nginx.inc")
            with open(inc_path, "w", encoding="utf-8") as f:
                f.write("# extra\n")
            self.assertIn(f"include {inc_path};", render_gate(self.gate, https_enabled=False))

    def test_no_auth_gate_renders_plain_proxy(self):
        """auth:false must drop auth_request, the 401 fallback and both auth
        snippet includes — a plain proxy with header stripping only."""
        self.gate.auth = False
        conf = render_gate(self.gate, https_enabled=False)
        self.assertNotIn("auth_request", conf)
        self.assertNotIn("error_page 401", conf)
        self.assertNotIn("wb-gate-authcheck.inc", conf)
        self.assertNotIn("wb-gate-unauth.inc", conf)
        self.assertIn("proxy_pass http://127.0.0.1:9000;", conf)
        self.assertIn("wb-gate-proxy.inc", conf)


class ApplyGatesTest(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root)
        self.conf_dir = os.path.join(self.root, "gates.d")
        self.rendered_dir = os.path.join(self.root, "rendered")
        self.bounces = os.path.join(self.root, "nginx", "wb-gate-bounces.conf")
        self.menu_dir = os.path.join(self.root, "custom-menu")
        os.makedirs(self.conf_dir)
        for name, value in {
            "GATES_CONF_DIR": self.conf_dir,
            "RENDERED_GATES_DIR": self.rendered_dir,
            "BOUNCES_CONF_PATH": self.bounces,
            "CUSTOM_MENU_DIR": self.menu_dir,
            "LOCK_PATH": os.path.join(self.root, "lock"),
            "NGINX_CACHE_ROOT": os.path.join(self.root, "cache"),
        }.items():
            patcher = patch(f"wb.homeui_backend.gates.{name}", value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def _apply(self, https_enabled, nginx_ok=True):
        def fake_run(cmd, **_kwargs):
            if cmd[0] == "nginx":
                return MagicMock(returncode=0 if nginx_ok else 1, stderr="nginx: [emerg] boom")
            return MagicMock(returncode=0)

        with patch("wb.homeui_backend.gates.subprocess.run", side_effect=fake_run), patch(
            "wb.homeui_backend.gates.time.sleep"
        ):
            return apply_gates(https_enabled)

    def test_renders_configs_bounce_and_menu(self):
        """A gate with a title produces a server conf in the current mode, a bounce
        line with the matching scheme and a menu drop-in."""
        _write_gate(
            self.conf_dir,
            "svc",
            {"externalPort": 29000, "internalPort": 9000, "title": {"ru": "Сервис", "en": "Svc"}},
        )
        result = self._apply(https_enabled=False)
        self.assertTrue(result.ok)
        with open(os.path.join(self.rendered_dir, "svc.conf"), encoding="utf-8") as f:
            self.assertIn("listen 29000;", f.read())
        with open(self.bounces, encoding="utf-8") as f:
            self.assertEqual(f.read(), "location = /open-svc { return 302 http://$host:29000/; }\n")
        with open(os.path.join(self.menu_dir, "wb-gate-svc.json"), encoding="utf-8") as f:
            item = json.load(f)["children"][0]
        self.assertEqual(item["url"], "/open-svc")
        self.assertTrue(item["isExternal"])

    def test_toggle_rerenders_scheme(self):
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        self._apply(https_enabled=True)
        with open(self.bounces, encoding="utf-8") as f:
            self.assertIn("https://$host:29000/", f.read())
        self._apply(https_enabled=False)
        with open(self.bounces, encoding="utf-8") as f:
            self.assertIn("http://$host:29000/", f.read())

    def test_nginx_test_failure_restores_previous_state(self):
        """A gate that nginx -t rejects must not destroy the previously applied,
        working gate: the old rendered state is restored and the result carries
        the nginx error."""
        _write_gate(self.conf_dir, "good", {"externalPort": 29000, "internalPort": 9000})
        self.assertTrue(self._apply(https_enabled=False).ok)
        _write_gate(self.conf_dir, "second", {"externalPort": 29001, "internalPort": 9001})
        result = self._apply(https_enabled=False, nginx_ok=False)
        self.assertFalse(result.ok)
        self.assertIn("boom", result.error)
        self.assertEqual(os.listdir(self.rendered_dir), ["good.conf"])
        with open(self.bounces, encoding="utf-8") as f:
            self.assertEqual(f.read(), "location = /open-good { return 302 http://$host:29000/; }\n")
