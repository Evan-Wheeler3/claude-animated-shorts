"""Narration in voice B for coin-ridges.

Voice B = Qwen3-TTS 12Hz 0.6B Base voice clone of the owner-approved Phil Bathroom narrator take
(videos/phil-bathroom/narration/voice.wav @ d17acc0 on claude/happy-ptolemy-nw9xga, first ~6.4 s as reference),
same settings as videos/neighbor-podcast/audio/tools/gen_voices.py.

Step 1 (takes):  python gen_voice_b.py takes <phil_voice.wav> <takes_dir> [n_takes=3]
Step 2 (pick):   python gen_voice_b.py pick  <takes_dir>      -> writes voice/voice.wav + voice/lines.json
                 picks, per line, the take whisper hears most exactly (then the one nearest 3.7 words/s).
"""
import sys, os, re, json, time, glob
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
REF_TEXT = "Your neighbor Phil keeps breaking into your house to use your bathroom. And worst of all, he never flushes."
GAP = 0.06          # seconds between lines
BEAT = {"L04": 0.18, "L08": 0.15, "L10": 0.18, "L12": 0.22}   # planned beats after these lines


def script_lines():
    out = []
    for raw in open(os.path.join(HERE, "SCRIPT-emphasis.md")):
        m = re.match(r"(L\d\d) (.+)", raw.strip())
        if not m:
            continue
        marked = m.group(2)
        words = marked.split()
        emph = [i for i, w in enumerate(words) if w.strip(".,!?\"'").startswith("*")]
        out.append({"line": m.group(1), "text": marked.replace("*", ""), "emph": emph})
    return out


def norm(t):
    return re.sub(r"[^a-z ]", " ", t.lower().replace("-", " ")).split()


if sys.argv[1] == "takes":
    import torch
    from qwen_tts import Qwen3TTSModel
    ref, out = sys.argv[2], sys.argv[3]
    n = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    os.makedirs(out, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 4)
    y, sr = sf.read(ref, dtype="float32")
    if y.ndim > 1:
        y = y.mean(1)
    ref_clip = os.path.join(out, "_ref_voiceB.wav")
    sf.write(ref_clip, y[: int(6.6 * sr)], sr)
    m = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-0.6B-Base", device_map="cpu", dtype=torch.float32)
    prompt = m.create_voice_clone_prompt(ref_audio=ref_clip, ref_text=REF_TEXT)
    for L in script_lines():
        for t in range(n):
            torch.manual_seed(1000 + t)
            t0 = time.time()
            wavs, sr2 = m.generate_voice_clone(text=L["text"], language="English", voice_clone_prompt=prompt)
            w = np.asarray(wavs[0], dtype=np.float32).reshape(-1)
            sf.write(os.path.join(out, f"{L['line']}_t{t}.wav"), w, sr2)
            print(L["line"], t, round(len(w) / sr2, 2), "s, gen", round(time.time() - t0, 1), "s", flush=True)

elif sys.argv[1] == "pick":
    from faster_whisper import WhisperModel
    tdir = sys.argv[2]
    wm = WhisperModel("medium.en", device="cpu", compute_type="int8")
    pieces, meta, t_cursor, sr = [], [], 0.05, None
    for L in script_lines():
        best = None
        for f in sorted(glob.glob(os.path.join(tdir, f"{L['line']}_t*.wav"))):
            a, sr = sf.read(f, dtype="float32")
            # trim leading/trailing silence
            nz = np.where(np.abs(a) > 0.01)[0]
            a = a[max(0, nz[0] - int(0.02 * sr)): nz[-1] + int(0.06 * sr)] if len(nz) else a
            from scipy.signal import resample_poly
            a16 = resample_poly(a, 16000, sr).astype(np.float32)   # pass audio, not a path (PyAV API drift)
            segs, _ = wm.transcribe(a16, language="en", beam_size=5)
            heard = " ".join(s.text for s in segs)
            want, got = norm(L["text"]), norm(heard)
            miss = sum(1 for x, y in zip(want, got) if x != y) + abs(len(want) - len(got))
            wps = len(want) / (len(a) / sr)
            score = (miss, abs(wps - 3.7))
            if best is None or score < best[0]:
                best = (score, a, f, heard)
        (miss, _), a, f, heard = best
        print(f"{L['line']} {os.path.basename(f)} miss={miss} wps={len(norm(L['text']))/(len(a)/sr):.2f} heard: {heard.strip()}")
        start = t_cursor
        pieces.append(np.zeros(int(start * sr) - sum(len(p) for p in pieces), np.float32))
        pieces.append(a)
        end = start + len(a) / sr
        meta.append({**L, "start": round(start, 3), "end": round(end, 3), "take": os.path.basename(f), "heard_miss": miss})
        t_cursor = end + GAP + BEAT.get(L["line"], 0)
    wav = np.concatenate(pieces)
    peak = np.abs(wav).max()
    wav = wav / peak * 0.89 if peak > 0 else wav
    sf.write(os.path.join(HERE, "voice.wav"), wav, sr, subtype="PCM_16")
    json.dump(meta, open(os.path.join(HERE, "lines.json"), "w"), indent=1)
    print("voice.wav", round(len(wav) / sr, 2), "s,", sum(len(norm(l["text"])) for l in meta), "words")
