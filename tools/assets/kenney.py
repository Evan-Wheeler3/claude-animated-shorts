#!/usr/bin/env python3
"""Download a Kenney (kenney.nl, CC0) asset pack zip without a browser.

Usage: python3 tools/assets/kenney.py <slug-or-url> [out_dir]      e.g.  car-kit   or   https://kenney.nl/assets/city-kit-roads
The site's "Continue without donating" button asks https://kenney.nl/download-link/<hex("assets/<slug>")> for a fresh
signed URL; this does the same (with the page's cookies) and saves <out_dir>/kenney-<slug>.zip (default assets/inbox).
Then ingest as usual (Claude: unzip -> tools/assets/ingest.py), or let send-inbox.command push it from the Mac.
Please consider donating to Kenney: https://kenney.nl/donate
"""
import http.cookiejar, json, os, sys, urllib.request

slug = sys.argv[1].rstrip('/').split('/')[-1]
out = sys.argv[2] if len(sys.argv) > 2 else 'assets/inbox'
page = f'https://kenney.nl/assets/{slug}'
cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
op.addheaders = [('User-Agent', 'Mozilla/5.0'), ('Referer', page)]
op.open(page, timeout=30).read()
link = json.loads(op.open(f'https://kenney.nl/download-link/{f"assets/{slug}".encode().hex()}', timeout=30).read())['url']
os.makedirs(out, exist_ok=True); dst = os.path.join(out, f'kenney-{slug}.zip')
with op.open(link, timeout=600) as r, open(dst, 'wb') as f: f.write(r.read())
if open(dst, 'rb').read(2) != b'PK': os.remove(dst); sys.exit(f'{slug}: not a zip (pack name wrong, or the site changed)')
print(dst, f'{os.path.getsize(dst) / 1e6:.1f} MB')
