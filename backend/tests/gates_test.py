import json
import os
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from wb.homeui_backend import gates_cli
from wb.homeui_backend.gates import (
    NGINX_TEST_ATTEMPTS,
    Gate,
    apply_gates,
    load_gates,
    render_gate,
)
from wb.homeui_backend.users_storage import UserType

CONFIGS_DIR = os.path.join(os.path.dirname(__file__), "..", "configs")


def _write_gate(dir_path, name, config):
    with open(os.path.join(dir_path, name + ".json"), "w", encoding="utf-8") as f:
        json.dump(config, f)


class GatesDirsTestBase(unittest.TestCase):
    """Shared fixture: every gates.* path constant is pointed into a per-test tmp root."""

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


class LoadGatesTest(GatesDirsTestBase):
    def test_loads_valid_gate_with_defaults(self):
        _write_gate(self.conf_dir, "my-service", {"internalPort": 9000, "externalPort": 29000})
        gates, skipped = load_gates()
        self.assertEqual(skipped, [])
        self.assertEqual(len(gates), 1)
        self.assertEqual(gates[0].name, "my-service")
        self.assertEqual(gates[0].external_port, 29000)
        self.assertEqual(gates[0].role, UserType.ADMIN)
        self.assertTrue(gates[0].auth)
        self.assertIsNone(gates[0].menu)

    def test_invalid_gate_is_skipped_with_reason(self):
        """Every validation branch reports its reason: missing/invalid ports, a name
        outside [a-z0-9-], equal ports, a menu entry without a title."""
        for name, config, reason in (
            ("svc", {"internalPort": 9000}, "externalPort is required"),
            ("svc", {"internalPort": 9000, "externalPort": 29000, "menu": {}}, "invalid menu field"),
            ("Bad_Name", {"internalPort": 9000, "externalPort": 29000}, "invalid gate name"),
            ("svc", {"internalPort": 9000, "externalPort": 9000}, "must differ from internalPort"),
            ("svc", {"internalPort": "9000", "externalPort": 29000}, "invalid port"),
        ):
            with self.subTest(reason):
                _write_gate(self.conf_dir, name, config)
                gates, skipped = load_gates()
                os.remove(os.path.join(self.conf_dir, name + ".json"))
                self.assertEqual(gates, [])
                self.assertIn(reason, skipped[0])

    def test_port_clash_with_another_gate_is_skipped(self):
        """externalPort must collide with neither another gate's external (duplicate)
        nor internal port (nginx would listen on the service's own port)."""
        _write_gate(self.conf_dir, "a", {"internalPort": 9000, "externalPort": 29000})
        for label, config in (
            ("duplicate external", {"internalPort": 9001, "externalPort": 29000}),
            ("another gate's internal", {"internalPort": 9100, "externalPort": 9000}),
        ):
            with self.subTest(label):
                _write_gate(self.conf_dir, "b", config)
                gates, skipped = load_gates()
                self.assertEqual([g.name for g in gates], ["a"])
                self.assertIn("already used by another gate", skipped[0])

    def test_skips_broken_gates_keeps_valid(self):
        """Every bad file is reported with its reason and must not block the others."""
        _write_gate(self.conf_dir, "ok", {"externalPort": 29000, "internalPort": 9000, "role": "user"})
        _write_gate(self.conf_dir, "bad-port", {"externalPort": 80, "internalPort": 9000})
        _write_gate(self.conf_dir, "bad-role", {"externalPort": 29001, "internalPort": 9001, "role": "root"})
        _write_gate(self.conf_dir, "bad-auth", {"externalPort": 29002, "internalPort": 9003, "auth": "no"})
        gates, skipped = load_gates()
        self.assertEqual([g.name for g in gates], ["ok"])
        self.assertEqual(len(skipped), 3)

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

    def test_gate_renders_per_ip_request_limit(self):
        conf = render_gate(self.gate, https_enabled=False)
        self.assertIn("limit_req zone=wb_gate_perip burst=200 nodelay;", conf)
        self.assertIn("limit_req_status 429;", conf)

    def test_extra_nginx_inc_is_included_when_present(self):
        """<name>.nginx.inc next to the JSON must be included at server level — from
        its copy in the rendered dir; without the file no include line appears."""
        conf_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, conf_dir)
        with patch("wb.homeui_backend.gates.GATES_CONF_DIR", conf_dir), patch(
            "wb.homeui_backend.gates.RENDERED_GATES_DIR", "/rendered"
        ):
            self.assertNotIn(".nginx.inc", render_gate(self.gate, https_enabled=False))
            with open(os.path.join(conf_dir, "svc.nginx.inc"), "w", encoding="utf-8") as f:
                f.write("# extra\n")
            self.assertIn("include /rendered/svc.nginx.inc;", render_gate(self.gate, https_enabled=False))

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


