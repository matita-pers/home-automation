from flask import Blueprint, Flask, session

from . import db, login

bp = Blueprint("user", __name__, url_prefix="/api/user")

def load(app: Flask) -> None:
    app.register_blueprint(bp)

@bp.route("/data/all")
@login.require_login
def get_all_sensor_data():
    return [
        {
            "device": d[2],
            "device_id": d[3],
            "sensor_id": d[5],
            "sensor_name": d[6],
            "timestamp": d[7],
            "measured_at": d[10],
            "sent_at": d[11],
            "key": d[8],
            "value": d[9]
        }
        for d in db.list_user_data(session["userid"])
    ]