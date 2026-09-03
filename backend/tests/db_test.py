import os
import shutil
import sqlite3
import tempfile
import unittest

from wb.homeui_backend.db import DB_SCHEMA_VERSION, open_db


class OpenDbTest(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp_dir, ignore_errors=True)

    def test_recreates_non_sqlite_database_behind_symlink(self):
        """
        A power-cut-damaged database is removed from persistent storage and recreated.
        """
        data_dir = os.path.join(self.tmp_dir, "mnt", "data", "var", "lib", "wb-homeui")
        os.makedirs(data_dir)
        db_target = os.path.join(data_dir, "users.db")
        damaged_content = bytes(24576)
        with open(db_target, "wb") as f:
            f.write(damaged_content)

        db_dir = os.path.join(self.tmp_dir, "var", "lib", "wb-homeui")
        os.makedirs(db_dir)
        db_file = os.path.join(db_dir, "users.db")
        os.symlink(db_target, db_file)

        con = open_db(db_file)
        self.addCleanup(con.close)

        self.assertTrue(os.path.islink(db_file))
        self.assertEqual(con.execute("PRAGMA user_version").fetchone()[0], DB_SCHEMA_VERSION)
        self.assertEqual(
            [
                row[0]
                for row in con.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            ],
            ["sessions", "users"],
        )
        with open(db_target, "rb") as f:
            self.assertNotEqual(f.read(), damaged_content)
        self.assertFalse(os.path.exists(f"{db_target}.corrupt"))

    def test_migrates_valid_old_database_in_place(self):
        """
        A valid old database is migrated in place and keeps its users.
        """
        db_file = os.path.join(self.tmp_dir, "users.db")
        con = sqlite3.connect(db_file)
        con.execute(
            "CREATE TABLE users ("
            "user_id TEXT PRIMARY KEY NOT NULL, "
            "login TEXT UNIQUE NOT NULL, "
            "pwd_hash TEXT NOT NULL, "
            "type TEXT NOT NULL)"
        )
        con.execute("INSERT INTO users VALUES (?, ?, ?, ?)", ("id", "admin", "hash", "admin"))
        con.commit()
        con.close()

        con = open_db(db_file)
        self.addCleanup(con.close)

        self.assertEqual(con.execute("PRAGMA user_version").fetchone()[0], DB_SCHEMA_VERSION)
        self.assertEqual(
            con.execute("SELECT user_id, login, pwd_hash, type, autologin FROM users").fetchall(),
            [("id", "admin", "hash", "admin", 0)],
        )
