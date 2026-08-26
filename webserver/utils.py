from flask import request, current_app as app

import re

username_re = re.compile(r"^[a-zA-Z0-9.\\$_-]{4,16}$")

def send_404():
    print("404: " + request.path)
    print(request.url_rule)
    if request.path.startswith("/api/"):
        return {"code": 404, "status": "not found", "message": "not found"}, 404
    return app.send_static_file("html/404.html"), 404
