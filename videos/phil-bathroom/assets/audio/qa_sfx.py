#!/usr/bin/env python3
"""Check the Phil bathroom cue WAVs and write QA_sfx.json."""

import json
import math
import wave
from pathlib import Path

RATE = 48000
FULL_SCALE = 8388608
LEVEL_TOLERANCE_DB = 0.02
MAX_LEADING_MS = 5
EXPECTED = {
    "S01_handle_snap.wav": (8640, False),
    "S01_step_1.wav": (11040, False),
    "S01_step_2.wav": (12000, False),
    "S01_paper_rustle.wav": (23040, False),
    "S02_doorway_creak.wav": (31680, False),
    "S02_roomtone_dip.wav": (96000, True),
    "S03_tool_tap_1.wav": (8160, False),
    "S03_tool_tap_2.wav": (9120, False),
    "S03_deadbolt_clunk.wav": (14880, False),
    "S04_sill_rub.wav": (17280, False),
    "S04_palm_plant.wav": (9120, False),
    "S04_shoe_land.wav": (15360, False),
    "S05_file_stroke_1.wav": (22080, False),
    "S05_file_stroke_2.wav": (24480, False),
    "S05_bar_rattle.wav": (25920, False),
    "S06_hammer_hit_1.wav": (12960, False),
    "S06_hammer_hit_2.wav": (15840, False),
    "S06_exterior_roomtone.wav": (192000, True),
    "S07_engine_idle.wav": (48000, False),
    "S07_garage_crash.wav": (61440, False),
    "S07_panel_settle.wav": (57600, False),
    "S08_nail_tick.wav": (6720, False),
    "S08_dog_breath.wav": (24480, False),
    "S09_foil_crinkle.wav": (21120, False),
    "S09_dog_sniff.wav": (19200, False),
    "S10_nail_tap_run.wav": (26880, False),
    "S10_tag_click.wav": (10080, False),
    "S11_concrete_set.wav": (31680, False),
    "S12_pole_tap.wav": (11520, False),
    "S12_pole_swish.wav": (20640, False),
    "S12_foot_contact_1.wav": (11520, False),
    "S12_foot_contact_2.wav": (12960, False),
    "S13_paper_flick.wav": (11040, False),
    "S13_mech_motor.wav": (72000, False),
    "S13_install_hum.wav": (96000, False),
    "S14_steel_slam.wav": (28320, False),
    "S14_sensor_pip.wav": (7200, False),
    "S14_heel_plant.wav": (12960, False),
    "S15_lock_clunk.wav": (13440, False),
    "S15_sigh.wav": (23520, False),
    "S16_bath_roomtone.wav": (240000, True),
    "S16_fart.wav": (16800, False),
}


def dbfs(amplitude):
    return 20 * math.log10(amplitude / FULL_SCALE) if amplitude else None


def inspect(path, expected_frames, room_tone):
    with wave.open(str(path), "rb") as clip:
        channels, width, rate, frames, _, _ = clip.getparams()
        data = clip.readframes(frames)

    errors = []
    metrics = {
        "sample_rate_hz": rate,
        "bit_depth": width * 8,
        "channels": channels,
        "duration_s": frames / rate,
        "peak_dbfs": None,
        "rms_dbfs": None,
        "leading_silence_ms": None,
        "errors": errors,
    }
    if (rate, width, channels) != (RATE, 3, 1):
        errors.append("Expected 48 kHz 24-bit mono PCM.")
    if frames != expected_frames or len(data) != frames * width * channels:
        errors.append("Unexpected cue duration or truncated sample data.")
    if width != 3 or channels != 1 or not data or len(data) % 3:
        return metrics

    samples = [int.from_bytes(data[i:i + 3], "little", signed=True)
               for i in range(0, len(data), 3)]
    peak = max(map(abs, samples))
    rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples))
    # Count frames below -40 dB relative to the file peak before the onset.
    onset = next((i for i, sample in enumerate(samples) if abs(sample) > peak / 100), len(samples))
    leading_ms = 1000 * onset / rate
    peak_db, rms_db = dbfs(peak), dbfs(rms)
    metrics.update(peak_dbfs=peak_db, rms_dbfs=rms_db, leading_silence_ms=leading_ms)
    level, target = (rms_db, -24) if room_tone else (peak_db, -3)
    if level is None or abs(level - target) > LEVEL_TOLERANCE_DB:
        errors.append(f"Expected {'RMS' if room_tone else 'peak'} of {target} dBFS.")
    if leading_ms > MAX_LEADING_MS:
        errors.append(f"Leading silence exceeds {MAX_LEADING_MS} ms.")
    return metrics


def main():
    root = Path(__file__).resolve().parent
    paths = {path.name: path for path in (root / "sfx").glob("*.wav")}
    results = {}
    for name in sorted(paths.keys() | EXPECTED.keys()):
        if name not in EXPECTED:
            results[name] = {"errors": ["Unexpected WAV."]}
        elif name not in paths:
            results[name] = {"errors": ["Missing WAV."]}
        else:
            try:
                results[name] = inspect(paths[name], *EXPECTED[name])
            except (wave.Error, EOFError, OSError) as error:
                results[name] = {"errors": [str(error)]}

    failed = [name for name, metrics in results.items() if metrics["errors"]]
    report = {"passed": not failed, "files_checked": len(results), "files": results}
    (root / "QA_sfx.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for name in failed:
        print(name, *results[name]["errors"])
    print(f"{len(results) - len(failed)}/{len(results)} cues passed")
    return int(bool(failed))


if __name__ == "__main__":
    raise SystemExit(main())
