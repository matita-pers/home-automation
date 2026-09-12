from flask import Flask, session, request
from flask import abort as use_handler
from werkzeug.exceptions import HTTPException
import os

from . import login, admin, device, device_admin
from .utils import send_404, cache, cache_public, send_static_file

version = "1.0.0-alfa-pre-3"
app = Flask(__name__, static_folder=None)

app.secret_key = os.environ.get("SECRET_KEY")
app.config['session.permanent'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 60 * 60 * 24 * 7 # a week
app.config['SESSION_COOKIE_NAME'] = 'session'
# load FLASK_* config from environment variables
app.config.from_prefixed_env()

app.config['VERSION'] = version

for module in (login, admin, device, device_admin):
    module.load(app)

@app.errorhandler(405)
@app.errorhandler(404)
def _page_not_found(e: HTTPException):
    return send_404(e.code if e.code is not None else 579)

# TODO: remove before committing
@app.route("/render")
@login.require_admin
def render_data():
    return send_static_file(".hidden/index.html")

@app.route("/data.json")
@login.require_admin
def data_json():
    return send_static_file(".hidden/data.json")

def _serve_file(path: str, url_type: str = ""):
    if path == "render":
        return send_static_file("../.hidden/index.html")

    file = path.split("/")[-1]
    ext = file.split(".")[-1]
    if file == "":
        path = path.lstrip("/")
    if ext == "" or file.find(".") <= 0:
        ext = "html"
        path += ".html"

    if ext.lower() == "html":
        path = "html/" + path

    if len(path.split("/", 2)) == 1:
        try:
            return send_static_file(path)
        except:
            use_handler(404)

    if path.split("/", 2)[1] in ["admin", "users"]:
        # invalid access to file
        use_handler(404)

    if url_type != "":
        url_type += "/"
    path = path.split("/", 1)[0] + "/" + url_type + path.split("/", 1)[1]

    try:
        return send_static_file(path)
    except:
        use_handler(404)

@app.route("/api/health")
def _health():
    return "{\"code\":200,\"status\":\"ok\"}", 200

@app.route("/api/version")
@cache_public
def _version():
    return version

@app.route("/")
@cache_public
def _get_homepage():
    return send_static_file("html/index.html")

@app.route("/site-urls")
@login.require_admin
@cache
def _get_site_urls():
    return [x.rule for x in app.url_map.iter_rules()]

def tree(path: str, d=0):
    if d >= 5:
        return []

    result = []
    try:
        for name in sorted(os.listdir(path)):
            full_path = os.path.join(path, name)

            if os.path.isdir(full_path):
                result.append({
                    "name": name,
                    "type": "directory",
                    "children": tree(full_path, d=d+1)
                })
            else:
                result.append({"name": name,"type": "file"})
    except:
        pass

    return result

@app.route("/p/i/map/pwd")
@login.require_admin
def __get_file_tree_cwd():
    return tree("static")

@app.route("/p/i/map/r")
@login.require_admin
def __get_file_tree_r():
    return tree("/")

@app.route("/p/i/map/p/<path:path>")
@login.require_admin
def __get_file_tree_pers(path: str):
    return tree("/" + path)

@app.route("/p/i/r/<path:path>")
@login.require_admin
def __serve_file_(path: str):
    from flask import send_from_directory
    return send_from_directory("/", path)

@app.route("/admin/<path:path>")
@login.require_admin
@cache
def _serve_static_admin_file(path: str):
    return _serve_file(path, url_type="admin")

@app.route("/users/<path:path>")
@login.require_login
@cache
def _serve_static_user_file(path: str):
    return _serve_file(path, url_type="users")

@app.route("/<path:path>")
@cache_public
def _serve_static_file(path: str):
    return _serve_file(path)
