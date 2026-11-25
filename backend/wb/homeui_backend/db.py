import logging
import os
import sqlite3

# PRAGMA user_version: bump with a migration for any change to an existing table. An older
# backend refuses to start on a database with a newer user_version. New tables need no bump:
# create_tables() adds missing ones on every start, and an older backend just ignores them.
DB_SCHEMA_VERSION = 2

# The database holds password hashes and session tokens; only the backend (root) reads it.
DB_FILE_MODE = 0o600


class IncompatibleDbError(Exception):
    pass


def create_tables(con: sqlite3.Connection):
    cursor = con.cursor()
    cursor.execute(
        (
            "CREATE TABLE IF NOT EXISTS users ("
            "user_id TEXT PRIMARY KEY NOT NULL, "
            "login TEXT UNIQUE NOT NULL, "
            "pwd_hash TEXT NOT NULL, "
            "type TEXT NOT NULL, "
            "autologin INTEGER NOT NULL DEFAULT 0)"
        )
    )
    con.commit()

    cursor.execute(
        (
            "CREATE TABLE IF NOT EXISTS sessions ("
            "session_id TEXT PRIMARY KEY NOT NULL, "
            "user_id TEXT NOT NULL, "
            "start_date INTEGER NOT NULL)"
        )
    )
    con.commit()

    cursor.execute(
        (
            "CREATE TABLE IF NOT EXISTS webauthn_credentials ("
            "credential_id BLOB PRIMARY KEY NOT NULL, "
            "user_id TEXT NOT NULL, "
            "name TEXT NOT NULL, "
            "domain TEXT NOT NULL, "
            "credential_data BLOB NOT NULL, "
            "sign_count INTEGER NOT NULL DEFAULT 0, "
            "created_at INTEGER NOT NULL, "
            "last_used_at INTEGER)"
        )
    )
    con.commit()


def remove_orphan_credentials(con: sqlite3.Connection) -> None:
    # An older backend (after a package downgrade) deletes users without their passkeys
    con.execute("DELETE FROM webauthn_credentials WHERE user_id NOT IN (SELECT user_id FROM users)")
    con.commit()


def migration_2(con: sqlite3.Connection) -> None:
    logging.info("Migrating database to version 2")
    cursor = con.cursor()
    cursor.execute(
        (
            "CREATE TABLE IF NOT EXISTS sessions ("
            "session_id TEXT PRIMARY KEY NOT NULL, "
            "user_id TEXT NOT NULL, "
            "start_date INTEGER NOT NULL)"
        )
    )
    con.commit()

    cursor.execute("DROP TABLE IF EXISTS keys")
    con.commit()

    cursor = con.cursor()
    cursor.execute("PRAGMA user_version = 2")


def migration_1(con: sqlite3.Connection) -> None:
    logging.info("Migrating database to version 1")
    cursor = con.cursor()
    cursor.execute("ALTER TABLE users ADD COLUMN autologin INTEGER NOT NULL DEFAULT 0")
    con.commit()
    cursor = con.cursor()
    cursor.execute("PRAGMA user_version = 1")


def update_db(con: sqlite3.Connection, version: int) -> None:
    migrations = [migration_1, migration_2]
    for migration_fn in migrations[version:]:
        migration_fn(con)


def open_db(db_file: str) -> sqlite3.Connection:
    is_new = not check_db(db_file)
    if is_new:
        db_real_path = os.path.realpath(db_file)
        if os.path.exists(db_real_path):
            logging.error("Removing broken database %s", db_real_path)
            os.remove(db_real_path)
        os.makedirs(os.path.dirname(db_file), exist_ok=True)

    con = sqlite3.connect(db_file)
    os.chmod(db_file, DB_FILE_MODE)
    if is_new:
        con.execute("PRAGMA user_version = 2")
    else:
        version = con.execute("PRAGMA user_version").fetchone()[0]
        if version > DB_SCHEMA_VERSION:
            con.close()
            raise IncompatibleDbError(
                f"Database schema version mismatch. Need {DB_SCHEMA_VERSION}, got {version}"
            )
        update_db(con, version)
    create_tables(con)
    remove_orphan_credentials(con)
    return con


def check_db(db_file: str) -> bool:
    if not os.path.exists(db_file):
        return False

    con = sqlite3.connect(db_file)
    try:
        cursor = con.cursor()
        cursor.execute("PRAGMA quick_check")
        if cursor.fetchone()[0] != "ok":
            logging.error("Database is broken. Recreating")
            return False

        cursor.execute("SELECT count(name) FROM sqlite_master WHERE type='table'")
        if cursor.fetchone()[0] < 1:
            logging.error("Database has no tables. Recreating")
            return False
        return True
    except sqlite3.DatabaseError as e:
        logging.error("Database is not readable: %s", e)
        return False
    finally:
        con.close()