class ApplyGatesTest(GatesDirsTestBase):
    def _apply(self, https_enabled, nginx_ok=True, first_reload_ok=True):
        reloads = []

        def fake_run(cmd, **_kwargs):
            if cmd[0].endswith("nginx") and cmd[1] == "-t":
                return MagicMock(returncode=0 if nginx_ok else 1, stderr="nginx: [emerg] boom")
            if cmd[1] == "reload":
                reloads.append(cmd)
                if not first_reload_ok and len(reloads) == 1:
                    raise subprocess.CalledProcessError(1, cmd)
            return MagicMock(returncode=0)

        with patch("wb.homeui_backend.gates.subprocess.run", side_effect=fake_run), patch(
            "wb.homeui_backend.gates.time.sleep"
        ):
            return apply_gates(https_enabled)

    def test_renders_configs_bounce_and_menu(self):
        """A gate with a menu entry produces a server conf in the current mode, a
        bounce line with the matching scheme and a menu drop-in."""
        _write_gate(
            self.conf_dir,
            "svc",
            {"externalPort": 29000, "internalPort": 9000, "menu": {"title": {"ru": "Сервис", "en": "Svc"}}},
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

    def test_menu_item_carries_required_role_for_auth_gate_only(self):
        """An auth gate's menu drop-in carries requiredRole; a no-auth gate's omits it."""
        _write_gate(
            self.conf_dir,
            "authsvc",
            {
                "externalPort": 29000,
                "internalPort": 9000,
                "role": "operator",
                "menu": {"title": {"en": "Auth"}},
            },
        )
        _write_gate(
            self.conf_dir,
            "opensvc",
            {"externalPort": 29001, "internalPort": 9001, "auth": False, "menu": {"title": {"en": "Open"}}},
        )
        self.assertTrue(self._apply(https_enabled=False).ok)
        with open(os.path.join(self.menu_dir, "wb-gate-authsvc.json"), encoding="utf-8") as f:
            auth_item = json.load(f)["children"][0]
        with open(os.path.join(self.menu_dir, "wb-gate-opensvc.json"), encoding="utf-8") as f:
            open_item = json.load(f)["children"][0]
        self.assertEqual(auth_item["requiredRole"], "operator")
        self.assertNotIn("requiredRole", open_item)

    def test_menu_write_failure_keeps_apply_ok(self):
        """Past a successful reload the gates are live: a menu hiccup is logged, not failed."""
        blocker = os.path.join(self.root, "blocker")
        with open(blocker, "w", encoding="utf-8") as f:
            f.write("not a dir")
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        with patch("wb.homeui_backend.gates.CUSTOM_MENU_DIR", os.path.join(blocker, "custom-menu")):
            result = self._apply(https_enabled=False)
        self.assertTrue(result.ok)

    def test_failed_first_apply_leaves_no_bounces_behind(self):
        """A first-ever apply that fails nginx -t must not leave its fresh bounces file."""
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        result = self._apply(https_enabled=False, nginx_ok=False)
        self.assertFalse(result.ok)
        self.assertFalse(os.path.exists(self.bounces))

    def test_reload_failure_restores_previous_state(self):
        """nginx -t passes but the reload of the new render fails (port taken, systemd
        hiccup): it is rolled back on disk and the rollback reload succeeds, so the
        on-disk state never diverges from what nginx is actually running."""
        _write_gate(
            self.conf_dir,
            "good",
            {"externalPort": 29000, "internalPort": 9000, "menu": {"title": {"en": "Good"}}},
        )
        self.assertTrue(self._apply(https_enabled=False).ok)
        _write_gate(
            self.conf_dir,
            "second",
            {"externalPort": 29001, "internalPort": 9001, "menu": {"title": {"en": "Second"}}},
        )
        result = self._apply(https_enabled=False, first_reload_ok=False)
        self.assertFalse(result.ok)
        self.assertEqual(os.listdir(self.rendered_dir), ["good.conf"])
        # Menu drop-ins are written only after a successful reload.
        self.assertEqual(os.listdir(self.menu_dir), ["wb-gate-good.json"])

    def test_stray_subdir_in_rendered_dir_is_tolerated(self):
        """A leftover subdirectory in the rendered dir must not crash apply."""
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        os.makedirs(self.rendered_dir)
        os.makedirs(os.path.join(self.rendered_dir, "stray-subdir"))
        result = self._apply(https_enabled=False)
        self.assertTrue(result.ok)
        self.assertEqual(os.listdir(self.rendered_dir), ["svc.conf"])

    def test_extra_inc_is_copied_into_rendered_dir(self):
        """The .inc is served from a copy in the rendered dir, so deleting the source
        after apply cannot break a later nginx restart."""
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        with open(os.path.join(self.conf_dir, "svc.nginx.inc"), "w", encoding="utf-8") as f:
            f.write("# extra\n")
        self.assertTrue(self._apply(https_enabled=False).ok)
        self.assertEqual(sorted(os.listdir(self.rendered_dir)), ["svc.conf", "svc.nginx.inc"])
        with open(os.path.join(self.rendered_dir, "svc.conf"), encoding="utf-8") as f:
            self.assertIn(f"include {os.path.join(self.rendered_dir, 'svc.nginx.inc')};", f.read())

    def test_nginx_test_transient_failure_is_retried(self):
        """One transient nginx -t failure (ATECC contention) recovers on the retry;
        an unbroken failure exhausts exactly NGINX_TEST_ATTEMPTS attempts."""
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        for fail_first, expected_ok, expected_attempts in (
            (1, True, 2),
            (NGINX_TEST_ATTEMPTS + 1, False, NGINX_TEST_ATTEMPTS),
        ):
            with self.subTest(fail_first=fail_first):
                attempts = []

                def fake_run(cmd, attempts=attempts, fail_first=fail_first, **_kwargs):
                    if cmd[0].endswith("nginx") and cmd[1] == "-t":
                        attempts.append(cmd)
                        ok = len(attempts) > fail_first
                        return MagicMock(returncode=0 if ok else 1, stderr="nginx: [emerg] busy")
                    return MagicMock(returncode=0)

                shutil.rmtree(self.rendered_dir, ignore_errors=True)
                with patch("wb.homeui_backend.gates.subprocess.run", side_effect=fake_run), patch(
                    "wb.homeui_backend.gates.time.sleep"
                ):
                    result = apply_gates(https_enabled=False)
                self.assertEqual(result.ok, expected_ok)
                self.assertEqual(len(attempts), expected_attempts)

    def test_unchanged_render_skips_nginx_reload(self):
        """Re-applying an identical state (the startup reconcile) must not touch nginx."""
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        self.assertTrue(self._apply(https_enabled=False).ok)
        with patch("wb.homeui_backend.gates.subprocess.run") as run_mock:
            result = apply_gates(https_enabled=False)
        self.assertTrue(result.ok)
        run_mock.assert_not_called()

    def test_inactive_nginx_skips_reload_and_keeps_render(self):
        """With nginx inactive (boot-order race) the render is kept and the reload is
        skipped — nginx reads the rendered files when it starts."""
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})

        def fake_run(cmd, **_kwargs):
            if cmd[1] == "is-active":
                return MagicMock(returncode=3)
            if cmd[1] == "reload":
                raise AssertionError("reload must not be called while nginx is inactive")
            return MagicMock(returncode=0)

        with patch("wb.homeui_backend.gates.subprocess.run", side_effect=fake_run), patch(
            "wb.homeui_backend.gates.time.sleep"
        ):
            result = apply_gates(https_enabled=False)
        self.assertTrue(result.ok)
        self.assertEqual(os.listdir(self.rendered_dir), ["svc.conf"])

    def test_write_failure_rolls_back_and_reports_error(self):
        """A failure in the middle of writing the render (e.g. an unwritable path)
        must restore the previous rendered state, not leave a partial tree."""
        _write_gate(self.conf_dir, "good", {"externalPort": 29000, "internalPort": 9000})
        self.assertTrue(self._apply(https_enabled=False).ok)
        _write_gate(self.conf_dir, "second", {"externalPort": 29001, "internalPort": 9001})
        ro_dir = os.path.join(self.root, "ro")
        os.makedirs(ro_dir)
        os.chmod(ro_dir, 0o555)
        self.addCleanup(os.chmod, ro_dir, 0o755)
        with patch("wb.homeui_backend.gates.BOUNCES_CONF_PATH", os.path.join(ro_dir, "bounces.conf")):
            result = self._apply(https_enabled=False)
        self.assertFalse(result.ok)
        self.assertIn("Permission denied", result.error)
        self.assertEqual(os.listdir(self.rendered_dir), ["good.conf"])

    def test_removed_gate_menu_dropin_is_cleaned_up(self):
        """Deregistering a gate removes its stale menu drop-in; files without the
        wb-gate- prefix in the same dir survive."""
        _write_gate(
            self.conf_dir,
            "svc",
            {"externalPort": 29000, "internalPort": 9000, "menu": {"title": {"en": "S"}}},
        )
        self.assertTrue(self._apply(https_enabled=False).ok)
        with open(os.path.join(self.menu_dir, "10-user.json"), "w", encoding="utf-8") as f:
            f.write("[]")
        os.remove(os.path.join(self.conf_dir, "svc.json"))
        self.assertTrue(self._apply(https_enabled=False).ok)
        self.assertEqual(os.listdir(self.menu_dir), ["10-user.json"])

    def test_lock_failure_returns_error_result(self):
        """Any exception outside the transaction (e.g. an unwritable lock path) must
        become ok=False with the message, never propagate to the caller."""
        with patch("wb.homeui_backend.gates.LOCK_PATH", os.path.join(self.root, "absent", "lock")):
            result = apply_gates(https_enabled=False)
        self.assertFalse(result.ok)
        self.assertIn("absent", result.error)


