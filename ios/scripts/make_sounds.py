"""Makes the app's sounds (ios/Done/Resources/Sounds/*.wav) from plain sine
tones, so there are no third-party samples to license. Standard library only.

    python ios/scripts/make_sounds.py
"""
import math
import struct
import wave
from pathlib import Path

RATE = 44_100
OUT = Path(__file__).resolve().parent.parent / "Done" / "Resources" / "Sounds"


def tone(freq, start, length, volume, decay, harmonics=((2, 0.18), (3, 0.06))):
    """A soft bell-like note: a sine plus faint overtones, fading out."""
    return (freq, start, length, volume, decay, harmonics)


def render(notes, total):
    samples = [0.0] * int(RATE * total)
    for freq, start, length, volume, decay, harmonics in notes:
        first = int(RATE * start)
        count = int(RATE * length)
        for i in range(count):
            t = i / RATE
            attack = min(1.0, t / 0.004)  # 4 ms fade-in, no click
            env = attack * math.exp(-t * decay)
            value = math.sin(2 * math.pi * freq * t)
            for multiple, amount in harmonics:
                value += amount * math.sin(2 * math.pi * freq * multiple * t)
            release = min(1.0, (count - i) / (RATE * 0.012))  # 12 ms fade-out, no click
            index = first + i
            if index < len(samples):
                samples[index] += volume * env * release * value
    peak = max(1e-9, max(abs(s) for s in samples))
    scale = min(1.0, 0.9 / peak)
    return [s * scale for s in samples]


def write(name, samples):
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32767)) for s in samples))


# A row passing the band: a short, quiet wooden click.
write("tick", render([tone(1800, 0, 0.03, 0.25, 180, ((2.7, 0.3),))], 0.035))
# The reel landing: two notes up a fifth.
write("land", render([tone(784, 0, 0.5, 0.35, 7), tone(1175, 0.09, 0.55, 0.3, 6)], 0.65))
# Starting a task: one warm note.
write("start", render([tone(523.25, 0, 0.45, 0.3, 8)], 0.45))
# Finishing a task (also the time's-up notification): a rising arpeggio.
write("done", render(
    [tone(523.25, 0.0, 0.6, 0.3, 6), tone(659.25, 0.08, 0.6, 0.28, 6),
     tone(783.99, 0.16, 0.6, 0.26, 6), tone(1046.5, 0.24, 0.8, 0.24, 4.5)],
    1.05,
))
print("wrote", sorted(p.name for p in OUT.glob("*.wav")))
