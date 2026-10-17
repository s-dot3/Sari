"""Sound for the v14 street-court clip (48 kHz stereo WAV): an outdoor court in a city park, and nobody talking.

The bed is the city - a low traffic rumble, cars going by on the far street, a little wind in the bare trees, the odd
sparrow. On top: every dribble on asphalt (a hard, dry smack with the ball's ring and a slap-back off the brick
building across the park), the sneakers (soft scuffs on every step, harder ones on every cut), the catch, the
release, the steel backboard on the layup, the nylon net, and the ball bouncing away after it. No crowd voices, no
music, no edit swooshes: three phone takes cut together.
usage: python3 tools/audio_street.py out/events14.json out/audio14.wav
"""
import json, sys, wave
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(14)
ev = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
DUR = ev['duration']
N = int(DUR * SR) + SR // 2


def db(x): return 10 ** (x / 20)
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, btype='low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, btype='high', fs=SR, output='sos'), x)


def outdoor_ir(length=1.4):
    """Open air between buildings: nothing at first, a slap-back off the brick block ~30 m off (175 ms), a weaker one
    off the far side (260 ms), and a thin, dark diffuse tail - no room."""
    n = int(length * SR); t = np.arange(n) / SR
    ir = np.zeros(n); ir[0] = 1.0
    tail = lp(rng.standard_normal(n), 3000) * np.exp(-t / 0.22) * 0.05 * np.clip((t - 0.03) / 0.05, 0, 1)
    ir += tail
    for d, g, f in [(0.175, 0.2, 2600), (0.262, 0.1, 1800), (0.41, 0.045, 1400)]:
        k = int(d * SR); e = lp(np.r_[np.zeros(40), 1.0, np.zeros(400)], f); ir[k:k + len(e)] += e * g * 3
    return ir


IR = outdoor_ir()
def verb(x, wet): y = signal.fftconvolve(x, IR)[: len(x) + int(0.6 * SR)]; x2 = np.pad(x, (0, len(y) - len(x))); return x2 * (1 - wet) + y * wet


def place(buf, clip, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= buf.shape[1] or i + len(clip) <= 0: return
    j = min(buf.shape[1], i + len(clip)); s = max(0, -i)
    L = np.cos((pan + 1) * np.pi / 4); R = np.sin((pan + 1) * np.pi / 4)
    buf[0, i + s:j] += clip[s:j - i] * gain * L * 1.41; buf[1, i + s:j] += clip[s:j - i] * gain * R * 1.41


def bounce(pitch=1.0):
    """A dribble on asphalt: the ball's own low thump, its shell ringing, and a hard gritty smack at contact (the
    ground gives nothing back - no floor boom, unlike a wood court)."""
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = (150 + 60 * np.exp(-t / 0.008)) * pitch
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.022)
    ring = np.sin(2 * np.pi * 590 * pitch * t) * np.exp(-t / 0.045) * 0.42 + np.sin(2 * np.pi * 1290 * pitch * t) * np.exp(-t / 0.018) * 0.2
    smack = bp(rng.standard_normal(n), 900, 6000) * np.exp(-t / 0.0035) * 0.95
    grit = bp(rng.standard_normal(n), 2500, 9000) * np.exp(-t / 0.012) * 0.12
    x = thump + ring + smack + grit
    return x / np.max(np.abs(x))


def scuff(hard=False):
    """Rubber on asphalt: a short grainy brush, a quick chirp when it's a hard cut on a painted line."""
    dur = rng.uniform(0.06, 0.12) * (1.6 if hard else 1); n = int(dur * SR); t = np.arange(n) / SR
    e = np.minimum(t / 0.006, 1) * np.exp(-t / (dur * 0.35))
    x = bp(rng.standard_normal(n), 600, 5000) * e * (0.7 + 0.3 * np.abs(lp(rng.standard_normal(n), 120)) * 3)
    if hard and rng.random() < 0.6:
        f0 = rng.uniform(1500, 2300); ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.15 * t / dur)) / SR
        x += np.sin(ph) * np.minimum(t / 0.01, 1) * np.exp(-t / 0.03) * 0.35
    return x / np.max(np.abs(x))


def slap():
    n = int(0.2 * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 700, 3800) * np.exp(-t / 0.012) + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.02) * 0.6
    return x / np.max(np.abs(x))


def whff():
    n = int(0.22 * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 380, 1700) * (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.045)
    return x / np.max(np.abs(x))


def swish():
    """A nylon net: the ball zipping through, a soft snap of the cords."""
    n = int(0.6 * SR); t = np.arange(n) / SR
    fl = np.clip(0.7 + 0.3 * np.abs(lp(rng.standard_normal(n), 40, 1)) * 4, 0, 1.4)
    x = bp(rng.standard_normal(n), 1800, 9000) * (1 - np.exp(-t / 0.012)) * np.exp(-t / 0.11) * fl
    x += bp(rng.standard_normal(n), 400, 1200) * np.exp(-t / 0.04) * 0.25
    return x / np.max(np.abs(x))


