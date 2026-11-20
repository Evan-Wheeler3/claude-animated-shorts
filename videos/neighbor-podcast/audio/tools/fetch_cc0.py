"""Fetch the CC0 Freesound clips used in the temp mix and log provenance.

Downloads each sound's public HQ preview (Freesound's originals need a logged-in account), and refuses any page that
does not link the CC0 1.0 deed. Writes audio/sfx/cc0/<id>_<slug>.mp3 and audio/sfx/cc0/SOURCES.json.
usage: python fetch_cc0.py <episode_dir>
"""
import sys, os, re, json, urllib.request, html

ep = sys.argv[1]
out = os.path.join(ep, "audio", "sfx", "cc0")
os.makedirs(out, exist_ok=True)
CLIPS = [
    ("ShangusBurger", 763830, "cheer", "Owner-specified crowd cheer for the 0:17 baby stand"),
    ("upkey", 826326, "forest", "Cabin and trail-cam forest bed"),
    ("HOGGanimation", 612693, "chair_creak", "Folding chair loading creaks (porch sink, bear sit)"),
    ("jedg", 505831, "footsteps", "Outdoor footsteps (box walk)"),
]
log = []
for user, sid, slug, use in CLIPS:
    url = f"https://freesound.org/people/{user}/sounds/{sid}/"
    page = urllib.request.urlopen(url, timeout=60).read().decode("utf8", "replace")
    if "creativecommons.org/publicdomain/zero/1.0" not in page:
        raise SystemExit(f"{url}: not CC0 — refusing")
    title = html.unescape(re.search(r"<title>Freesound - (.*?) by ", page).group(1))
    prev = re.search(r"https://cdn\.freesound\.org/previews/\d+/%d_\d+-hq\.mp3" % sid, page).group(0)
    dst = os.path.join(out, f"{sid}_{slug}.mp3")
    urllib.request.urlretrieve(prev, dst)
    log.append({"id": sid, "author": user, "title": title, "page": url, "file": os.path.relpath(dst, ep),
                "downloaded": prev, "license": "CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)",
                "note": "Freesound HQ preview (128 kbps MP3); original WAV requires a Freesound login", "use": use})
    print(sid, title)
json.dump(log, open(os.path.join(out, "SOURCES.json"), "w"), indent=1)
