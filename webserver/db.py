import os
from typing import Any

from psycopg2 import pool as dbp
from models import User

DB_URL = os.environ.get("DATABASE_URL")

if DB_URL is None or DB_URL == "":
    raise Exception("DATABASE_URL is not set")

try:
    db_pool = dbp.SimpleConnectionPool(1, 2, DB_URL)
except Exception as e:
    print(f"Failed to create pool ({type(e)}): {e}")
    db_pool = None

conn = db_pool.getconn()
def _query(query: str) -> tuple[Any, ...] | None:
    #with db_pool.getconn() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            return cur.fetchone()

def get_user_info(username: str) -> User | None:
    r = _query(f"SELECT id, password_hash, admin FROM auth.users WHERE username = '{username}'")
    if r is None:
        return None
    return User(r[0], username, r[1], r[2])

def get_device_id(device_name: str) -> int:
    r = _query(f"SELECT id FROM config.device WHERE device_id = '{device_name}'")
    return r[0] if r is not None else -1

def get_sensor_id(device_id: int, sensor_name: str) -> int:
    r = _query(f"SELECT id FROM config.sensor WHERE device = {device_id} AND sensor_id = '{sensor_name}'")
    return r[0] if r is not None else -1

def get_user_password(user: int) -> str:
    r = _query(f"SELECT password_hash FROM auth.users WHERE id = '{user}'")
    return r[0] if r is not None else -1

def login_device(device_id: int, api_key: str) -> bool:
    r = _query(f"SELECT 1 FROM auth.device_token WHERE device = {device_id} AND key = '{api_key}'")
    return r is not None

# temporary data structure
class Data:
    device_id: int
    sensor_id: int
    metric_key: str
    metric_value: float
    measured_at: int
    sent_at: int

# input should be validated when creating the object instance
# make a fn that gets an array of data to run a single query with multiple inserts
def _get_upload_query_data(data: Data) -> str:
    return f"""
    INSERT INTO data.sensor (device, sensor, metric_key, metric_value, measured_at, sent_at) 
    VALUES (
       '{data.device_id}',
       '{data.sensor_id}',
       '{data.metric_key}',
       '{data.metric_value}',
       '{data.measured_at}',
       '{data.sent_at}'
       );
    """
