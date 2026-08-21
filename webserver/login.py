from flask import Flask, Response, Blueprint
from flask import request, session
from flask import redirect, url_for, jsonify
import db
import functools

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def load(app: Flask) -> None:
    app.register_blueprint(bp)

def require_login(f):
    @functools.wraps(f)
    def decorate(*args, **kwargs):
        if session.get("logged_in"):
            return f(*args, **kwargs)

        return redirect(url_for("login", redirect_to=request.url))
    return decorate

def require_admin(f):
    @functools.wraps(f)
    def decorate(*args, **kwargs):
        if session.get("logged_in") and session.get("admin"):
            return f(*args, **kwargs)

        # noinspection PyBroadException
        try:
            return bp.send_static_file("404.html"), 404
        except:
            return "{\"code\":404,\"message\":\"Not found\"}", 404
    return decorate

@bp.route('/session')
def get_session():
    if session.get("logged_in"):
        return jsonify({
            "success": True,
            "username": session['username'],
            "id": session['userid'],
            "is_admin": session.get('admin', False)
        })
    return jsonify({"success": False})

@bp.route('/login', methods=['POST'])
def login():
    if session.get("logged_in"):
        return Response("{\"success\":false, \"code\":441,\"message\":\"already logged in\"}", "441 Already logged in")

    if request.get_json() is None:
        return Response("{\"success\":false, \"code\":422,\"message\":\"missing username/password\"}", "422 Empty data")

    username = request.get_json()["username"]
    password = request.get_json()["password"]
    if username is None or username == "" or password is None or password == "":
        return Response("{\"success\":false, \"code\":403,\"message\":\"missing username/password\"}", "403 Login failed")

    user = db.get_user_info(username)
    if user is None or user.id < 0:
        # sending "username/password" instead of only "username" to block attempts to guess usernames
        return Response("{\"success\":false, \"code\":403,\"message\":\"wrong username/password\"}", "403 Login failed")

    # TODO: store hashed passwords
    if not user.password == password:
        print(f"user {user.username} ({user.id}) failed login: {password} != {user.password}")
        return Response("{\"success\":false, \"code\":403,\"message\":\"wrong username/password\"}", "403 Login failed")

    session["logged_in"] = True
    session["userid"] = user.id
    session["username"] = user.username
    session["admin"] = user.admin
    return Response("{\"success\":true, \"code\":200,\"message\":\"login successful\"}", "200 Login successful")

@bp.route('/change-password', methods=['POST'])
@require_login
def change_password():
    if request.get_json() is None:
        return Response("{\"success\":false, \"code\":422,\"message\":\"missing password\"}", "422 Empty data")

    password = request.get_json()["password"]
    if password is None or password == "":
        return Response("{\"success\":false, \"code\":422,\"message\":\"missing password\"}", "422 Empty data")

    status = db.change_password(session["userid"], password)
    if status < 0:
        return Response("{\"success\":false, \"code\":500,\"message\":\"internal error\"}", "500 Internal error")
    return {"success": "true"}

@bp.route('/logout', methods=['POST'])
def logout():
    session["logged_in"] = False
    session["admin"] = False
    return Response("{\"success\":true, \"code\":200,\"message\":\"logout successful\"}", "200 Logout successful")
