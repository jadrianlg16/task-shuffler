"""Makes done.'s sound effects from scratch (synthesis, no samples), so there
is nothing to license. Needs numpy + scipy, and ffmpeg for the web's MP3s.

    python scripts/make_sounds.py                     # public/sounds/*.mp3
    python scripts/make_sounds.py --wav DIR           # also 16-bit WAVs into DIR
    python scripts/make_sounds.py --wav DIR --no-mp3  # only the WAVs (no ffmpeg)

One family of timbres so they sound like one app: a wooden click for the
reel, marimba notes for everything tuneful, a glassy shimmer on the rewards,
all in C major so overlapping sounds never clash. Fixed random seed: the same
script always makes the same files.
"""
import argparse
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44_100
ROOT = Path(__file__).resolve().parent.parent
WEB_OUT = ROOT / "public" / "sounds"
rng = np.random.default_rng(7)

# Note frequencies (equal temperament, A4 = 440).
A4, C5, D5, E5, G5, B5, C6, E6 = 440.0, 523.25, 587.33, 659.25, 783.99, 987.77, 1046.5, 1318.51


def seconds(n):
    return np.arange(int(SR * n)) / SR


def place(parts, total):
    """Mix (start_seconds, samples) pairs into one buffer `total` seconds long.
    Each part fades out over its last 15 ms, so a note cut short never clicks."""
    out = np.zeros(int(SR * total))
    for start, x in parts:
        i = int(SR * start)
        x = x[: max(0, len(out) - i)].copy()
        fade = min(len(x), int(SR * 0.015))
        x[len(x) - fade :] *= np.cos(np.linspace(0, np.pi / 2, fade)) ** 2
        out[i : i + len(x)] += x
    return out


def lowpass(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "low", fs=SR, output="sos"), x)


