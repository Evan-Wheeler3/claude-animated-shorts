"""Temp voice takes for the motion-review cut (NOT final performances).

Narrator: Qwen3-TTS 12Hz 0.6B Base voice clone of the series narrator ("voice B", the owner-approved Phil Bathroom
          narrator take at commit c455d9a, videos/phil-bathroom/narration/voice.wav, first 6.42 s as reference).
Host:     Qwen3-TTS 12Hz 0.6B CustomVoice, preset English speaker, calm podcast-host instruction.
Each line is rendered as its own dry mono take; the best of N seeds is picked later by align_voices.py.

usage: python gen_voices.py <out_dir> <phil_voice.wav> [which=all|narrator|host] [takes=2]
"""
import sys, os, json, time
import numpy as np, soundfile as sf, torch

out, ref = sys.argv[1], sys.argv[2]
which = sys.argv[3] if len(sys.argv) > 3 else "all"
takes = int(sys.argv[4]) if len(sys.argv) > 4 else 2
os.makedirs(out, exist_ok=True)
torch.set_num_threads(os.cpu_count() or 4)
from qwen_tts import Qwen3TTSModel

NARRATOR = {
    "N01": "Your neighbor thinks your doorbell camera is his podcast studio.",
    "N02": "No camera, no show. So destroy the doorbell camera!",
    "N03": "And that night, he's on the baby monitor.",
    "N04": "This needs to stop. So you lock every camera in the house in a safe.",
    "N05": "His next guest is a locksmith.",
    "N06": "So you sell the house and move so deep into the woods the road gives up before you get there.",
    "N07": "Three weeks. You haven't heard his voice once.",
}
HOST = {
    "H01": "Welcome back. Episode forty-six.",
    "H02": "Tonight's guest just learned to stand.",
    "H03": "So how'd you get into this?",
    "H04": "Welcome back.",
    "H05": "So when did you know it was time to move out of your parents' cave?",
}
REF_TEXT = "Your neighbor Phil keeps breaking into your house to use your bathroom. And worst of all, he never flushes."
HOST_INSTRUCT = ("A calm, warm, perfectly composed late-night podcast host. Unhurried, friendly and sincere, "
                 "mid-range male voice, close to the microphone, no excitement.")

def save(name, wav, sr):
    wav = np.asarray(wav, dtype=np.float32).reshape(-1)
    sf.write(os.path.join(out, name + ".wav"), wav, sr)
    return len(wav) / sr

log = []
if which in ("all", "narrator"):
    y, sr = sf.read(ref, dtype="float32")
    y = y[: int(6.6 * sr)]
    ref_clip = os.path.join(out, "_ref_voiceB.wav")
    sf.write(ref_clip, y, sr)
    m = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-0.6B-Base", device_map="cpu", dtype=torch.float32)
    prompt = m.create_voice_clone_prompt(ref_audio=ref_clip, ref_text=REF_TEXT)
    for k, text in NARRATOR.items():
        for t in range(takes):
            torch.manual_seed(1000 + t)
            t0 = time.time()
            wavs, sr2 = m.generate_voice_clone(text=text, language="English", voice_clone_prompt=prompt)
            d = save(f"{k}_t{t}", wavs[0], sr2)
            log.append({"cue": k, "take": t, "sec": round(d, 2), "gen_s": round(time.time() - t0, 1)})
            print(log[-1], flush=True)
    del m
if which in ("all", "host"):
    m = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice", device_map="cpu", dtype=torch.float32)
    spk = os.environ.get("HOST_SPEAKER", "Ryan")
    print("speakers:", getattr(m, "get_supported_speakers", lambda: "?")(), flush=True)
    for k, text in HOST.items():
        for t in range(takes):
            torch.manual_seed(2000 + t)
            t0 = time.time()
            wavs, sr2 = m.generate_custom_voice(text=text, language="English", speaker=spk, instruct=HOST_INSTRUCT)
            d = save(f"{k}_t{t}", wavs[0], sr2)
            log.append({"cue": k, "take": t, "speaker": spk, "sec": round(d, 2), "gen_s": round(time.time() - t0, 1)})
            print(log[-1], flush=True)
json.dump(log, open(os.path.join(out, f"_gen_log_{which}.json"), "w"), indent=1)
