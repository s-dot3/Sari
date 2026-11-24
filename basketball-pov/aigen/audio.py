"""The film's sound, cut from the reps' own generated sound to work/timeline.json.

  python3 aigen/audio.py out/two_moves_max_ai.wav

Full speed: the clip's own sound, as it was. Slow motion: every hit in it (the ball on the floor, sneakers, the net,
the glass, the bump), found by its onset, played again at its slowed time and pitched down like high-frame-rate
footage, over the clip's own room sound, darkened. Freezes and cards: the room sound held, and a soft low accent as the
picture stops. Every join is crossfaded.
"""
import json
import os
import pathlib
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = pathlib.Path(__file__).resolve().parent
WORK = HERE / os.environ.get('AIGEN_WORK', 'work')
SR = 48000
XF = int(0.02 * SR)  # crossfade at every join


def read(p):
    sr, x = wavfile.read(p)
    assert sr == SR, (p, sr)
    x = x.astype(np.float32) / (32768.0 if x.dtype == np.int16 else 1.0)
    return np.stack([x, x], 1) if x.ndim == 1 else x[:, :2]


def onsets(x):
    """Seconds of the clip where something hits: peaks of the spectral flux."""
    hop = 256
    t, Z = signal.stft(x.mean(1), SR, nperseg=1024, noverlap=1024 - hop)[1:]
    flux = np.maximum(0, np.diff(np.log1p(np.abs(Z) * 200), axis=1)).sum(0)
    flux = (flux - np.median(flux)) / (np.std(flux) + 1e-9)
    peaks, _ = signal.find_peaks(flux, height=2.0, distance=int(0.07 * SR / hop))
    return t[1:][peaks]


def bed(x, n):
    """n samples of the clip's room sound: its quietest second, looped with crossfades."""
    w = SR
    rms = np.sqrt(signal.convolve((x ** 2).mean(1), np.ones(w // 8) / (w // 8), mode='valid'))[:: w // 16]
    i = int(np.argmin(rms[: max(1, len(rms) - 16)])) * (w // 16)
    seg = x[i:i + w]
    if len(seg) < w:
        seg = np.pad(seg, ((0, w - len(seg)), (0, 0)))
    out, fade = np.zeros((n + w, 2), np.float32), np.linspace(0, 1, XF * 4)[:, None]
    seg = seg.copy()
    seg[: len(fade)] *= fade
    seg[-len(fade):] *= fade[::-1]
    for k in range(0, n, w - len(fade)):
        out[k:k + w] += seg
    return out[:n]


def lp(x, f):
    return signal.sosfiltfilt(signal.butter(2, f, btype='low', fs=SR, output='sos'), x, axis=0).astype(np.float32)


def accent():
    """The picture stops: a short low thump with a breath of air."""
    t = np.arange(int(0.6 * SR)) / SR
    body = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t / 0.25) + 38) / SR) * np.exp(-t / 0.14)
    air = lp(np.random.default_rng(3).standard_normal((len(t), 1)), 1800)[:, 0] * np.exp(-t / 0.06) * 0.25
    y = (body + air) * 0.32
    return np.stack([y, y], 1).astype(np.float32)


def place(buf, clip, i):
    if i < 0:
        clip, i = clip[-i:], 0
    j = min(len(buf), i + len(clip))
    if j > i:
        buf[i:j] += clip[: j - i]


def faded(x):
    x = x.copy()
    k = min(XF, len(x) // 2)
    if k:
        x[:k] *= np.linspace(0, 1, k)[:, None]
        x[-k:] *= np.linspace(1, 0, k)[:, None]
    return x


def main(out):
    tl = json.loads((WORK / 'timeline.json').read_text())
    src = {r: read(WORK / r / 'audio.wav') for r in {s['rep'] for s in tl['segs']}}
    hits = {r: onsets(x) for r, x in src.items()}
    buf = np.zeros((int(tl['dur'] * SR) + SR, 2), np.float32)
    for s in tl['segs']:
        x, i0 = src[s['rep']], int(s['vt0'] * SR)
        n = int(s['vt1'] * SR) - i0
        if s['rate'] == 1:
            a = int(s['st0'] * SR)
            chunk = x[a:a + n + XF]
            place(buf, faded(np.pad(chunk, ((0, max(0, n + XF - len(chunk))), (0, 0)))), i0)
        elif s['rate'] > 0:
            r = s['rate']
            place(buf, faded(lp(bed(x, n + XF), 1500) * 0.8), i0)
            for t in hits[s['rep']]:
                if s['st0'] <= t < s['st1']:
                    a = max(0, int((t - 0.01) * SR))
                    hit = x[a:a + int(0.32 * SR)].copy()
                    hit *= np.exp(-np.arange(len(hit)) / (0.12 * SR))[:, None]
                    slowed = signal.resample(hit, int(len(hit) / r ** 0.5), axis=0).astype(np.float32)
                    place(buf, faded(slowed), i0 + int((t - s['st0']) / r * SR))
        else:
            place(buf, faded(bed(x, n + XF) * (0.55 if s['card'] else 0.7)), i0)
            if not s['card']:
                place(buf, accent(), i0)
    buf = buf[: int(tl['dur'] * SR)]
    peak = np.abs(buf).max()
    if peak > 0.98:
        buf *= 0.98 / peak
    k = int(0.5 * SR)
    buf[:k] *= np.linspace(0, 1, k)[:, None]
    buf[-k:] *= np.linspace(1, 0, k)[:, None]
    pathlib.Path(out).parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(out, SR, (np.clip(buf, -1, 1) * 32767).astype(np.int16))
    print(out, f'{len(buf) / SR:.2f} s', {r: len(h) for r, h in hits.items()}, 'hits found')


if __name__ == '__main__':
    main(sys.argv[1])
