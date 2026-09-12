import psycopg2
from psycopg2 import pool as dbp, errors as dberrs
from psycopg2.extensions import cursor

import os, sys
from typing import Any
from contextlib import contextmanager
from collections.abc import Iterator

from . import models

DB_URL = os.environ.get("DATABASE_URL")

if DB_URL is None or DB_URL == "":
    raise Exception("DATABASE_URL is not set")

_db_pool = None
@contextmanager
def _get_cur() -> Iterator[cursor]:
    global _db_pool
    if _db_pool is None:
        _db_pool = dbp.SimpleConnectionPool(1, 2, DB_URL)
    __conn = _db_pool.getconn()
    try:
        yield __conn.cursor()
        __conn.commit()
    except Exception:
        __conn.rollback()
        raise
    finally:
        _db_pool.putconn(__conn)


def _query(query: str) -> tuple[Any, ...] | None:
    with _get_cur() as cur:
        cur.execute(query)
        return cur.fetchone()

def _query_all(query: str) -> list[tuple[Any, ...]]:
    with _get_cur() as cur:
        cur.execute(query)
        return cur.fetchall()

def execute_query(query: str) -> int:
    try:
        with _get_cur() as cur:
            cur.execute(query)
            it = cur.fetchone()
            return it[0] if it is not None else -1
    except dberrs.ForeignKeyViolation:
        return -2
    except psycopg2.IntegrityError:
        return -3
    except psycopg2.ProgrammingError:
        return -4

def get_user_info(username: str) -> models.User | None:
    r = _query(f"SELECT id, username, password_hash, salt, algorithm, admin FROM auth.user WHERE username = '{username}'")
    if r is None:
        return None
    return models.User(*r)

def login_device(device_id: str, api_key: str) -> list[tuple[str, str]]:
    return _query_all(f"SELECT auth_device, auth_device_id FROM auth.device_login WHERE device_id = {device_id} AND token = '{api_key}'")

def create_user(user: models.User) -> int:
    uid = execute_query(f"""
    INSERT INTO auth.user (username, password_hash, salt, algorithm, admin) 
    VALUES ('{user.username}', '{user.password_hash}', '{user.salt}', '{user.algorithm}', {user.admin}) RETURNING id
    """)
    if uid >= 0:
        user.uid = uid
    print(uid)
    return uid

def list_users():
    return [models.User(*r) for r in _query_all("SELECT id, username, password_hash, salt, algorithm, admin FROM auth.user") if r is not None]

def update_user(uid: int, username: str, admin: bool) -> int:
    return execute_query(f"UPDATE auth.user SET username = '{username}', admin = {admin} WHERE id = {uid} RETURNING id")

def change_password(u: models.User) -> int:
    return execute_query(f"""
        UPDATE auth.user 
        SET password_hash = '{u.password_hash}', salt = '{u.salt}', algorithm = '{u.algorithm}' 
        WHERE id = {u.uid} RETURNING id
    """)


def add_device(device_id: str, name: str) -> int:
    return execute_query(f"""
        INSERT INTO config.device (device_id, device_name) 
        VALUES ('{device_id}', '{name}') RETURNING id
""")

def list_devices():
    return [r for r in _query_all("SELECT id, device_id, device_name FROM config.device") if r is not None]

def add_device_token(device: int, token: str) -> int:
    return execute_query(f"""
        INSERT INTO auth.device_token (device, token)
        VALUES ('{device}', '{token}') RETURNING id
    """)

def remove_device_token(device: int, token: str) -> int:
    return execute_query(f"""
        DELETE FROM auth.device_token
        WHERE device = '{device}'
        AND token = '{token}'
        RETURNING id
    """)

def list_device_tokens(device: int) -> list[tuple[str, str]]:
    return _query_all(f"""
        SELECT id, token FROM auth.device_token
        WHERE device = '{device}'
    """)

