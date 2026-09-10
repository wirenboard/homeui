import sqlite3
import unittest

from wb.homeui_backend.db import create_tables
from wb.homeui_backend.users_storage import User, UsersStorage, UserType


class GetAutologinUserTest(unittest.TestCase):
    def setUp(self):
        self.connection = sqlite3.connect(":memory:")
        create_tables(self.connection)
        self.storage = UsersStorage(self.connection)

    def tearDown(self):
        self.connection.close()

    def test_returns_the_autologin_user(self):
        self.storage.add_user(User("", "kiosk", "hash", UserType.USER, True))
        self.assertEqual(self.storage.get_autologin_user().login, "kiosk")

    def test_no_autologin_user(self):
        self.storage.add_user(User("", "admin", "hash", UserType.ADMIN, False))
        self.assertIsNone(self.storage.get_autologin_user())

    def test_stale_autologin_row_of_a_non_user_account_is_returned_with_the_flag_off(self):
        """A row written before the User.type-setter fix can still hold autologin=1 for an
        operator/admin account. The row is still returned, only the model normalises the
        flag to off."""
        self.connection.execute(
            "INSERT INTO users (user_id, login, pwd_hash, type, autologin) VALUES (?, ?, ?, ?, ?)",
            ("1", "op", "hash", UserType.OPERATOR.value, 1),
        )
        self.connection.commit()
        user = self.storage.get_autologin_user()
        self.assertEqual(user.login, "op")
        self.assertFalse(user.autologin)
