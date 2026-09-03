import os
import shutil
import sqlite3
import tempfile
import unittest

from wb.homeui_backend.db import DB_SCHEMA_VERSION, DbState, check_db, open_db


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

    def test_keeps_the_file_when_the_database_has_no_tables(self):
        """
        A readable database is filled in place: the file keeps its inode and its rows.
        """
        db_file = os.path.join(self.tmp_dir, "users.db")
        con = sqlite3.connect(db_file)
        con.execute("CREATE TABLE leftovers (x TEXT)")
        con.execute("INSERT INTO leftovers VALUES ('keep me')")
        con.commit()
        con.execute("DROP TABLE leftovers")
        con.commit()
        con.close()
        inode = os.stat(db_file).st_ino

        con = open_db(db_file)
        self.addCleanup(con.close)

        self.assertEqual(os.stat(db_file).st_ino, inode)
        self.assertEqual(con.execute("PRAGMA user_version").fetchone()[0], DB_SCHEMA_VERSION)

    def test_locked_database_is_not_removed(self):
        """
        A transient sqlite error (here: a locked database) propagates and leaves the file alone.
        """
        db_file = os.path.join(self.tmp_dir, "users.db")
        con = open_db(db_file)
        con.execute("INSERT INTO users VALUES ('id', 'admin', 'hash', 'admin', 0)")
        con.commit()
        con.close()

        locker = sqlite3.connect(db_file, timeout=0.1)
        self.addCleanup(locker.close)
        locker.execute("BEGIN EXCLUSIVE")

        with self.assertRaises(sqlite3.OperationalError):
            open_db(db_file)

        locker.rollback()
        con = sqlite3.connect(db_file)
        self.addCleanup(con.close)
        self.assertEqual(con.execute("SELECT login FROM users").fetchall(), [("admin",)])

    def test_check_db_tells_a_nul_filled_file_from_one_needing_a_schema(self):
        """
        Only a file that is not SQLite at all gets the state open_db deletes on.
        """
        nul_filled = os.path.join(self.tmp_dir, "nul.db")
        with open(nul_filled, "wb") as f:
            f.write(bytes(24576))
        empty = os.path.join(self.tmp_dir, "empty.db")
        open(empty, "wb").close()

        self.assertIs(check_db(nul_filled), DbState.NOT_A_DATABASE)
        self.assertIs(check_db(empty), DbState.NEEDS_SCHEMA)
        self.assertIs(check_db(os.path.join(self.tmp_dir, "missing.db")), DbState.NEEDS_SCHEMA)
