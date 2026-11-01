import os.path as p

version = "1.0.0-alfa-pre-5"
root_dir = p.join(p.dirname(p.abspath(__file__)), "..")
static_dir = p.join(root_dir, "static")
issue_dir = p.join(root_dir, "generated", "issues")
