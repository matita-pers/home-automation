# This file contains the endpoints for communicating with the microcontroller devices.
# Some retro-compatibility should be kept between latest and the last 1-3 stable versions
from flask import Blueprint, Flask, request
from flask import g as g_ctx, abort as use_handler
import functools

from . import db, models

bp = Blueprint("device_communication", __name__, url_prefix="/internal")

def load(app: Flask) -> None:
    app.register_blueprint(bp)

def login(f):
    @functools.wraps(f)
    def decorate(*args, **kwargs):
        # format: Basic: <device_id> <token>
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Basic: "):
            return use_handler(404)

        parts = auth.split(" ")
        if len(parts) != 3:
            return use_handler(404)

        if parts[0] != "Basic:" or len(parts[1]) < 2 or len(parts[2]) < 2:
            return use_handler(404)

        g_ctx.authorized_devices = db.login_device(parts[1], parts[2])

        print("logged in device: ")
        print(auth)
        print(g_ctx.authorized_devices)

        if len(g_ctx.authorized_devices) == 0:
            return use_handler(404)
        return f(*args, **kwargs)
    return decorate

@bp.route("/device/<int:device>/bulk", methods=["POST"])
@login
def a(device: int):
    print(f"received a request for device {device}")
    return ""
