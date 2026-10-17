"""Sound for the v14 clip "Under the El" (48 kHz stereo WAV): a city park court beside an elevated subway line, and
nobody talking.

The bed is the street - traffic under the el, a car going by now and then, wind in the plane trees, the odd sparrow;
during the first possession a train comes over on the el (a low rumble building, the wheels clacking over the rail
joints, the steel structure ringing, then away). On top: every dribble on the court (a hard, dry smack with the ball's
ring and a slap-back off the walk-ups across the street), the sneakers (soft scuffs on every step, harder ones on every
cut), the catch, the release, the steel backboard on the layup, the chain net's jingle, and the ball bouncing away
after it. No crowd voices, no music, no edit swooshes: three phone takes cut together.
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
    """Open air in a street canyon: nothing at first, a short metallic flutter off the el's steel (60-90 ms), a
    slap-back off the walk-ups across the street (~150 ms), a weaker one off the far side, and a thin, dark tail."""
    n = int(length * SR); t = np.arange(n) / SR
    ir = np.zeros(n); ir[0] = 1.0
    ir += lp(rng.standard_normal(n), 3200) * np.exp(-t / 0.2) * 0.05 * np.clip((t - 0.03) / 0.05, 0, 1)
    for d, g, f in [(0.062, 0.08, 5000), (0.088, 0.06, 4500), (0.15, 0.2, 2800), (0.235, 0.09, 1900), (0.37, 0.04, 1400)]:
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
    """Through a chain net: the links jingling - a shower of small bright metal clinks dying away over half a second."""
    n = int(0.7 * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for _ in range(70):
        t0 = rng.uniform(0, 0.25) ** 1.3; k = int(t0 * SR); m = int(0.06 * SR); tt = np.arange(m) / SR
        f = rng.uniform(2600, 7800); a = np.exp(-t0 / 0.18) * rng.uniform(0.3, 1.0)
        c = np.sin(2 * np.pi * f * tt + rng.uniform(0, 6.3)) * np.exp(-tt / rng.uniform(0.006, 0.02))
        x[k:k + m] += c[: max(0, min(m, n - k))] * a
    x += bp(rng.standard_normal(n), 3000, 10000) * np.exp(-t / 0.08) * 0.15
    return x / np.max(np.abs(x))


def train(dur, speed):
    """An el train going by overhead: a deep rumble and the structure's resonance building as it comes, the wheels
    clacking over the rail joints (two axles per truck, two trucks per car), a steel ring, then going away."""
    n = int(dur * SR); t = np.arange(n) / SR
    rum = lp(np.cumsum(rng.standard_normal(n)) * 0.02, 140, 2); rum /= np.sqrt(np.mean(rum ** 2)) + 1e-9
    body = bp(rng.standard_normal(n), 120, 900); body /= np.sqrt(np.mean(body ** 2)) + 1e-9
    ring = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in [(212, 0.5, 0.3), (437, 0.35, 1.2), (911, 0.2, 2.0), (1530, 0.12, 0.7)]) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * t))
    clack = np.zeros(n); joint = 13.0  # a rail joint every 13 m: clacks as each axle crosses it
    for car in range(5):
        for off in [1.6, 3.6, 11.6, 13.6]:
            x0 = car * 15.6 + off
            for j in range(-8, 30):
                tc = (j * joint + x0) / speed
                k = int((tc + dur * 0.15) * SR)
                if 0 <= k < n - 2400:
                    m = 2400; tt = np.arange(m) / SR
                    clack[k:k + m] += (np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.012) + bp(rng.standard_normal(m), 600, 3000) * np.exp(-tt / 0.004) * 0.6)
    clack /= np.max(np.abs(clack)) + 1e-9
    x = rum * 0.9 + body * 0.35 + ring * 0.12 + clack * 0.55
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
    g = db(rng.uniform(-40, -34))
    mix[0, a:b] += seg * g * np.cos((pan + 1) * np.pi / 4) * 1.41; mix[1, a:b] += seg * g * np.sin((pan + 1) * np.pi / 4) * 1.41
# sparrows in the trees now and then
t = rng.uniform(0.3, 2.0)
while t < DUR:
    place(mix, lp(chirp(), 7000), t, db(rng.uniform(-46, -38)), pan=rng.uniform(-0.8, 0.8)); t += rng.uniform(1.5, 4.5)

for tr in ev.get('trains', []):
    # loudest with the middle of the train over the court; it comes from the left and goes off right; cut at the edit
    dur = 14.0; x = train(dur, tr.get('speed', 18)); tt = np.arange(len(x)) / SR - dur / 2
    env = np.exp(-(tt / 3.2) ** 2) * 0.85 + 0.15 * np.exp(-(tt / 7) ** 2)
    i0 = int((tr['t'] - dur / 2) * SR); a, b = max(i0, int(tr['t0'] * SR)), min(i0 + len(x), int(tr['t1'] * SR), mix.shape[1])
    if b > a:
        seg = (x * env)[a - i0:b - i0].copy(); f = min(len(seg), int(0.04 * SR)); seg[-f:] *= np.linspace(1, 0, f)
        pan = np.clip(tt[a - i0:b - i0] / 4.0, -0.9, 0.9); g = db(-13)
        mix[0, a:b] += seg * g * np.cos((pan + 1) * np.pi / 4) * 1.41; mix[1, a:b] += seg * g * np.sin((pan + 1) * np.pi / 4) * 1.41
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
