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
            "device": d[1],
            "sensor_id": d[3],
            "sensor_name": d[4],
            "timestamp": d[5],
            "measured_at": d[8],
            "sent_at": d[9],
            "key": d[6],
            "value": d[7]
        }
        for d in db.list_user_data(session["userid"])
    ]