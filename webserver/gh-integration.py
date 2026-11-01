import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from flask import Blueprint, jsonify, request
import jwt  # PyJWT
import yaml  # PyYAML

from .db import load, store

# Directory configurations
BASE_DIR = Path(__file__).resolve().parent
PUBLIC_TEMPLATES_DIR = BASE_DIR / "public" / "issue_templates"

# Environment variables
GITHUB_APP_ID = os.getenv("GITHUB_APP_ID", "123456")
GITHUB_INSTALLATION_ID = os.getenv("GITHUB_INSTALLATION_ID", "7891011")
GITHUB_PRIVATE_KEY = os.getenv("GITHUB_PRIVATE_KEY", "").replace("\\n", "\n")
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "your-org")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "your-repo")

issues_bp = Blueprint("issues", __name__, url_prefix="/api/issues")

def _http_request(url: str, method: str = "GET", data: dict = None, headers: dict = None) -> dict:
    if headers is None:
        headers = {}

    headers.setdefault("User-Agent", "Flask-GitHub-App-Client")
    headers.setdefault("Accept", "application/vnd.github+json")

    encoded_data = json.dumps(data).encode("utf-8") if data else None
    if encoded_data:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        raise RuntimeError(f"GitHub API Error {e.code}: {err_msg}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Network Error: {e.reason}")

def get_app_jwt() -> str:
    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + (10 * 60),
        "iss": GITHUB_APP_ID,
    }
    return jwt.encode(payload, GITHUB_PRIVATE_KEY, algorithm="RS256")

def get_installation_access_token() -> str:
    cached_token = load("gh_installation_token")
    expires_at = load("gh_token_expires_at", 0)

    if cached_token and time.time() < (expires_at - 60):
        return cached_token

    app_jwt = get_app_jwt()
    url = f"https://api.github.com/app/installations/{GITHUB_INSTALLATION_ID}/access_tokens"
    headers = {"Authorization": f"Bearer {app_jwt}"}

    response = _http_request(url, method="POST", headers=headers)
    token = response["token"]

    store("gh_installation_token", token)
    store("gh_token_expires_at", time.time() + 3500)

    return token

def github_api_call(endpoint: str, method: str = "GET", data: dict = None) -> dict:
    token = get_installation_access_token()
    url = f"https://api.github.com{endpoint}"
    headers = {"Authorization": f"Bearer {token}"}
    return _http_request(url, method=method, data=data, headers=headers)

@issues_bp.route("/templates", methods=["GET"])
def list_templates():
    """Lists available local JSON template files in ./public/issue_templates/."""
    if not PUBLIC_TEMPLATES_DIR.exists():
        return jsonify({"templates": []}), 200

    templates = [
        f.name for f in PUBLIC_TEMPLATES_DIR.glob("*.json") if f.is_file()
    ]
    return jsonify({"templates": templates}), 200

@issues_bp.route("/templates/<filename>", methods=["GET"])
def get_template(filename: str):
    """Serves a compiled issue template JSON file."""
    if not filename.endswith(".json"):
        filename += ".json"

    file_path = PUBLIC_TEMPLATES_DIR / filename

    # Prevent directory traversal attacks
    if not file_path.resolve().is_relative_to(PUBLIC_TEMPLATES_DIR.resolve()):
        return jsonify({"error": "Invalid file path"}), 400

    if not file_path.exists():
        return jsonify({"error": "Template not found"}), 404

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data), 200
    except Exception as err:
        return jsonify({"error": str(err)}), 500

@issues_bp.route("", methods=["POST"])
def submit_issue():
    """Creates a GitHub issue with title, body, and template labels."""
    try:
        payload = request.get_json() or {}
        title = payload.get("title")
        body = payload.get("body")
        labels = payload.get("labels", [])  # Handles array of label strings

        if not title or not body:
            return jsonify({"error": "Fields 'title' and 'body' are required"}), 400

        issue_payload = {
            "title": title,
            "body": body,
            "labels": labels
        }

        endpoint = f"/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/issues"
        created_issue = github_api_call(endpoint, method="POST", data=issue_payload)

        return jsonify({
            "id": created_issue.get("id"),
            "number": created_issue.get("number"),
            "html_url": created_issue.get("html_url"),
            "state": created_issue.get("state")
        }), 201
    except Exception as err:
        return jsonify({"error": str(err)}), 500

def compile_yaml_to_json(yaml_path: str):
    """Reads YAML issue form, converts it to JSON, and stores it in ./public/issue_templates/."""
    src = Path(yaml_path)
    if not src.exists():
        print(f"Error: File {yaml_path} does not exist.", file=sys.stderr)
        return

    try:
        with open(src, "r", encoding="utf-8") as f:
            parsed = yaml.safe_load(f)

        PUBLIC_TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
        dest_filename = f"{src.stem}.json"
        dest_path = PUBLIC_TEMPLATES_DIR / dest_filename

        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(parsed, f, indent=2)

        print(f"Successfully compiled {src.name} -> {dest_path}")
    except Exception as e:
        print(f"Failed to compile {yaml_path}: {e}", file=sys.stderr)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            compile_yaml_to_json(arg)
    else:
        print("Usage: python issues_bp.py <path/to/template.yml>")
