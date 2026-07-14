"""CLI logic for wb-homeui-gates: validate and apply service-gate configs.

Kept in the package (not the thin wb-homeui-gates script) so it is importable and
testable in the pybuild sandbox, which only ships the wb/ package and tests/.
"""

import argparse

from .cert import is_certificate_usable, remove_nginx_https_config
from .config_file import load_https_flag
from .gates import GATES_CONF_DIR, apply_gates, load_gates


def read_https_enabled() -> bool:
    """Effective HTTPS for rendering: flag on AND a usable certificate on disk (else plain HTTP)."""
    try:
        return load_https_flag() and is_certificate_usable()
    except Exception:  # pylint: disable=broad-exception-caught
        return False


def print_gates(gates, https_enabled: bool) -> None:
    scheme = "https" if https_enabled else "http"
    for gate in gates:
        auth = f"role >= {gate.role.value}" if gate.auth else "NO AUTH"
        menu = ", menu item" if gate.menu else ""
        target = f"{scheme}://<host>:{gate.external_port} -> 127.0.0.1:{gate.internal_port}"
        print(f"  {gate.name}: {target} ({auth}{menu})")


def print_skipped(skipped) -> None:
    for reason in skipped:
        print(f"  SKIPPED {reason}")


def check() -> int:
    https_enabled = read_https_enabled()
    gates, skipped = load_gates()
    print(f"Configs: {GATES_CONF_DIR}, HTTPS: {'on' if https_enabled else 'off'}")
    print_gates(gates, https_enabled)
    print_skipped(skipped)
    if not gates and not skipped:
        print("  no gates registered")
    return 1 if skipped else 0


def apply_command() -> int:
    https_enabled = read_https_enabled()
    # A stale main-UI https.conf referencing a missing certificate would fail the
    # shared nginx -t below and roll the gates back to their old TLS render.
    if not is_certificate_usable():
        remove_nginx_https_config(reload_nginx=False)
    result = apply_gates(https_enabled)
    print_gates(result.gates, https_enabled)
    print_skipped(result.skipped)
    if not result.ok:
        print(f"FAILED, previous state kept: {result.error}")
        return 1
    print(f"Applied {len(result.gates)} gate(s)" + (", with skipped configs" if result.skipped else ""))
    return 1 if result.skipped else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("check", help="Validate gate configs without applying")
    subparsers.add_parser("apply", help="Render gate configs and reload nginx")
    args = parser.parse_args()
    return check() if args.command == "check" else apply_command()
