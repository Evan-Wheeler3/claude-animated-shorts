"""Put the script's exact words (with punctuation, from lines.txt) onto the aligner's word times.
Whisper mishears a few words ("if a" -> "the"); this matches the two word sequences and interpolates times for any
script word the aligner got wrong, so words.json always carries the 14 script sentences the picture is cut to.
usage: python3 fit_words.py <words_raw.json> <words.json> [lines.txt]"""
import sys, json, re, difflib
raw = json.load(open(sys.argv[1]))
lines = open(sys.argv[3] if len(sys.argv) > 3 else __file__.replace("fit_words.py", "lines.txt"), encoding="utf-8").read()
script = [w for l in lines.splitlines() for w in re.sub(r"\[pause [0-9.]+\]", "", l).split()]
norm = lambda w: re.sub(r"[^a-z']", "", w.lower().replace("’", "'"))
sm = difflib.SequenceMatcher(a=[norm(w) for w in script], b=[norm(w["w"]) for w in raw], autojunk=False)
t = [None] * len(script)
for blk in sm.get_matching_blocks():
    for k in range(blk.size): t[blk.a + k] = (raw[blk.b + k]["a"], raw[blk.b + k]["b"])
known = [i for i, v in enumerate(t) if v]
for i, v in enumerate(t):           # fill unmatched words between their matched neighbours
    if v: continue
    lo = max([k for k in known if k < i], default=None); hi = min([k for k in known if k > i], default=None)
    a0 = t[lo][1] if lo is not None else 0.0; b0 = t[hi][0] if hi is not None else a0 + .3
    n = (hi if hi is not None else len(script)) - (lo if lo is not None else -1)
    j = i - (lo if lo is not None else -1)
    t[i] = (round(a0 + (b0 - a0) * (j - 1) / n, 3), round(a0 + (b0 - a0) * j / n, 3))
out = [{"w": w, "a": a, "b": b} for w, (a, b) in zip(script, t)]
json.dump(out, open(sys.argv[2], "w"), indent=0)
miss = len(script) - len(known)
print(f"{len(out)} words, {miss} not heard by the aligner (interpolated):",
      [script[i] for i in range(len(script)) if i not in known])
