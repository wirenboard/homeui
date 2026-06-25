import subprocess


def of_machine_match(compatible: str) -> bool:
    """Return True if the running board's device tree matches `compatible`.

    Thin wrapper over wb-utils' of_machine_match; shared by cert.get_keyspec and
    dashboards.detect_board so the wb_env.sh invocation lives in one place.
    """
    command = f'. /usr/lib/wb-utils/wb_env.sh && wb_source of && of_machine_match "{compatible}"'
    result = subprocess.run(["/bin/bash", "-c", command], check=False)
    return result.returncode == 0
