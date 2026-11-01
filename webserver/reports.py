from flask import Blueprint, Flask, Response
from flask import session, abort as use_handler

from typing import Any
import os
import time
import requests as req
from json import dumps as jsonify, loads as json_load

from .constants import issue_dir
from .db import get, store
from .login import require_login
from .utils import conditional_route, env_config, ascii_re, base_str_re, get_json_data, env_db_config

bp = Blueprint("reports", __name__, url_prefix="/api/report")
# TODO: add all the type to the /submit endpoint and create the fn to map yml -> json
# force disabled until above is resolved
_ENABLED = env_config("ENABLE_REPORTS") and False
croute = conditional_route(bp, _ENABLED)

_TOKEN_KEY = "cache.gh.token"
_EXPIRES_KEY = _TOKEN_KEY + ".expires"

_MIN_TITLE_LEN = int(os.environ.get("GITHUB_ISSUE_MIN_TITLE_LEN", "10"))

_REPO = os.environ.get("GITHUB_REPO", "")

def load(app: Flask) -> None:
    app.register_blueprint(bp)

@require_login
def list_templates():
    return [f.name for f in os.scandir(issue_dir) if f.is_file() and f.name.endswith(".json")]

@croute("/submit", methods=["POST"])
@require_login
def submit_issue():
    parsed = get_json_data("content", "template")
    if isinstance(parsed, Response):
        return parsed

    rdata: dict[str, Any]
    rdata, template_name = parsed

    valid = isinstance(template_name, str)

    if not base_str_re.match(template_name):
        valid = False
    if template_name.endswith(".yml") or template_name.endswith(".json"):
        valid = False

    if not valid:
        return jsonify({
            "success": False,
            "code": 400,
            "message": "Invalid template name"
        }), 400

    with open(template_name + ".json", "r") as f:
        template: dict[str, Any] = json_load(f.read())

    content: str = ""
    for el in template["body"]:
        empty = False
        if not el["name"] in rdata:
            if el["required"]:
                return jsonify({
                    "success": False,
                    "code": 400,
                    "message": "Missing required field"
                }), 400
            empty = True

        field = rdata[el["name"]]
        field_type = el["type"]

        match field_type:
            case "text", "textarea", "input":
                content += "### " + el["label"] + "\n\n"
                if empty:
                    content += "_No response_\n\n"
                else:
                    if not isinstance(field, str):
                        return jsonify({
                            "success": False,
                            "code": 400,
                            "message": "Invalid content"
                        }), 400

                    if len(field) > 10_000:
                        return jsonify({
                            "success": False,
                            "code": 413,
                            "message": "Content too long"
                        }), 413

                    if ascii_re.match(field) is None:
                        return jsonify({
                            "success": False,
                            "code": 400,
                            "message": "Invalid content"
                        }), 400

                    content += field + "\n\n"

    issue: dict[str, Any] = {
        "title": "" + template["title"],
        "body": content + f"\n\n---\n<sub>Opened by {session.get('username', '')} _({session.get('userid', '')})_</sub>",
    }

    for el in ("labels", "assignees", "type"):
        if el in template:
            issue[el] = template[el]

    #TODO: this should be possible to be read from the db
    labels = os.environ.get("GITHUB_ISSUE_LABELS", "")

    if env_db_config("GITHUB_ISSUE_LABELS_ENV_ONLY", ""):
        issue["labels"] = labels.split(", ") if len(labels) > 0 else []
    elif len(labels) > 1:
        if "labels" in template:
            issue["labels"] += labels.split(", ")
        else:
            issue["labels"] = labels.split(", ")

    headers = {
        "Accept": "application/vnd.github.html+json",
        "Authorization": f"Bearer {_get_token()}",
        "X-GitHub-Api-Version": "2026-03-10"
    }

    url = "https://api.github.com/repos/" + os.environ.get("GITHUB_OWNER", "") + "/" + _REPO + "/issues"
    resp = req.post(url, json=issue, headers=headers)

    if resp.status_code < 200 or resp.status_code >= 300:
        return jsonify({
            "success": False,
            "code": 502,
            "message": "GitHub API error",
            "source_code": resp.status_code,
            "source_message": resp.text
        }), 502

    return jsonify({
        "success": True,
        "message": "Issue submitted",
        "content": resp.json()["body_html"]
    }), 200

class _Token:
    token: str = ""
    expires: float = -1

__tk: _Token = _Token()
def _get_token():
    global __tk
    if len(__tk.token) > 0:
        if __tk.expires > time.time():
            return __tk.token
        __tk.token = "" # remove the token as it has expired

    __tk.token = get(_TOKEN_KEY)
    if __tk.token is not None:
        __tk.expires = float(get(_EXPIRES_KEY, 0))

    if __tk.expires < time.time() or __tk.token is None:
        secret_key = os.environ.get("GITHUB_APP_KEY", "")
        app_id = os.environ.get("GITHUB_APP_ID", "")

        if not secret_key or not app_id:
            use_handler(528)

        import jwt
        data = {
            "exp": int(time.time()) + (9 * 60),
            "iat": int(time.time()) - 30,
            "iss": app_id
        }
        jwt_token = jwt.encode(data, secret_key, algorithm="RS256")

        installation_id = os.environ.get("GITHUB_INSTALLATION_ID")

        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {jwt_token}",
            "X-GitHub-Api-Version": "2026-03-10"
        }
        body: dict = {
            "permissions": {
                "issues": "write"
            },
            "repositories": [_REPO]
        }

        resp = req.post(f"https://api.github.com/app/installations/{installation_id}/access_tokens", headers=headers, json=body)
        if 199 < resp.status_code < 300:
            data = resp.json()
            __tk.token = data["token"]

            from datetime import datetime as dt
            __tk.expires = dt.fromisoformat(data["expires_at"]).timestamp()
        else:
            use_handler(529)

        store(_TOKEN_KEY, __tk.token)
        store(_EXPIRES_KEY, str(__tk.expires))

    return __tk.token

@bp.route("/active")
def reports_enabled():
    return { "enabled": _ENABLED }
