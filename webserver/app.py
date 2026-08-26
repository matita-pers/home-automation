from flask import Flask
from pathlib import Path
import os, sys

import login, admin
from utils import send_404

# force this file dir into the module search path
sys.path.append(str(Path(__file__).resolve().parent))

app = Flask(__name__, static_folder="../static")

app.secret_key = os.environ.get("SECRET_KEY")
app.config['session.permanent'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 60 * 60 * 24 * 7 # a week

login.load(app)
admin.load(app)

@app.errorhandler(404)
def _page_not_found(e):
    send_404()

@app.route("/api/health")
def _health():
    return "{\"code\":200,\"status\":\"ok\"}", 200

@app.route("/")
def _get_homepage():
    return app.send_static_file("html/index.html")

@app.route("/site-urls")
@login.require_admin
def _get_site_urls():
    return [x.rule for x in app.url_map.iter_rules()]

def _serve_file(path):
    file = path.split("/")[-1]
    ext = file.split(".")[-1]
    if file == "":
        path = path.lstrip("/")
    if ext == "" or file.find(".") <= 0:
        ext = "html"
        path += ".html"

    try:
        if ext.lower() == "html":
            return app.send_static_file("html/" + path)
        return app.send_static_file(path)
    except:
        return send_404()

@app.route("/admin/<path:path>")
@login.require_admin
def _serve_static_admin_file(path):
    return _serve_file("admin/" + path)

@app.route("/users/<path:path>")
@login.require_login
def _serve_static_user_file(path):
    return _serve_file("users/" + path)

@app.route("/<path:path>")
def _serve_static_file(path: str):
    return _serve_file(path)
