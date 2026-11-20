"""Motion-review QA for My Neighbor Has a Podcast.

usage: python scripts/qa_review.py <review.mp4> <out_dir>
Checks (exit 1 on failure): 1530 frames @ 30 fps; black only at 345-365 (bat contact) and 1525-1529 (end);
spoken lines disjoint, no speech in 500-540 (stand + cheer), H02 ends <= 507, N02 ends <= 330;
audio stream present and 51.0 s. Writes a 1-frame-per-second contact sheet and QA.json.
"""
import sys, os, json, re, subprocess

mp4, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))
voice = json.load(open(os.path.join(here, "..", "src", "voice.json")))
res, ok = {}, True
def fail(m):
    global ok
    ok = False
    print("FAIL", m)

pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-of", "json", mp4], capture_output=True, text=True).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video")
a = [s for s in pr["streams"] if s["codec_type"] == "audio"]
res["frames"] = int(v["nb_read_frames"]); res["fps"] = v["r_frame_rate"]; res["size"] = f'{v["width"]}x{v["height"]}'
res["audio_s"] = float(a[0]["duration"]) if a else None
if res["frames"] != 1530: fail(f"frames {res['frames']}")
if res["fps"] != "30/1": fail(f"fps {res['fps']}")
if not a or abs(res["audio_s"] - 51.0) > 0.05: fail(f"audio {res['audio_s']}")

bd = subprocess.run(["ffmpeg", "-i", mp4, "-vf", "blackdetect=d=0.05:pic_th=0.98:pix_th=0.06", "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
blacks = [(round(float(s) * 30), round(float(e) * 30)) for s, e in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", bd)]
res["black_ranges_frames"] = blacks
want = [(345, 366), (1525, 1530)]
for w in want:
    if not any(abs(b[0] - w[0]) <= 1 and abs(b[1] - w[1]) <= 1 for b in blacks): fail(f"missing black {w}")
for b in blacks:
    if not any(abs(b[0] - w[0]) <= 1 for w in want): fail(f"unexpected black {b}")

lines = sorted(voice["lines"], key=lambda l: l["in"])
for x, y in zip(lines, lines[1:]):
    if x["out"] > y["in"]: fail(f"overlap {x['id']}/{y['id']}")
for l in lines:
    if l["in"] < 540 and l["out"] > 500 and not l["out"] <= 507: fail(f"speech near cheer: {l['id']}")
lid = {l["id"]: l for l in lines}
if lid["H02"]["out"] > 507: fail("H02 late")
if lid["N02"]["out"] > 330: fail("N02 late")
res["lines"] = [(l["id"], l["in"], l["out"]) for l in lines]

sheet = os.path.join(out, "contact_sheet_1fps.jpg")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vf", "fps=1,scale=180:-1,tile=13x4", "-frames:v", "1", sheet], check=True)
res["contact_sheet"] = sheet
res["pass"] = ok
json.dump(res, open(os.path.join(out, "QA.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
sys.exit(0 if ok else 1)
