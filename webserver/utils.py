from flask import request, make_response, current_app as app
from flask import Response, send_from_directory
from typing import Any
from json import dumps as jsonify
import re, functools, os

from . import db
from .constants import static_dir

username_re = re.compile(r"^[a-zA-Z0-9.\\$_-]{4,16}$")
password_re = re.compile(r"^[a-zA-Z0-9.\\$!?@#&+:,;<>=àèéòçùì§\[\](){}€^_-]{6,48}$")
base_str_re = re.compile(r"^[a-zA-Z0-9.-_ ]+$")
#                         \t   \n  \r  ' '  ~
ascii_re = re.compile(r"^[\x09\x0A\x0D\x20-\x7E]+$")

_STATIC_DIR = static_dir
def send_static_file(path: str):
    return send_from_directory(_STATIC_DIR, path)

def send_404(code: int = 404):
    if request.path.startswith("/api"):
        return { "success": False, "code": code, "message": "not found" }, code
    return send_static_file("html/404.html"), code

def cache(f, private = True):
    @functools.wraps(f)
    def decorate(*args, **kwargs):
        response = make_response(f(*args, **kwargs))
        if 200 <= response.status_code < 300:
            response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
            if private:
                response.headers["Vary"] = "Cookie"
        return response
    return decorate

def cache_public(f):
    return cache(f, private=False)

def get_json_data(*fields: str) -> tuple[Any, ...] | Response:
    json = request.get_json(silent=True, cache=True)
    if not json:
        return make_response(
            jsonify({
                "success": False,
                "code":422,
                "message": "invalid json/empty"
            }), "422 Empty data")

    for field in fields:
        if not json.get(field, None) and json.get(field, None) != False:
            return make_response(
                jsonify({
                    "success": False, "code": 422,
                    "message": "Missing a required field" + (": " + field if app.debug else "")
                }), "422 Missing data")

    return tuple(json.get(f) for f in fields)

def is_true(value: str) -> bool:
    """
    Helper function to determine if a string value is truthy.
    :param value: The value to check.
    :return: True if the value is "true" or "1", False otherwise.
    """
    return value == "true" or value == "1"

def env_config(key: str) -> bool:
    """
    Returns True if the environment variable is set to "true", False otherwise.

    :param key: The name of the environment variable to check.
    :return: True if the environment variable is set to "true" or 1, False otherwise.
    """
    return is_true(os.environ.get(key, "false"))

def env_db_config(key: str, db_key: str) -> bool:
    """
    Returns True if the env var is set to "true" or "1".
    Otherwise, the `config.meta` db table will be checked with the db_key
        if `<key>_DB` is set to "true" or "1".

    :param key: The name of the environment variable to check.
    :param db_key: The name of the db key to check when the env var is false.
    :return: True if the environment variable is set to "true" or "1", False otherwise.
    """
    if env_config(key):
        return True

    if env_config("DISABLE_DB_CONFIG"):
        return False

    if not env_config(key + "_DB"):
        return False

    return is_true(db.get(db_key))

def conditional_route(bp, enabled: bool):
    def route(*args, **kwargs):
        def decorator(fn):
            if enabled:
                return bp.route(*args, **kwargs)(fn)
            return fn
        return decorator
    return route
