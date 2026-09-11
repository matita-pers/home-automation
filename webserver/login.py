from flask import Flask, Response, Blueprint
from flask import request, session, redirect
from flask import abort as use_handler
from json import dumps as jsonify
import functools
import hashlib, os

from . import db, utils, models
from .utils import username_re, password_re

bp = Blueprint("auth", __name__, url_prefix="/api/auth")
default_alg = os.environ.get("algorithm", 'sha256')
pepper = os.environ.get("pepper", 'pepper123')

def load(app: Flask) -> None:
    app.register_blueprint(bp)

def require_login(f):
    @functools.wraps(f)
    def decorate(*args, **kwargs):
        if session.get("logged_in"):
            return f(*args, **kwargs)

        return redirect("/login?redirect_to=" + request.url)
    return decorate

def check_admin() -> None:
    """ If the session is not authenticated as admin throws an exception to serve the 404 page """
    if not (session.get("logged_in", False) and session.get("admin", False)):
        use_handler(404)

def require_admin(f):
    @functools.wraps(f)
    def decorate(*args, **kwargs):
        check_admin()
        return f(*args, **kwargs)
    return decorate

@bp.route('/session')
def get_session():
    if session.get("logged_in"):
        return {
            "success": True,
            "logged_in": True,
            "username": session['username'],
            "userid": session['userid'],
            "admin": session.get('admin', False)
        }
    return {"success": False, "logged_in": False}

def hash_password(password: str, salt: str, alg: str = default_alg) -> str:
    if alg == "plaintext":
        return password

    if alg == "scrypt":
        return hashlib.scrypt((pepper + password).encode(), salt=salt.encode(), n=4096, r=8, p=2, maxmem=65536).hex()

    return getattr(hashlib, alg)((pepper + password + salt).encode()).hexdigest()

_login_err = Response("{\"success\":false, \"code\":403,\"message\":\"wrong username/password\"}", "403 Login failed")
@bp.route('/login', methods=['POST'])
def login():
    if session.get("logged_in"):
        return jsonify({
            "success": False,
            "code": 422,
            "message": "already logged in"
        }), 422

    parsed = utils.get_json_data("username", "password")
    if isinstance(parsed, Response):
        return parsed

    username, password = parsed
    if username == "" or password == "":
        return _login_err

    if username_re.match(username) is None:
        return _login_err

    user = db.get_user_info(username)
    if user is None or user.uid < 0:
        # sending "username/password" instead of only "username" to block attempts to guess usernames
        return _login_err

    password_hash = hash_password(password, user.salt, user.algorithm)
    if not user.password_hash == password_hash:
        return _login_err

    session["logged_in"] = True
    session["userid"] = user.uid
    session["username"] = user.username
    session["admin"] = user.admin
    return Response("{\"success\":true, \"code\":200,\"message\":\"login successful\"}", "200 Login successful")

@bp.route('/change-password', methods=['POST'])
@require_login
def change_password():
    parsed = utils.get_json_data("password", "currentPassword")
    if isinstance(parsed, Response):
        return parsed

    password, previous = parsed
    if password == "":
        return jsonify({
            "success": False,
            "code": 422,
            "message": "missing password"
        }), 422

    if password_re.match(password) is None:
        return jsonify({
            "success": False,
            "code": 422,
            "message": "invalid password"
        }),  422

    user = models.User(session["userid"], session["username"], "", "", default_alg, session["admin"])
    user.salt = os.urandom(16).hex()
    user.password_hash = hash_password(password, user.salt, user.algorithm)

    status = db.change_password(user)
    if status < 0:
        return jsonify({
            "success": False,
            "code": 500,
            "message": "internal error",
            "error_code": -status
        }), 500

    return {"success": "true", "message": "Password changed successfully"}

@bp.route('/logout', methods=['POST'])
def logout():
    session["logged_in"] = False
    session["admin"] = False
    return jsonify({
        "success": True,
        "code": 200,
        "message": "logout successful"
    }),200