def highpass(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def modal(freq, dur, partials):
    """Struck object: decaying sine partials given as (ratio, gain, decay per s)."""
    t = seconds(dur)
    out = np.zeros_like(t)
    for ratio, gain, decay in partials:
        f = freq * ratio
        if f < SR * 0.45:
            out += gain * np.sin(2 * np.pi * f * t) * np.exp(-t * decay)
    return out


def strike(dur, hz):
    """The mallet's contact noise: a few ms of filtered noise."""
    t = seconds(dur)
    return lowpass(rng.standard_normal(len(t)) * np.exp(-t * 900), hz)


def marimba(freq, dur=0.9, bright=1.0):
    # Tuned-bar partials (1 : ~3.9 : ~9.2); higher notes ring shorter.
    k = (freq / 440) ** 0.5
    bar = modal(freq, dur, [(1.0, 1.0, 6.5 * k), (3.93, 0.30 * bright, 24 * k), (9.2, 0.08 * bright, 60 * k)])
    return bar + 0.12 * strike(dur, min(8000, freq * 5))


def glass(freq, dur=0.9):
    """FM bell: the shimmer on top of rewarding sounds."""
    t = seconds(dur)
    index = 1.4 * np.exp(-t * 9)
    return np.sin(2 * np.pi * freq * t + index * np.sin(2 * np.pi * freq * 3.5 * t)) * np.exp(-t * 5.5)


def glide(f0, f1, dur, decay):
    """Sine whose pitch slides exponentially from f0 to f1: pops and thunks."""
    t = seconds(dur)
    freq = f0 * (f1 / f0) ** np.clip(t / dur, 0, 1)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * np.exp(-t * decay)


def swoosh(dur, f0, f1):
    """Rising filtered air, faded in and out."""
    t = seconds(dur)
    noise = rng.standard_normal(len(t))
    out = np.zeros_like(noise)
    # Sweep a band-pass in short blocks; overlap-free is fine at this length.
    block = 256
    for i in range(0, len(noise), block):
        c = f0 * (f1 / f0) ** (i / len(noise))
        seg = noise[max(0, i - 2048) : i + block]
        out[i : i + block] = bandpass(seg, c * 0.7, min(c * 1.4, SR * 0.45))[-len(noise[i : i + block]) :]
    return out * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2


def room(x, wet, rt=0.45):
    """A small, soft room so the sounds don't feel pasted on."""
    n = int(SR * rt)
    t = np.arange(n) / SR
    ir = lowpass(rng.standard_normal(n) * np.exp(-t * 6.91 / rt), 4500)
    ir = np.concatenate([np.zeros(int(SR * 0.009)), ir])
    ir /= np.sqrt(np.sum(ir**2))
    y = signal.fftconvolve(x, ir)
    dry = np.concatenate([x, np.zeros(len(y) - len(x))])
    return dry + wet * y * 0.35


def finish(x, peak_db):
    """Clean ends, no DC, trimmed tail, one peak level per sound."""
    x = highpass(x, 35)
    x = lowpass(x, 11000, order=1)
    peak = np.max(np.abs(x))
    loud = np.nonzero(np.abs(x) > peak * 10 ** (-58 / 20))[0]
    x = x[: loud[-1] + 1]
    fade_in, fade_out = int(SR * 0.0005), min(len(x) // 3, int(SR * 0.02))
    x[:fade_in] *= np.linspace(0, 1, fade_in)
    x[-fade_out:] *= np.linspace(1, 0, fade_out) ** 2
    x = np.tanh(x / np.max(np.abs(x)) * 1.1) / np.tanh(1.1)  # gentle limiter
    return x * 10 ** (peak_db / 20)


# ---------------------------------------------------------------------------
# The sounds


def tick():
    """A row passing the band: a small wooden click with a knock under it."""
    dur = 0.05
    t = seconds(dur)
    click = bandpass(rng.standard_normal(len(t)), 2500, 7000) * np.exp(-t * 1100)
    body = modal(1450, dur, [(1.0, 1.0, 120), (2.31, 0.45, 170), (3.9, 0.2, 260)])
    knock = np.sin(2 * np.pi * 420 * t) * np.exp(-t * 95)
    return finish(0.55 * click + 0.5 * body + 0.3 * knock, -13)


def land():
    """The reel stopping on a task: a soft clunk, then a rising fifth."""
    thunk = glide(210, 105, 0.12, 28) + 0.25 * strike(0.12, 1200)
    note1 = marimba(E5) + 0.18 * glass(E5 * 2)
    note2 = marimba(B5) + 0.22 * glass(B5 * 2)
    x = place([(0, 0.55 * thunk), (0.01, 0.55 * note1), (0.085, 0.6 * note2)], 1.0)
    return finish(room(x, 0.9), -4)


def start():
    """Starting a task: a quick upward whoosh into one warm note."""
    air = swoosh(0.11, 500, 3200)
    note = place([(0, marimba(A4, 0.7, bright=1.2)), (0, 0.5 * marimba(A4 * 2, 0.5, bright=0.6))], 0.7)
    x = place([(0, 0.35 * air), (0.075, 0.7 * note)], 0.8)
    return finish(room(x, 0.7), -6)


def done():
    """Finishing a task: a pop and a fast arpeggio up to a shimmering C."""
    pop = glide(380, 900, 0.05, 55)
    notes = [(0.030, C5, 0.50), (0.085, E5, 0.52), (0.140, G5, 0.55), (0.195, C6, 0.62)]
    parts = [(0, 0.45 * pop)]
    for at, freq, gain in notes:
        parts.append((at, gain * marimba(freq, 1.0)))
    parts.append((0.195, 0.3 * glass(C6 * 2, 1.1)))
    parts.append((0.215, 0.14 * glass(E6 * 2, 1.0)))
    return finish(room(place(parts, 1.3), 1.0), -3)


def drop():
    """Putting a task back: a muted step down a fourth."""
    a = lowpass(marimba(D5, 0.5, bright=0.5), 2500)
    b = lowpass(marimba(A4, 0.6, bright=0.5), 2200)
    x = place([(0, 0.55 * a), (0.09, 0.6 * b)], 0.7)
    return finish(room(x, 0.5), -9)


def add():
    """Adding a task: a small bubbly pop with a bright tap on top."""
    pop = glide(520, 1250, 0.07, 45)
    tap = marimba(E6, 0.25, bright=0.4)
    x = place([(0, 0.8 * pop), (0.018, 0.25 * tap)], 0.3)
    return finish(room(x, 0.35), -8)


SOUNDS = {"tick": tick, "land": land, "start": start, "done": done, "drop": drop, "add": add}


def write_wav(path, x):
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def report(name, x):
    peak = 20 * np.log10(np.max(np.abs(x)))
    win = int(SR * 0.05)
    rms = max(np.sqrt(np.mean(x[i : i + win] ** 2)) for i in range(0, max(1, len(x) - win), win // 2))
    print(f"  {name:6} {len(x) / SR:5.3f}s  peak {peak:6.1f} dBFS  loudest-50ms RMS {20 * np.log10(rms):6.1f} dBFS")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--wav", type=Path, help="also write 16-bit WAVs into this folder")
    parser.add_argument("--no-mp3", action="store_true", help="skip the web's MP3s (and ffmpeg)")
    args = parser.parse_args()
    if args.no_mp3 and not args.wav:
        sys.exit("--no-mp3 without --wav would write nothing")

    ffmpeg = None if args.no_mp3 else shutil.which("ffmpeg")
    if not args.no_mp3:
        if not ffmpeg:
            sys.exit("ffmpeg not found: it encodes the web's MP3s (or pass --no-mp3)")
        WEB_OUT.mkdir(parents=True, exist_ok=True)
    if args.wav:
        args.wav.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        for name, make in SOUNDS.items():
            x = make()
            report(name, x)
            wav = Path(tmp) / f"{name}.wav"
            write_wav(wav, x)
            if args.wav:
                shutil.copy(wav, args.wav / f"{name}.wav")
            if args.no_mp3:
                continue
            subprocess.run(
                [ffmpeg, "-v", "error", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "96k",
                 "-map_metadata", "-1", str(WEB_OUT / f"{name}.mp3")],
                check=True,
            )
    places = ([] if args.no_mp3 else [str(WEB_OUT.relative_to(ROOT))]) + ([str(args.wav)] if args.wav else [])
    print(f"Wrote {len(SOUNDS)} sounds to {' and '.join(places)}")


if __name__ == "__main__":
    main()
