import enum
import logging
import os
import sqlite3

DB_SCHEMA_VERSION = 2


class DbState(enum.Enum):
    USABLE = "usable"
    NEEDS_SCHEMA = "needs_schema"
    NOT_A_DATABASE = "not_a_database"


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


def create_db(db_file: str) -> sqlite3.Connection:
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    con = sqlite3.connect(db_file)
    create_tables(con)
    cur = con.cursor()
    cur.execute("PRAGMA user_version = 2")
    return con


def open_db(db_file: str) -> sqlite3.Connection:
    state = check_db(db_file)
    if state is DbState.NOT_A_DATABASE:
        db_real_path = os.path.realpath(db_file)
        logging.error("Removing broken database %s", db_real_path)
        os.remove(db_real_path)
        return create_db(db_file)
    if state is DbState.NEEDS_SCHEMA:
        return create_db(db_file)

    con = sqlite3.connect(db_file)
    cur = con.cursor()
    cur.execute("PRAGMA user_version")
    version = cur.fetchone()[0]
    if version > DB_SCHEMA_VERSION:
        raise RuntimeError(f"Database schema version mismatch. Need {DB_SCHEMA_VERSION}, got {version}")
    if version < DB_SCHEMA_VERSION:
        update_db(con, version)
    return con


def check_db(db_file: str) -> DbState:
    if not os.path.exists(db_file):
        return DbState.NEEDS_SCHEMA

    con = sqlite3.connect(db_file)
    try:
        cursor = con.cursor()
        cursor.execute("PRAGMA quick_check")
        if cursor.fetchone()[0] != "ok":
            logging.error("Database is broken. Recreating tables")
            return DbState.NEEDS_SCHEMA

        cursor.execute("SELECT count(name) FROM sqlite_master WHERE type='table'")
        if cursor.fetchone()[0] < 1:
            logging.error("Database has no tables. Recreating tables")
            return DbState.NEEDS_SCHEMA
        return DbState.USABLE
    except sqlite3.OperationalError:
        raise
    except sqlite3.DatabaseError as e:
        logging.error("Database is not readable: %s", e)
        return DbState.NOT_A_DATABASE
    finally:
        con.close()
