"""Makes the app's sounds (ios/Done/Resources/Sounds/*.wav) with the web app's
generator (scripts/make_sounds.py), so both apps sound the same: synthesized,
nothing to license. Needs numpy and scipy (pip install numpy scipy); no ffmpeg.

    python ios/scripts/make_sounds.py
"""
import subprocess
import sys
from pathlib import Path

IOS = Path(__file__).resolve().parent.parent
GENERATOR = IOS.parent / "scripts" / "make_sounds.py"
OUT = IOS / "Done" / "Resources" / "Sounds"

sys.exit(subprocess.call([sys.executable, str(GENERATOR), "--wav", str(OUT), "--no-mp3"]))
