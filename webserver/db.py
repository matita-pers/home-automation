import os

from psycopg2 import pool as dbp
from psycopg2._psycopg import cursor

DB_URL = os.environ.get("DATABASE_URL")

try:
    db_pool = dbp.SimpleConnectionPool(1, 2, DB_URL)
except dbp.PoolError as e:
    print(f"Failed to create pool: {e}")
    db_pool = None

def _query(query: str) -> cursor:
    with db_pool.getconn() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            return cur

def get_device_id(device_name: str) -> int:
    c = _query(f"SELECT id FROM config.device WHERE device_id = '{device_name}'")
    return c.fetchone()[0]

def get_sensor_id(device_id: int, sensor_name: str) -> int:
    c = _query(
        f"SELECT id FROM config.sensor WHERE device = {device_id} AND sensor_id = '{sensor_name}'")
    return c.fetchone()[0]

def login_device(device_id: int, api_key: str) -> bool:
    c = _query(f"SELECT 1 FROM auth.device_token WHERE device = {device_id} AND key = '{api_key}'")
    return c.fetchone() is not None

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