def steel_board():
    """Off a painted steel backboard: a dull bang and the plate's metallic ring, then the rim's tick as it drops."""
    n = int(0.8 * SR); t = np.arange(n) / SR
    bang = np.sin(2 * np.pi * 160 * t) * np.exp(-t / 0.03) + 0.6 * bp(rng.standard_normal(n), 300, 3000) * np.exp(-t / 0.006)
    ring = sum(a * np.sin(2 * np.pi * f * t + p) * np.exp(-t / d) for f, a, d, p in
               [(347, 0.5, 0.25, 0.0), (781, 0.35, 0.18, 1.3), (1263, 0.25, 0.12, 0.5), (1910, 0.16, 0.08, 2.2), (2770, 0.1, 0.05, 0.9)])
    x = bang + ring
    return x / np.max(np.abs(x))


def chirp():
    """A sparrow far off: two or three quick down-sweeps."""
    k = rng.integers(2, 4); parts = []
    for _ in range(k):
        dur = rng.uniform(0.05, 0.09); n = int(dur * SR); t = np.arange(n) / SR
        f0 = rng.uniform(4200, 5600); f = f0 - rng.uniform(800, 1600) * t / dur
        parts.append(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2)
        parts.append(np.zeros(int(rng.uniform(0.03, 0.08) * SR)))
    x = np.concatenate(parts)
    return x / np.max(np.abs(x))


L = N + int(1.0 * SR)
mix = np.zeros((2, L))
t_all = np.arange(L) / SR
# the city: traffic rumble (brown noise under 200 Hz, swelling slowly), a hiss of wind in the twigs
rum = lp(np.cumsum(rng.standard_normal(L)) * 0.02, 180); rum /= np.sqrt(np.mean(rum ** 2)) + 1e-9
rum *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t_all + 1.3)
wind = bp(rng.standard_normal(L), 900, 7000) * (0.6 + 0.4 * np.clip(lp(rng.standard_normal(L), 0.4, 1) * 40, -1, 1) ** 2)
bed = rum * db(-36) + wind * db(-55)
mix[0] += bed; mix[1] += np.roll(bed, 977) * 0.97
# cars going by on the far street: a broadband swell that pans across over a few seconds
for k in range(int(DUR / 4.5) + 2):
    t0 = rng.uniform(-2, DUR); dur = rng.uniform(3.5, 6.0); n = int(dur * SR); t = np.arange(n) / SR
    car = lp(bp(rng.standard_normal(n), 120, 2400), 1500) * np.sin(np.pi * t / dur) ** 3
    i = int(t0 * SR); a, b = max(0, i), min(L, i + n)
    if b <= a: continue
    seg = car[a - i:b - i]; pan = np.linspace(-0.8, 0.8, n)[a - i:b - i] * (1 if rng.random() < 0.5 else -1)
    g = db(rng.uniform(-44, -38))
    mix[0, a:b] += seg * g * np.cos((pan + 1) * np.pi / 4) * 1.41; mix[1, a:b] += seg * g * np.sin((pan + 1) * np.pi / 4) * 1.41
# sparrows in the trees now and then
t = rng.uniform(0.3, 2.0)
while t < DUR:
    place(mix, lp(chirp(), 7000), t, db(rng.uniform(-46, -38)), pan=rng.uniform(-0.8, 0.8)); t += rng.uniform(1.5, 4.5)

for b in ev['bounces']:
    place(mix, verb(bounce(rng.uniform(0.96, 1.05)), 0.5), b['t'] - 0.002, db(-8) * b.get('gain', 1), pan=rng.uniform(-0.12, 0.12))
for s in ev.get('steps', []):
    place(mix, verb(scuff(False), 0.3), s['t'], db(-31) * s.get('gain', 1), pan=s.get('pan', 0) + rng.uniform(-0.1, 0.1))
for s in ev['squeaks']:
    place(mix, verb(scuff(True), 0.35), s['t'], db(-23) * s.get('gain', 1), pan=rng.uniform(-0.3, 0.3))
for c in ev['catches']:
    place(mix, verb(slap(), 0.35), c['t'], db(-15) * c.get('gain', 1))
for c in ev['releases']:
    place(mix, verb(whff(), 0.3), c['t'], db(-23) * c.get('gain', 1))
for s in ev['swish']:
    place(mix, verb(swish(), 0.4), s['t'], db(-12), pan=-0.05)
for b in ev.get('board', []):
    place(mix, verb(steel_board(), 0.45), b['t'], db(-12), pan=0.05)

mix = mix[:, : int(DUR * SR)]
peak = np.max(np.abs(mix)); mix *= db(-2.0) / (peak + 1e-9)
fi, fo = int(0.35 * SR), int(0.5 * SR)
mix[:, :fi] *= np.linspace(0, 1, fi); mix[:, -fo:] *= np.linspace(1, 0, fo)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype(np.int16).tobytes())
print('wrote', OUT, 'peak dBFS', round(20 * np.log10(np.max(np.abs(mix)) + 1e-9), 1), 'rms dBFS', round(20 * np.log10(np.sqrt(np.mean(mix ** 2))), 1))
