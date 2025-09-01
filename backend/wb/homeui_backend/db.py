import os
import sqlite3

DB_SCHEMA_VERSION = 2


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
    if not os.path.exists(db_file):
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
