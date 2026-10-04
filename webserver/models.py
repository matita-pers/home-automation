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

@dataclass(init=False)
class ReceivedData:
    device_time: int
    data: list[SensorData]

    def __init__(self, data: str):
        self.data = []

        cur_sensors: dict[str, int] = {}
        cur_meta: dict[str, int] = {}
        cstr = ""
        key = ""
        level = 0

        for idx, c in enumerate(data):
            if c == '<':
                level += 1
                continue
            if c == '>':
                if cstr:
                    if level == 3: # End of sensors group
                        cur_sensors[key] = int(cstr)
                    elif level == 2: # End of data group
                        if key == "t":
                            cur_meta[key] = int(cstr)
                        else:
                            # keep non-time meta (e.g., 's') as string
                            cur_meta[key] = cstr
                
                if level == 2: # End of data group
                    time = cur_meta.get("t")
                    sensor_id = cur_meta.get("s")
                    if time is not None and sensor_id is not None:
                        self.data.append(SensorData(sensor_id, cur_sensors, time))
                    
                    cur_sensors = {}
                    cur_meta = {}
                    key = ""
                    cstr = ""
                elif level == 1: # End of message
                    if key == "t":
                        self.device_time = int(cstr)
                
                level -= 1
                key = ""
                cstr = ""
                continue
            
            if c == ':':
                key = cstr
                cstr = ""
                continue
            if c == ';':
                if cstr:
                    if level == 3:
                        cur_sensors[key] = int(cstr)
                    elif level == 2:
                        if key == "t":
                            cur_meta[key] = int(cstr)
                        else:
                            cur_meta[key] = cstr
                key = ""
                cstr = ""
                continue
            
            cstr += c

@dataclass(init=False)
class SensorData:
    sensor_id: str
    data: dict[str, int]
    device_time: int

    def __init__(self, sensor_id: str, data: dict[str, int], device_time: int):
        self.sensor_id = sensor_id
        self.data = data
        self.device_time = device_time
