from flask import Blueprint, Flask, Response
from flask import request

from webserver import login, db

bp = Blueprint("admin", __name__, url_prefix="/api/admin")

def load(app: Flask) -> None:
    app.register_blueprint(bp)

@bp.route("/register", methods=["POST"])
@login.require_admin
def register():
    if request.get_json() is None:
        return Response("{\"success\":false, \"code\":422,\"message\":\"missing username/password\"}", "422 Empty data")

    username = request.get_json()["username"]
    password = request.get_json()["password"]
    admin = request.get_json()["admin"]
    if username is None or username == "" or password is None or password == "":
        return Response("{\"success\":false, \"code\":422,\"message\":\"missing username/password\"}", "422 Registration failed")

    id = db.create_user(username, password, admin if admin is not None else False)
    if id < 0:
        return Response("{\"success\":false, \"code\":422,\"message\":\"duplicate prevented\"}","422 Registration failed")

    return {"success": "true", "id": id}

@bp.route("/devices")
@login.require_admin
def get_devices():
    return "[{\"info\":\"unimplemented\"}]"

@bp.route("/users")
@login.require_admin
def get_users():
    return [
        { "id": u.id, "username": u.username, "admin": u.admin }
        for u in db.list_users()
        ]

@bp.route("/user/<int:user>/rename", methods=["POST"])
@login.require_admin
def rename_user(user: int):
    if request.get_json() is None:
        return Response("{\"success\":false, \"code\":422,\"message\":\"missing username/password\"}", "422 Empty data")

    name = request.get_json()["new_name"]
    admin = request.get_json()["admin"]
    updated = db.update_user(user, name, admin)
    if updated < 0:
        return Response("{\"success\":false, \"code\":500,\"message\":\"unable to update\"}","500 Update failed")
    return {"success": "true"}
