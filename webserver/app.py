from flask import Flask
import os

import login

app = Flask(__name__, static_folder="../static")

app.secret_key = os.environ.get("SECRET_KEY")
app.config['session.permanent'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 60 * 60 * 24 * 7 # a week

login.load(app)

@app.route("/api/health")
def health():
    return "OK"

# vercel serves static files directly, but for testing this is needed to serve them
if not os.environ.get("VERCEL") == 1:
    @app.route("/")
    def index():
        return app.send_static_file("html/index.html")

    @app.route("/<path:path>")
    def static_proxy(path):
        print(path)
        if path.endswith(".html"):
            return app.send_static_file("html/" + path)
        return app.send_static_file(path)
