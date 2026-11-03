import fcntl
import os
import signal
import termios
from dataclasses import dataclass
from typing import List

LOGIN_PATH = "/bin/login"

# A zero window size makes /bin/login think the terminal is gone and exit before the password
# prompt. The upper bound is what the ioctl can carry (unsigned short).
MAX_WINDOW_SIZE = 0xFFFF

DEFAULT_LOGIN_HOST = "web"
DEFAULT_TERM = "xterm-256color"
DEFAULT_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
# Fallback UTF-8 locale (C.UTF-8 always exists). /etc/default/locale still wins: Debian's pam_env
# reads it, and login applies the PAM environment over the one kept with -p.
DEFAULT_LANG = "C.UTF-8"

LOGIN_ENVIRONMENT = {
    "TERM": DEFAULT_TERM,
    "PATH": DEFAULT_PATH,
    "LANG": DEFAULT_LANG,
}


@dataclass
class PtyProcess:
    master_fd: int
    login_pid: int


def valid_window_size(value) -> bool:
    return isinstance(value, int) and 0 < value <= MAX_WINDOW_SIZE


def login_command(remote_addr: str) -> List[str]:
    return [LOGIN_PATH, "-p", "-h", remote_addr or DEFAULT_LOGIN_HOST]


def start_login(remote_addr: str) -> PtyProcess:
    master_fd, slave_fd = os.openpty()
    argv = login_command(remote_addr)
    pid = os.fork()
    if pid == 0:
        try:
            # Python ignores SIGPIPE, and an ignored signal survives exec: restore it for login.
            signal.signal(signal.SIGPIPE, signal.SIG_DFL)
            os.setsid()
            fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
            for target in (0, 1, 2):
                os.dup2(slave_fd, target)
            if slave_fd > 2:
                os.close(slave_fd)
            os.close(master_fd)
            os.chdir("/")
            os.execve(argv[0], argv, LOGIN_ENVIRONMENT)
        finally:
            os._exit(127)  # pylint: disable=protected-access  # os._exit is the POSIX _exit(2)
    os.close(slave_fd)
    return PtyProcess(master_fd, pid)


def login_alive(pid: int) -> bool:
    try:
        reaped, _status = os.waitpid(pid, os.WNOHANG)
    except OSError:
        return False
    return reaped == 0
