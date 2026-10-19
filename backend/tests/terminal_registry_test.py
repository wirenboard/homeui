import os
import socket
from unittest.mock import patch

from tests.terminal_helpers import SERVICE_CGROUP, SESSION_SCOPE, TerminalTestBase
from wb.homeui_backend.terminal import registry

FIRST = "a" * 32
SECOND = "b" * 32
THIRD = "c" * 32

# /proc/locks captured on a WB8 stand (Debian trixie): pid 198864 holds POSIX write locks on
# /var/lib/dpkg/lock and lock-frontend (st_dev 45826 = b3:02), pid 198872 waits for the first.
# Only the device:inode of those two files is templated to point at the test's lock files.
STAND_PROC_LOCKS = """\
1: FLOCK  ADVISORY  WRITE 5068 b3:06:651558 0 EOF
2: FLOCK  ADVISORY  WRITE 364 00:1a:1241 0 EOF
3: POSIX  ADVISORY  WRITE 198864 {dpkg_lock} 0 EOF
3: -> POSIX  ADVISORY  WRITE 198872 {dpkg_lock} 0 EOF
4: POSIX  ADVISORY  WRITE 198864 {frontend_lock} 0 EOF
5: FLOCK  ADVISORY  WRITE 5068 b3:06:651717 0 EOF
6: POSIX  ADVISORY  READ 5012 b3:06:651571 128 128
7: POSIX  ADVISORY  READ 5012 b3:06:651547 1073741826 1073742335
8: FLOCK  ADVISORY  WRITE 4710 00:1f:3 0 EOF
"""
STAND_LOCK_DEVICE = 45826
STAND_DPKG_LOCK = "b3:02:28983"


def proc_locks_device_inode(path):
    """A file's id as in /proc/locks: hex major:minor, decimal inode."""
    info = os.stat(path)
    return f"{os.major(info.st_dev):02x}:{os.minor(info.st_dev):02x}:{info.st_ino}"


class ListSessionsTest(TerminalTestBase):
    def test_sockets_make_up_the_registry(self):
        self.add_session(FIRST, 101)
        self.add_session(SECOND, 202)
        sessions = registry.list_sessions()
        self.assertEqual({entry.session_id for entry in sessions}, {FIRST, SECOND})
        self.assertEqual({entry.login_pid for entry in sessions}, {101, 202})

    def test_stray_files_are_not_sessions(self):
        """Only <hex id>.<login_pid>.sock names count."""
        for name in ("notes.txt", "zz.1.sock", f"{FIRST}.sock", f"{FIRST}.0.sock", "listen.sock"):
            with open(os.path.join(self.runtime_dir, name), "w", encoding="utf-8"):
                pass
        self.assertEqual(registry.list_sessions(), [])

    def test_missing_directory_is_an_empty_registry(self):
        with patch.object(registry, "RUNTIME_DIR", os.path.join(self.root, "nowhere")):
            self.assertEqual(registry.list_sessions(), [])

    def test_find_session_by_id(self):
        self.add_session(FIRST, 101)
        self.assertEqual(registry.find_session(FIRST).login_pid, 101)
        self.assertIsNone(registry.find_session(SECOND))


class ControlMessageTest(TerminalTestBase):
    def test_a_received_client_is_not_inherited_by_what_the_session_starts(self):
        """A received descriptor is close-on-exec, so processes the session starts do not hold the client."""
        sender, receiver = socket.socketpair()
        client, peer = socket.socketpair()
        with sender, receiver, client, peer:
            client.set_inheritable(True)
            socket.send_fds(sender, [registry.GO_BYTE], [client.fileno()])
            message = registry.receive_control_message(receiver)
            self.addCleanup(os.close, message.fd)
            self.assertFalse(os.get_inheritable(message.fd))


class ProcessFactsTest(TerminalTestBase):
    def test_scope_is_read_out_of_the_cgroup(self):
        self.proc.add_process(701, cgroup=SESSION_SCOPE.format(7))
        self.proc.add_process(702, cgroup=SERVICE_CGROUP)
        self.assertEqual(registry.session_scope(701), "session-7.scope")
        self.assertIsNone(registry.session_scope(702))


