#!/usr/bin/env python3
"""Write the Content-Security-Policy <meta> tag into every page.

GitHub Pages can't set response headers, so the policy is a <meta> tag in each
page's <head>. It allows only this site, the Supabase project named in
assets/js/config.js (REST, storage and realtime) and Google profile photos.
Google sign-in is a redirect through Supabase, so it needs no frame or script
allowance. A page's inline <script> (only 404.html has one) is allowed by its
hash, worked out here.

    python3 tools/set_csp.py

Run it again after changing supabaseUrl in config.js or editing an inline
script. It replaces the tag if it's already there.
"""
import base64
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

cfg = (ROOT / "assets/js/config.js").read_text()
m = re.search(r'supabaseUrl:\s*"https://([a-z0-9]+)\.supabase\.co"', cfg)
if not m:
    sys.exit("Couldn't find supabaseUrl in assets/js/config.js")
SB = f"https://{m.group(1)}.supabase.co"
WSS = f"wss://{m.group(1)}.supabase.co"


def policy(extra_script=""):
    return "; ".join([
        "default-src 'self'",
        f"script-src 'self' 'inline-speculation-rules'{extra_script}",
        "style-src 'self' 'unsafe-inline'",
        f"img-src 'self' data: blob: {SB} https://*.googleusercontent.com",
        "font-src 'self'",
        f"connect-src 'self' {SB} {WSS}",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'none'",
        "worker-src 'self'",
    ])


for page in sorted(ROOT.glob("*.html")):
    s = page.read_text()
    s = re.sub(r'\n  <meta http-equiv="Content-Security-Policy"[^>]*>', "", s)
    extra = "".join(
        f" 'sha256-{base64.b64encode(hashlib.sha256(body.encode('utf-8')).digest()).decode()}'"
        for body in re.findall(r"<script>(.*?)</script>", s, flags=re.S)
    )
    i = s.index('<meta charset="UTF-8"')
    j = s.index(">", i) + 1
    s = s[:j] + f'\n  <meta http-equiv="Content-Security-Policy" content="{policy(extra)}">' + s[j:]
    page.write_text(s)
    print(f"{page.name}: policy written{' (with an inline-script hash)' if extra else ''}")
