import subprocess  # nosec B404 - needed to run the wb-utils of_machine_match shell function


def of_machine_match(compatible: str) -> bool:
    """Return True if the running board's device tree matches `compatible`.

    Thin wrapper over wb-utils' of_machine_match; shared by cert.get_keyspec and
    dashboards.detect_board so the wb_env.sh invocation lives in one place.
    """
    # Pass `compatible` as an argv element ($1) rather than interpolating it into
    # the script text, so its contents can never break out of the shell command;
    # callers only ever pass fixed device-tree constants (BOARD_MATCHES / cert.py).
    command = '. /usr/lib/wb-utils/wb_env.sh && wb_source of && of_machine_match "$1"'
    result = subprocess.run(  # nosec B603 - shell input is a fixed constant, passed as argv
        ["/bin/bash", "-c", command, "of_machine_match", compatible], check=False
    )
    return result.returncode == 0
