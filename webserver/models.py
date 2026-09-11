# to postpone type checking
from __future__ import annotations
from dataclasses import dataclass

@dataclass
class User:
    uid: int
    username: str
    password_hash: str
    salt: str
    algorithm: str
    admin: bool

class ReceivedData:
    device_time: int
    received_time: str
    data: list[SensorData]
    def __init__(self, device_time: int, received_time: str):
        self.device_time = device_time
        self.received_time = received_time
        self.data = []

    @staticmethod
    def import_data(data: str) -> ReceivedData:

        return None

class SensorData:
    sensor_id: int
    data: dict[str, int]
    device_time: int
    def __init__(self, sensor_id: int, device_time: int):
        self.sensor_id = sensor_id
        self.data = {}
        self.device_time = device_time

    @staticmethod
    def import_data(data: str) -> SensorData:
        return None
