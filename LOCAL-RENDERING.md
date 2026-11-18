# Rendering Hold Up videos on your Mac

Claude makes the animation, narration, sound and previews. **Your Mac renders the final video**, with one command,
without Claude, without any API or paid service. Everything it needs is in this repository.

---

## 1. One-time setup (about 10 minutes)

Open **Terminal** (Applications → Utilities → Terminal) and paste these lines one at a time.

1. **Apple's developer tools** (gives you `git`). If a window pops up, click *Install*:
   ```bash
   xcode-select --install
   ```
2. **Node.js 20 or newer.** The simplest way is the installer from https://nodejs.org (choose "LTS"), then check:
   ```bash
   node -v        # should print v20... or v22...
   ```
3. **Get the project** (first time only; pick any folder, here your home folder):
   ```bash
   cd ~
   git clone https://github.com/Evan-Wheeler3/claude-animated-shorts.git
   cd claude-animated-shorts
   ```
4. **Install the project's packages** (downloads Remotion, three.js, and Remotion's own copy of ffmpeg; ~500 MB):
   ```bash
   npm ci
   ```
5. **Check that everything is ready** (the first run also downloads Remotion's headless Chrome, ~100 MB):
   ```bash
   npm run doctor -- --story niagara-barrel
   ```
   You want to see `READY` at the end. Any `FAIL` line says exactly what to fix.

You do **not** need Homebrew, ffmpeg, Python or a GPU driver: the render uses the ffmpeg that comes with Remotion and
the Chrome that Remotion downloads.

## 2. Every time Claude says a video is ready to render

```bash
cd ~/claude-animated-shorts
git fetch origin
git checkout <branch Claude names>      # e.g. claude/gifted-dijkstra-sxjxv6, or main once merged
git pull
npm ci                                  # only needed when package.json changed; harmless otherwise
npm run render -- --story niagara-barrel
```

That's it. The command:
1. checks tools, files, disk space and the composition (frame count, size, fps, audio length);
2. renders 1440 × 2560, 30 fps, H.264 in chunks (progress, speed and time remaining are shown);
3. stitches the chunks, adds the final sound mix, and verifies the result;
4. runs automated QA and writes a report.

**Your video:** `out/niagara-barrel/niagara-barrel_1440x2560.mp4`
**QA report:** `out/niagara-barrel/qa/niagara-barrel_1440x2560/report.md` (+ `contact_sheet.png`)

Then **watch the whole video** on your phone before posting. Automated QA cannot see bad poses, clipping or a joke that
lands late.

### If it stops or crashes
Just run **the same command again**. Finished chunks are kept and the render continues where it stopped. You can also
press `Ctrl+C` at any time to pause; run the command again to resume. A broken or incomplete final file is never
written: the MP4 only appears once everything succeeded.
To throw away the saved chunks and start over: add `--fresh`.

## 3. Previews (fast, low resolution)

```bash
npm run preview -- --story niagara-barrel                       # whole video, 540p, with sound
npm run preview -- --story niagara-barrel --res 720             # 720p
npm run preview -- --story niagara-barrel --frames 552-660      # a frame range (30 frames = 1 second)
npm run preview -- --story niagara-barrel --shot brink          # one shot (names: see below)
npm run preview -- --story niagara-barrel --stills              # one still per shot (jpg)
npm run preview -- --story niagara-barrel --stills --shot annie,purse
npm run preview -- --story niagara-barrel --frames 0-90 --qa    # preview + QA report
```
Previews go to `out/niagara-barrel/preview/`. Shot names for Niagara: hook_wide, hook_barrel, barrel_cu, annie,
cat_in, cat_alive, climb, strap, seal, current, brink, drop, rescue_open, rescue_alive, problem, fortune, purse.
(`npm run studio` opens Remotion Studio in the browser to scrub through the video interactively.)

## 4. QA on any file

```bash
npm run qa -- --story niagara-barrel                                   # the final render
npm run qa -- --story niagara-barrel --file path/to/video.mp4 --expect any
```
Checks: resolution, fps, frame count, H.264 + audio present, the file decodes without errors, black / white / frozen
frames, sudden jumps that are not shot cuts, audio length = video length, the narration starts at frame 0, long
silences, loudness (house target −15 LUFS) and true peak (≤ −1 dBTP). Result PASS / WARN / FAIL per check.

## 5. Speed: which settings are fastest on your Mac?

Run the benchmark once (10–20 minutes; it renders a few stills and short clips with each configuration):
```bash
npm run bench -- --story niagara-barrel
```
It tries GL `angle` (the GPU, through Metal) and `swangle` (software, CPU only), several concurrency values and the Mac's
hardware H.264 encoder, measures frames per second and memory, checks that the GPU images match the software images,
and prints the fastest setting plus the command to use it, e.g.:
```bash
npm run render -- --story niagara-barrel --gl angle --concurrency 4 --hw
```
Results are saved in `out/bench/`. **Please send the `results.md` to Claude** so it can become the documented default.

Defaults until then: GL `angle` on macOS, concurrency = half your CPU cores (max 4), software x264 (crf 16).
- `--gl angle` uses the GPU through ANGLE/Metal. It is the expected winner on Apple Silicon, but three.js scenes are
  sometimes faster in software when the scene is CPU-bound; the benchmark decides.
- `--concurrency` = how many frames render at once. More is faster until memory runs out: a MacBook Air with 8 GB should
  stay at 2; 16 GB can try 3–4. If the Mac becomes very slow or a render dies with "Target closed" / out of memory,
  lower it.
- `--hw` encodes with the Mac's hardware H.264 encoder (VideoToolbox): faster encoding, slightly bigger files.
  Rendering the 3D frames, not encoding, is usually the slow part.

Measured so far (Claude's cloud container, software GL, no GPU, 4 CPU cores): a 1440 × 2560 still takes 20–28 s; the
bench measured 0.095 fps at concurrency 2 and 0.079 fps at concurrency 3 (more parallel frames was slower on 4 cores);
a 16-frame chunked sample took 17.6 s per frame
(≈ 3–5 hours for the 36 s Niagara video) — the reason final renders run on your Mac. **Mac numbers: pending your
benchmark.** Keep the Mac plugged in, and don't let it sleep (System Settings → Battery → Options, or run
`caffeinate -dims npm run render -- --story niagara-barrel`).

## 6. Disk space

| What | Size |
|---|---|
| `node_modules` (`npm ci`) | ~0.5 GB |
| Remotion's Chrome | ~0.1 GB |
| `.cache/` (code bundles, temp files) | ~0.1–0.5 GB, safe to delete |
| chunks while rendering | ~0.3–1 GB, deleted automatically after success |
| the final 36 s video | ~30–80 MB |

`doctor` refuses to start with less than 3 GB free. To reclaim space: `rm -rf .cache out/*/render out/*/preview`.

## 7. Troubleshooting

| Message | What to do |
|---|---|
| `npm packages: missing` | run `npm ci` |
| `final mix ... is missing` | `git pull`; the mix is committed at `public/<story>/mix.m4a`. (Claude can rebuild it.) |
| `Unknown story` | use one of the names it lists; new videos are registered in `render.config.mjs` |
| `Error creating WebGL context` | try `--gl swangle` (software). If only `angle` fails, tell Claude which macOS version you run |
| `chunk ... failed 3 times` | run the same command again (it resumes); if it fails at the same chunk again, try `--concurrency 1`, then send the error to Claude |
| render is very slow | run `npm run bench` and use its recommended settings; close other apps; plug in |
| QA says FAIL | open the report; frame count / decode failures mean a broken file: run with `--fresh` |
| "browser download" errors on first run | check the internet connection and run `npm run doctor` again |

## 8. What lives where (for the curious)

- `render.config.mjs`: registry of videos (composition, story file, final mix). Adding a video = one entry.
- `scripts/holdup.mjs`: the commands above. `scripts/lib/`: ffmpeg access, project/bundle cache, QA, loudness meter.
- `public/<story>/mix.m4a`: the final sound mix (committed, small). It is rebuilt by Claude with
  `npm run audio -- --story <id> --rebuild` (needs Python + numpy + scipy; you never need this to render).
- `out/` is never committed (except small review images Claude chooses).
