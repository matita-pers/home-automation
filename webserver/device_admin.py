from flask import Blueprint, Flask, Response
from json import dumps as jsonify

from . import login, db, utils

bp = Blueprint("device_global_admin", __name__, url_prefix="/api/admin/devices")
device_bp = Blueprint("device_admin", __name__, url_prefix="/api/admin/device/<int:device>")

def load(app: Flask) -> None:
    app.register_blueprint(bp)
    app.register_blueprint(device_bp)

# TODO: create a decorator that checks either global admin or device admin
#  (latter should be saved as an array into session)
#  ((then there should be a simple(max 1 query if really needed) way to invalidate sessions/revalidate,
#  as currently if someone loses admin the endpoints will keep working until the session expires
#  (maybe add updated_at?)))
# this is basically duct-tape until the spare part arrives
# note that endpoints that require to be global admin are already properly decorated
bp.before_request(login.check_admin)
# are all endpoints accessible to device admin here?
# should the ones working on auth.device_access require the user to be admin in both
#  or be accessible only to site admins as the list is not accessible to non-global admins?
device_bp.before_request(login.check_admin)

@bp.route("/add", methods=["PUT"])
@login.require_admin
def add_device():
    parsed = utils.get_json_data(" ", "name")
    if isinstance(parsed, Response):
        return parsed

    device_id, name = parsed
    did = db.add_device(device_id, name)
    if did < 0:
        return jsonify({
            "success": False,
            "code": 409,
            "message": "unable to register device",
            "error_code": -did
        }), 409

    return {"success": "true", "id": did}

@bp.route("/list")
@login.require_admin
def get_devices():
    return [
        { "id": d[0], "device_id": d[1], "device_name": d[2] }
        for d in db.list_devices()
    ]

@device_bp.route("/tokens")
def get_device_tokens(device: int):
    return [
        { "id": d[0], "token": d[1] }
        for d in db.list_device_tokens(device)
    ]

@bp.route("/tokens")
@login.require_admin
def get_device_tokens_all():
    return [
        { "id": d[0], "device": d[1], "token": d[2] }
        for d in db.list_device_tokens_all()
    ]

@device_bp.route("/token/add", methods=["PUT"])
def add_device_tokens(device: int):
    parsed = utils.get_json_data("token")
    if isinstance(parsed, Response):
        return parsed
    # jk, this feels dumb...
    token, = parsed

    res = db.add_device_token(device, token)
    if res < 0:
        return jsonify({
            "success": False,
            "code": 409,
            "message": "unable to add token",
            "error_code": -res
        }), 409

    return {"success": True}

@device_bp.route("/token/revoke", methods=["PUT"])
def revoke_device_tokens(device: int):
    parsed = utils.get_json_data("token")
    if isinstance(parsed, Response):
        return parsed
    # jk, this feels dumb...
    token, = parsed

    res = db.remove_device_token(device, token)
    if res < 0:
        return jsonify({
            "success": False,
            "code": 409,
            "message": "unable to revoke token",
            "error_code": -res
        }), 409

    return { "success": True }

@device_bp.route("/sensors/list")
def get_sensors(device: int):
    return [
        { "id": s[0], "sensor_id": s[1], "sensor_name": s[2] }
        for s in db.list_sensors(device)
    ]

@device_bp.route("/sensors/add", methods=["PUT"])
def add_sensors(device: int):
    parsed = utils.get_json_data("sensor_id", "name")
    if isinstance(parsed, Response):
        return parsed

    sensor_id, name = parsed

    sid = db.add_sensor(device, sensor_id, name)
    if sid < 0:
        return jsonify({
            "success": False,
            "code": 409,
            "message": "unable to add sensor",
            "error_code": -sid
        }), 409

    return {"success": "true", "id": sid}

@device_bp.route("/sensor/<int:sensor>/remove", methods=["PUT"])
def remove_sensor(device: int, sensor: int):

    res = db.remove_sensor(device, sensor)
    if res < 0:
        return jsonify({
            "success": False,
            "code": 409,
            "message": "unable to remove sensor",
            "error_code": -res
        }), 409

    return {"success": True}

@bp.route("/access")
def get_device_access_all():
    return [
        { "device_id": a[0], "token": a[1], "device": a[2], "auth_device": a[3], "auth_device_id": a[4] }
        for a in db.list_device_access_all() if a is not None
    ]

@device_bp.route("/access")
def get_device_access(device: int):
    return [
        {"device_id": a[0], "token": a[1], "device": a[2], "auth_device": a[3], "auth_device_id": a[4]}
        for a in db.list_device_access(device) if a is not None
    ]

@bp.route("/access/add", methods=["PUT"])
@login.require_admin
def add_device_access():
    parsed = utils.get_json_data("device_login", "token", "device_access")
    if isinstance(parsed, Response):
        return parsed

    login_device, token, to_add = parsed
    aid = db.add_device_access(login_device, token, to_add)
    if aid < 0:
        return jsonify({
            "success": False,
            "code": 409,
            "message": "unable to add device access",
            "error_code": -aid
        }), 409

    return {"success": "true", "id": aid}

@device_bp.route("/access/add", methods=["PUT"])
@login.require_admin
def add_device_access(device: int):
    parsed = utils.get_json_data("token", "device_id")
    if isinstance(parsed, Response):
        return parsed

    token, to_add = parsed
    aid = db.add_device_access2(device, token, to_add)
    if aid < 0:
        return jsonify({
            "success": False,
            "code": 409,
            "message": "unable to add device access",
            "error_code": -aid
        }), 409

    return {"success": "true", "id": aid}