def list_device_tokens_all() -> list[tuple[str, str, str]]:
    return _query_all(f""" SELECT id, device, token FROM auth.device_token """)

def list_sensors(device: int):
    return _query_all(f""" SELECT id, sensor_id, sensor_name FROM config.sensor WHERE device = '{device}' """)

def add_sensor(device: int, sensor_id: str, sensor_name: str) -> int:
    return execute_query(f"""
        INSERT INTO config.sensor (device, sensor_id, sensor_name)
        VALUES ('{device}', '{sensor_id}', '{sensor_name}') RETURNING id
    """)

def remove_sensor(device: int, sensor: int) -> int:
    return execute_query(f"""
        DELETE FROM config.sensor
        WHERE device = '{device}'
        AND id = '{sensor}'
        RETURNING id
    """)

def list_device_access(device: int):
    return _query_all(f" SELECT device_id, token, device, auth_device, auth_device_id FROM auth.device_login WHERE device = '{device}' ")

def list_device_access_token(device: int, token: str):
    return _query_all(f"""
        SELECT device_id, auth_device, auth_device_id 
        FROM auth.device_login 
        WHERE device = '{device}' AND token = '{token}'
    """)

def list_device_access_all():
    return _query_all(" SELECT device_id, token, device, auth_device, auth_device_id FROM auth.device_login ")

# takes the machine id
def add_device_access(device_login: str, token: str, device_access: str) -> int:
    return execute_query(f"""
        INSERT INTO auth.device_access (login_id, device)
        SELECT l.id, d2.id
            FROM config.device d, auth.device_token l, config.device d2
            WHERE d.device_id = '{device_login}'
            AND l.token = '{token}'
            AND d.id = l.device
            AND d2.device_id = '{device_access}'
        RETURNING id
    """)

# takes the db id
def add_device_access2(device_login: int, token: str, device_access: str) -> int:
    return execute_query(f"""
        INSERT INTO auth.device_access (login_id, device)
        SELECT l.id, d.id
            FROM auth.device_token l, config.device d
            WHERE l.token = '{token}'
            AND l.device = '{device_login}'
            AND d.device_id = '{device_access}'
        RETURNING id
    """)

def remove_device_access(access_id: int) -> int:
    return execute_query(f"""
        DELETE FROM auth.device_access
        WHERE id = '{access_id}'
        RETURNING id
    """)

def _seed_db():
    try:
        raise Exception("seeding db")
        with _get_cur() as cur:
            cur.execute("SELECT value FROM config.meta WHERE key = 'db.script-version'")
            r = cur.fetchone()
            db_ver = int(r[0]) if r is not None else 0
    except:
        db_ver = 0

    if db_ver == 0:
        print("Creating db...")
    else:
        print("Running migrations scripts ...")

    print(f"db version: {db_ver}")

    from pathlib import Path
    db_dir = Path(__file__).parent / "../db"

    files = sorted(
        (f for f in db_dir.iterdir() if f.is_file()),
        key=lambda f: int(f.name[:2])
    )

    for f in files:
        if int(f.name[:2]) < db_ver:
            continue

        print("Executing " + f.name)

        try:
            with _get_cur() as cur:
                cur.execute(f.read_text())
            print("Done")

        except Exception as e:
            print("Failed to run script: ")
            print(e)
            print("Please check manually")
            raise

    print("Finished.")

def _execute_sql_args():
    sql = sys.argv[1]
    try:
        with _get_cur() as cur:
            cur.execute(sql)

            row = cur.fetchone()
            if row is None:
                sys.exit(1)

            if len(sys.argv) == 3:
                col = int(sys.argv[2])
                if row[col] is None:
                    sys.exit(2)
                print(row[col])

        sys.exit(0)

    except Exception as e:
        print(e)
        sys.exit(2)

if __name__ == "__main__":
    # the argv[0] is the script
    if len(sys.argv) == 1:
        # If no args seed/update the db
        _seed_db()
    else:
        _execute_sql_args()
