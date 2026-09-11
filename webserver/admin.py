from flask import Blueprint, Flask, Response
from flask import request

from json import dumps as jsonify

from . import login, db, utils, models

bp = Blueprint("admin", __name__, url_prefix="/api/admin")

def load(app: Flask) -> None:
    app.register_blueprint(bp)

bp.before_request(login.check_admin)

@bp.route("/users/register", methods=["PUT"])
def register_user():
    parsed = utils.get_json_data("username", "password")
    if isinstance(parsed, Response):
        return parsed

    username, password = parsed
    admin = request.get_json().get("admin", None)

    if utils.username_re.match(username) is None:
        return jsonify({
            "success": False,
            "code": 422,
            "message": "invalid username"
        }), 422

    if utils.password_re.match(password) is None:
        return jsonify({
            "success": False,
            "code": 422,
            "message": "invalid password"
        }), 422

    user = models.User(-1, username, password, "", "plaintext", admin if admin is not None else False)
    uid = db.create_user(user)
    if uid < 0:
        return jsonify({
            "success": False,
            "code": 409,
            "message": "unable to register user",
            "error_code": -uid
        }), 409

    return {"success": "true", "id": uid}

@bp.route("/users")
def get_users():
    return [
        { "id": u.uid, "username": u.username, "admin": u.admin }
        for u in db.list_users()
        ]

@bp.route("/user/<int:user>/rename", methods=["POST"])
def rename_user(user: int):
    parsed = utils.get_json_data("new_name", "admin")
    if isinstance(parsed, Response):
        return parsed

    name, admin = parsed
    updated = db.update_user(user, name, admin)
    if updated < 0:
        return jsonify({
            "success": False,
            "code": 500,
            "message": "unable to rename user",
            "error_code": -updated
        }), 500
    return {"success": True}