@unittest.skipUnless(os.path.isdir(CONFIGS_DIR), "configs/ is not present in the pybuild sandbox")
class GateAuthCheckSnippetTest(unittest.TestCase):
    @staticmethod
    def _read_snippet(name):
        with open(os.path.join(CONFIGS_DIR, "etc", "nginx", "snippets", name), encoding="utf-8") as f:
            return f.read()

    def test_pins_allow_unauthorized_get_to_block_client_bypass(self):
        """The gate auth snippet must neutralize a client-supplied
        Allow-Unauthorized-Get so a gate cannot be bypassed with an unauthenticated
        GET (regression for the auth-request header-forwarding bypass)."""
        self.assertIn(
            'proxy_set_header Allow-Unauthorized-Get "";', self._read_snippet("wb-gate-authcheck.inc")
        )

    def test_unauth_snippet_redirects_html_navigations_without_sec_fetch(self):
        """Over plain HTTP browsers don't send Sec-Fetch-Mode, so the unauth
        fallback must also redirect on Accept: text/html — else a logged-out
        browser on an HTTP gate gets a bare 401 instead of the login form."""
        content = self._read_snippet("wb-gate-unauth.inc")
        self.assertIn("$http_accept", content)
        self.assertIn("text/html", content)


class CliReadHttpsEnabledTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp)
        self.config = os.path.join(self.tmp, "conf")
        for target, value in {
            "wb.homeui_backend.config_file.CONFIG_FILE": self.config,
            # Pin a usable certificate so the flag-parsing tests keep their meaning.
            "wb.homeui_backend.gates_cli.is_certificate_usable": lambda: True,
        }.items():
            patcher = patch(target, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def _write(self, content):
        with open(self.config, "w", encoding="utf-8") as f:
            f.write(content)

    def test_missing_file_defaults_to_off(self):
        self.assertFalse(gates_cli.read_https_enabled())

    def test_flag_parsing(self):
        """Only a literal true enables HTTPS; a non-bool value must not be
        truthy-coerced, matching the backend's enable_https validation."""
        for content, expected in (
            ('{"enable_https": true}', True),
            ('{"enable_https": false}', False),
            ('{"enable_https": "false"}', False),
        ):
            with self.subTest(content):
                self._write(content)
                self.assertEqual(gates_cli.read_https_enabled(), expected)

    def test_flag_on_with_unusable_cert_is_off(self):
        """Effective HTTPS in the CLI: with the flag on but no usable certificate the
        CLI must render plain HTTP — an ssl gate would reference a missing file."""
        self._write('{"enable_https": true}')
        with patch("wb.homeui_backend.gates_cli.is_certificate_usable", return_value=False):
            self.assertFalse(gates_cli.read_https_enabled())


class CliApplyEffectiveHttpsTest(GatesDirsTestBase):
    def setUp(self):
        super().setUp()
        config = os.path.join(self.root, "conf")
        patcher = patch("wb.homeui_backend.config_file.CONFIG_FILE", config)
        patcher.start()
        self.addCleanup(patcher.stop)
        with open(config, "w", encoding="utf-8") as f:
            f.write('{"enable_https": true}')

    def _cli_apply(self, cert_usable):
        """Run `apply` with the given cert usability; returns the remove-https mock."""
        with patch("wb.homeui_backend.gates_cli.is_certificate_usable", return_value=cert_usable), patch(
            "wb.homeui_backend.gates_cli.remove_nginx_https_config"
        ) as remove_mock, patch(
            "wb.homeui_backend.gates.subprocess.run", return_value=MagicMock(returncode=0)
        ), patch(
            "wb.homeui_backend.gates.time.sleep"
        ):
            self.assertEqual(gates_cli.apply_command(), 0)
        return remove_mock

    def test_apply_with_unusable_cert_drops_stale_https_conf_and_renders_http(self):
        """With the flag on but no usable certificate (e.g. postinst on a fresh
        install), apply removes a stale main-UI https.conf first (it would fail the
        shared nginx -t) and renders plain-HTTP gates."""
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        self._cli_apply(cert_usable=False).assert_called_once_with(reload_nginx=False)
        with open(os.path.join(self.rendered_dir, "svc.conf"), encoding="utf-8") as f:
            conf = f.read()
        self.assertIn("listen 29000;", conf)
        self.assertNotIn("ssl", conf)
        self.assertNotIn("wb-gate-tls.inc", conf)

    def test_apply_with_usable_cert_keeps_https_conf(self):
        self._cli_apply(cert_usable=True).assert_not_called()


class CliExitCodesTest(GatesDirsTestBase):
    """Exit codes are the CLI's machine contract (packaging scripts call apply):
    0 = everything valid/applied, 1 = a config skipped or the apply rolled back."""

    def setUp(self):
        super().setUp()
        config = os.path.join(self.root, "conf")
        with open(config, "w", encoding="utf-8") as f:
            f.write('{"enable_https": false}')
        for target, value in {
            "wb.homeui_backend.config_file.CONFIG_FILE": config,
            "wb.homeui_backend.gates_cli.is_certificate_usable": lambda: True,
        }.items():
            patcher = patch(target, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def _apply_cli(self, nginx_ok=True):
        def fake_run(cmd, **_kwargs):
            if cmd[0].endswith("nginx") and cmd[1] == "-t":
                return MagicMock(returncode=0 if nginx_ok else 1, stderr="nginx: [emerg] boom")
            return MagicMock(returncode=0)

        with patch("wb.homeui_backend.gates.subprocess.run", side_effect=fake_run), patch(
            "wb.homeui_backend.gates.time.sleep"
        ):
            return gates_cli.apply_command()

    def test_check_returns_0_for_valid_and_1_for_skipped(self):
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        self.assertEqual(gates_cli.check(), 0)
        _write_gate(self.conf_dir, "bad", {"internalPort": 9000})
        self.assertEqual(gates_cli.check(), 1)

    def test_apply_returns_1_on_rollback(self):
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        self.assertEqual(self._apply_cli(nginx_ok=False), 1)

    def test_apply_returns_1_with_skipped_but_applies_the_valid_gates(self):
        _write_gate(self.conf_dir, "svc", {"externalPort": 29000, "internalPort": 9000})
        _write_gate(self.conf_dir, "bad", {"internalPort": 9000})
        self.assertEqual(self._apply_cli(), 1)
        self.assertEqual(os.listdir(self.rendered_dir), ["svc.conf"])
