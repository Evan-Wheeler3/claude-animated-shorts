# Render project

A Remotion project that holds the shorts made with the skill in this repo.

| Short | Composition | Source | Script, voice, sound |
|---|---|---|---|
| A Whale of a Deal (exploding whale, Oregon 1970) | `WhaleShort` | `src/videos/whale/` | `shorts/whale/` |
| The Great Emu War (Western Australia 1932) | `EmuShort` | `src/videos/emu/` | `shorts/emu/` |
| Could You Survive a Western Duel? | `DuelShort` | `src/videos/duel/` | `shorts/duel/` |
| Why Plane Windows Are Round | `WindowsShort` | `src/videos/windows/` | `shorts/windows/` |
| The Eiffel Tower's Secret Job | `EiffelShort` | `src/videos/eiffel/` | `shorts/eiffel/` |
| The Bridge That Fell for a Song (template) | `BridgeShort` | `src/videos/bridge/` | not included (needs the Kenney props) |

## Render the whale short (needs a computer with a graphics card)
```
cd project
npm install
npm run render:whale        # 1440x2560, writes out/whale/whale_2k.mp4 with sound
npm run render:whale:1080   # 1080x1920, faster
npm run render:emu:1080     # the Emu War, writes out/emu/emu_1080.mp4 (render:emu for 2K)
npm run render:duel:1080    # the duel, writes out/duel/duel_1080.mp4 (render:duel for 2K)
npm run render:windows:1080 # plane windows, writes out/windows/windows_1080.mp4 (render:windows for 2K)
npm run render:eiffel:1080  # Eiffel Tower, writes out/eiffel/eiffel_1080.mp4 (render:eiffel for 2K)
```
Needs Node 20+. Remotion downloads its own headless browser on the first run. No ffmpeg install is needed.

## Check single frames
```
node scripts/stills.mjs WhaleShort out/whale/x_ 100,1100,1375 0.5
```

## Rebuild the voice and the sound (optional, Python 3 with numpy, scipy, soundfile, kokoro-onnx)
```
cd shorts/whale
python voice/tts.py am_michael 1.32 voice/voice.wav      # models go in project/models/
python voice/align.py                                    # word timings (faster-whisper)
cd audio && python make.py                               # SFX + score + mix -> mix.wav, cues.md
ffmpeg -y -i mix.wav -c:a aac -b:a 256k ../../../public/whale/mix.m4a
```
A change to the voice timing means updating the frame numbers in `src/videos/whale/story.ts` and `audio/make.py`.
