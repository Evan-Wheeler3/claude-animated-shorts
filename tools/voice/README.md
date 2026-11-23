# Narration tools

`gen_voice.py` renders `SCRIPT.md` lines (`Lnn text`) to `voice/voice.wav` + `voice/lines.json` with Kokoro-82M
(ONNX, Apache-2.0). `align.py` makes `voice/words.json` (word start/end in seconds, one entry per script word) with
faster-whisper `medium.en` and diffs what it heard against the script.

## Setup (Python 3.13, no PyTorch needed)
```bash
python3 -m venv tts && ./tts/bin/pip install kokoro-onnx soundfile huggingface_hub faster-whisper
apt-get install -y espeak-ng ffmpeg
# model + voices from Hugging Face (onnx-community/Kokoro-82M-v1.0-ONNX)
./tts/bin/python - <<'PY'
from huggingface_hub import hf_hub_download; import numpy as np
R="onnx-community/Kokoro-82M-v1.0-ONNX"; hf_hub_download(R,"onnx/model.onnx",local_dir="kokoro")
v="am_puck"; p=hf_hub_download(R,f"voices/{v}.bin",local_dir="kokoro")
np.savez("kokoro/voices.npz",**{v:np.fromfile(p,dtype=np.float32).reshape(-1,1,256)})
PY
cp kokoro/voices.npz kokoro/voices.bin
```

## Emphasis
Mark stressed words `*like this*` in `voice/SCRIPT-emphasis.md` (same `Lnn` lines as SCRIPT.md). `gen_voice.py`
gives them primary stress and lengthens long vowels (never short ones: tip -> "teep"), lines may end in `!`, and
`emph_gain.py` then lifts those words by +3 dB using the aligned `words.json`.

## Use
```bash
KOKORO_DIR=kokoro ./tts/bin/python tools/voice/gen_voice.py videos/<story-id>
./tts/bin/python tools/voice/align.py videos/<story-id>
./tts/bin/python tools/voice/emph_gain.py videos/<story-id> 3
```
Then check pronunciation line by line, and add phoneme `OVERRIDE`s in `gen_voice.py` for words the recogniser
mishears (Vasa needed five; see the comments there). Settings: voice `am_puck`, speed 1.10, 0.04 s between lines,
planned beats 0.18-0.22 s, built-in punctuation pauses over 0.18 s shortened to 0.12 s.

**Pause measurement:** `check-pacing.py` measures gaps between whisper word timestamps, which overstate real pauses
(Vasa: 5.2 s by word gaps vs ~0.9 s of true silence ≥ 0.25 s, all at planned beats). Judge dead air from the audio.
