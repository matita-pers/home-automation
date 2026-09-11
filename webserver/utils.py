from flask import request, make_response, current_app as app
from flask import Response, send_from_directory
from typing import Any
from json import dumps as jsonify
import re, functools, os

username_re = re.compile(r"^[a-zA-Z0-9.\\$_-]{4, 16}$")
password_re = re.compile(r"^[a-zA-Z0-9.\\$!?@#&+:,;<>=àèéòçùì§\[\](){}€^_-]{6, 48}$")

_STATIC_DIR = os.path.join(os.path.dirname(str(__file__)), "../static")
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
