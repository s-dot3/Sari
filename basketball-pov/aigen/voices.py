"""Is anyone talking in a generated clip's sound? (The film's sound has no voices: no chatter, no crowd, no commentary.)

  python3 aigen/voices.py aigen/gen/open.mp4 [...]

Prints the stretches Silero VAD hears as speech in each clip, or 'no voices'.
"""
import subprocess
import sys

import numpy as np
import torch
from silero_vad import get_speech_timestamps, load_silero_vad

model = load_silero_vad()
for path in sys.argv[1:]:
    pcm = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    wav = torch.from_numpy(np.frombuffer(pcm, np.int16).astype(np.float32) / 32768)
    if not len(wav):
        print(path, 'no sound')
        continue
    ts = get_speech_timestamps(wav, model, sampling_rate=16000, return_seconds=True, threshold=0.4)
    print(path, ', '.join(f'{t["start"]:.2f}-{t["end"]:.2f} s' for t in ts) if ts else 'no voices')