class AptLockTest(TerminalTestBase):
    def test_holder_of_a_lock_file_is_found(self):
        self.proc.add_process(800)
        self.proc.write_locks([(800, self.lock_path)])
        self.assertEqual(registry.apt_lock_holders(), [800])

    def test_locks_on_other_files_are_ignored(self):
        other = os.path.join(self.root, "other-lock")
        with open(other, "w", encoding="utf-8"):
            pass
        self.proc.write_locks([(800, other)])
        self.assertEqual(registry.apt_lock_holders(), [])

    def test_waiting_for_the_lock_is_not_holding_it(self):
        """A '->' line is a waiter, not a holder."""
        self.proc.write_locks([(800, self.lock_path)], waiters=[(801, self.lock_path)])
        self.assertEqual(registry.apt_lock_holders(), [800])

    def test_session_holding_the_lock_is_matched_by_its_scope(self):
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.add_session(SECOND, 202, cgroup=SESSION_SCOPE.format(8))
        self.hold_apt_lock(800, SESSION_SCOPE.format(8))
        self.assertTrue(registry.session_holds_apt_lock(202))
        self.assertFalse(registry.session_holds_apt_lock(101))

    def test_a_lock_held_outside_the_console_belongs_to_no_session(self):
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.hold_apt_lock(800, "/system.slice/unattended-upgrades.service")
        self.assertFalse(registry.session_holds_apt_lock(101))


class StandProcLocksTest(TerminalTestBase):
    """The lock table captured from a real dpkg transaction."""

    def setUp(self):
        super().setUp()
        self.frontend_lock_path = os.path.join(self.root, "dpkg-lock-frontend")
        with open(self.frontend_lock_path, "w", encoding="utf-8"):
            pass
        with open(os.path.join(self.proc.root, "locks"), "w", encoding="utf-8") as locks:
            locks.write(
                STAND_PROC_LOCKS.format(
                    dpkg_lock=proc_locks_device_inode(self.lock_path),
                    frontend_lock=proc_locks_device_inode(self.frontend_lock_path),
                )
            )

    def test_the_stand_device_is_written_as_the_kernel_writes_it(self):
        """Sanity check of the captured data: st_dev matches the device in /proc/locks."""
        major, minor, _inode = STAND_DPKG_LOCK.split(":")
        self.assertEqual(
            (os.major(STAND_LOCK_DEVICE), os.minor(STAND_LOCK_DEVICE)), (int(major, 16), int(minor, 16))
        )

    def test_the_holder_of_each_lock_file_is_found(self):
        """dpkg's lockf locks show as POSIX lines; the holder is found via either file."""
        for path in (self.lock_path, self.frontend_lock_path):
            with self.subTest(path=os.path.basename(path)):
                self.patch(registry, "APT_LOCK_PATHS", (path,))
                self.assertEqual(registry.apt_lock_holders(), [198864])

    def test_only_the_holder_counts_on_a_table_with_waiters_and_other_files(self):
        """Waiters and locks on other files add no holders."""
        self.patch(registry, "APT_LOCK_PATHS", (self.lock_path, self.frontend_lock_path))
        self.assertEqual(registry.apt_lock_holders(), [198864, 198864])


class ChooseVictimTest(TerminalTestBase):
    def test_the_oldest_session_goes_first(self):
        """Age decides, not the name: the oldest is last alphabetically."""
        self.add_session(THIRD, 303)
        self.add_session(FIRST, 101)
        self.add_session(SECOND, 202)
        self.assertEqual(registry.choose_victim(registry.list_sessions()).session_id, THIRD)

    def test_the_session_holding_the_apt_lock_is_spared(self):
        """A session running a package installation is never evicted."""
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.add_session(SECOND, 202, cgroup=SESSION_SCOPE.format(8))
        self.hold_apt_lock(800, SESSION_SCOPE.format(7))
        self.assertEqual(registry.choose_victim(registry.list_sessions()).session_id, SECOND)

    def test_the_lock_is_read_at_the_moment_of_choosing(self):
        """The lock is read at call time, not cached."""
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.add_session(SECOND, 202, cgroup=SESSION_SCOPE.format(8))
        self.proc.add_process(800, cgroup=SESSION_SCOPE.format(7))
        self.proc.add_process(801, cgroup=SESSION_SCOPE.format(8))
        sessions = registry.list_sessions()

        self.proc.write_locks([(800, self.lock_path)])
        self.assertEqual(registry.choose_victim(sessions).session_id, SECOND)
        self.proc.write_locks([(801, self.lock_path)])
        self.assertEqual(registry.choose_victim(sessions).session_id, FIRST)

    def test_nothing_to_evict(self):
        self.add_session(FIRST, 101, cgroup=SESSION_SCOPE.format(7))
        self.hold_apt_lock(800, SESSION_SCOPE.format(7))
        self.assertIsNone(registry.choose_victim(registry.list_sessions()))
