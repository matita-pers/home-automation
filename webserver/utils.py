from flask import request, current_app as app, make_response

import re, functools

username_re = re.compile(r"^[a-zA-Z0-9.\\$_-]{4,16}$")

def send_404():
    print("404: " + request.path)
    print(request.url_rule)
    if request.path.startswith("/api/"):
        return {"code": 404, "status": "not found", "message": "not found"}, 404
    return app.send_static_file("html/404.html"), 404

def cache(f, private=True):
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
