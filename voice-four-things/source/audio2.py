import json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly
SR = 48000
TL = json.load(open('timeline.json'))
TOTAL = TL['total']; N = int(np.ceil(TOTAL * SR)) + SR // 10
rng = np.random.default_rng(3)
def norm(w): return ''.join(ch for ch in w.lower() if ch.isalnum() or ch == "'")
def W(ci, w, n=0):
    c = TL['clips'][ci - 1]; k = 0
    for x in c['words']:
        if norm(x['w']) == norm(w):
            if k == n: return c['start'] + x['t0'], c['start'] + x['t1']
            k += 1
    raise KeyError((ci, w, n))
CS = [c['start'] for c in TL['clips']]
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR
def add(buf, x, t0, g=1.0):
    i = int(round(t0 * SR));
    if i < 0: x = x[-i:]; i = 0
    if i >= len(buf): return
    j = min(len(buf), i + len(x)); buf[i:j] += x[:j - i] * g
def mtof(m): return 440 * 2 ** ((m - 69) / 12)

# ---------------- instruments ----------------
def ep(f, d, v=1.):
    t = tt(d); env = np.exp(-t * 2.0) * (1 - np.exp(-t * 300))
    s = np.sin(2*np.pi*f*t) + .32*np.sin(2*np.pi*2*f*t)*np.exp(-t*3) + .1*np.sin(2*np.pi*3*f*t)*np.exp(-t*6) + .06*np.sin(2*np.pi*14.1*f*t)*np.exp(-t*30)
    return s * env * (1 + .12*np.sin(2*np.pi*4.3*t)) * v
def bass(f, d, v=1.):
    t = tt(d); env = (1 - np.exp(-t * 120)) * np.exp(-t * 1.6); rel = np.clip((d - t) / .05, 0, 1)
    return np.tanh(1.6 * np.sin(2*np.pi*f*t)) * env * rel * v
def kick(v=1.):
    t = tt(.45); f = 44 + 100*np.exp(-t*32); ph = 2*np.pi*np.cumsum(f)/SR
    return (np.sin(ph) * np.exp(-t*7.5) + .3*rng.standard_normal(len(t))*np.exp(-t*400)) * v
def snare(v=1.):
    t = tt(.3); n = bp(rng.standard_normal(len(t)), 1200, 7000) * np.exp(-t*17)
    return (n * .9 + .5*np.sin(2*np.pi*185*t)*np.exp(-t*22)) * v
def hat(v=1.):
    t = tt(.07); return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t*70) * v
CH = [(45, [55, 60, 64, 71]), (41, [57, 60, 64, 67]), (48, [64, 67, 71, 74]), (40, [55, 59, 62, 64])]
BPM = 88; BEAT = 60 / BPM; BAR = 4 * BEAT
def music_section(buf_ch, buf_dr, buf_bs, t0, t1, origin, drums=True, chord0=0):
    nb0 = int(np.floor((t0 - origin) / BAR)); nb1 = int(np.ceil((t1 - origin) / BAR))
    for b in range(nb0, nb1):
        bt = origin + b * BAR; root, voic = CH[(b + chord0) % 4]
        for k, m in enumerate(voic):
            for hit, vel, dd in [(0, .9, BAR * .95), (2.5 * BEAT, .45, BEAT * 1.4)]:
                st = bt + hit + k * .014
                if t0 - .01 <= st < t1: add(buf_ch, ep(mtof(m), min(dd, t1 - st + .3)), st, vel * .22)
        for hit, dd, vel in [(0, BEAT * 1.6, 1), (2.5 * BEAT, BEAT * .9, .8), (3.5 * BEAT, BEAT * .45, .55)]:
            st = bt + hit
            if t0 - .01 <= st < t1: add(buf_bs, bass(mtof(root), min(dd, t1 - st)), st, vel * .5)
        if drums:
            for s16 in range(16):
                st = bt + s16 * BEAT / 4 + (.07 * BEAT if s16 % 4 == 2 else 0)
                if not (t0 - .01 <= st < t1): continue
                if s16 in (0, 8): add(buf_dr, kick(), st, .9)
                if s16 == 11: add(buf_dr, kick(), st, .5)
                if s16 in (4, 12): add(buf_dr, snare(), st, .45)
                if s16 % 2 == 0: add(buf_dr, hat(), st, .16 if s16 % 4 == 0 else .1)

# ---------------- sfx ----------------
def whoosh(d=.42, f0=500, f1=3500, v=1.):
    t = tt(d); n = rng.standard_normal(len(t)); out = np.zeros_like(n); seg = 480
    for i in range(0, len(n), seg):
        u = i / len(n); fc = f0 * (f1 / f0) ** (np.sin(np.pi * u))
        out[i:i + seg] = bp(n[max(0, i - 2000):i + seg], fc * .7, min(fc * 1.4, 20000))[-len(n[i:i + seg]):]
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return out * env * v
def pop(f=900, v=1.):
    t = tt(.12); f_t = f * (1 - .45 * (1 - np.exp(-t * 40))); ph = 2*np.pi*np.cumsum(f_t)/SR
    return np.sin(ph) * np.exp(-t * 38) * v
def crack(v=1.):
    t = tt(.35); n = rng.standard_normal(len(t)); imp = np.zeros_like(n)
    for k in range(9): i = int(rng.uniform(0, .18) * SR); imp[i:i + 60] += rng.uniform(.4, 1)
    c = bp(n * imp, 1500, 9000) * 3 + bp(n, 200, 1200) * np.exp(-t * 30) * .6
    return c * np.exp(-t * 9) * v
def boom(d=1.2, v=1.):
    t = tt(d); f = 30 + 70 * np.exp(-t * 9); ph = 2*np.pi*np.cumsum(f)/SR
    return (np.tanh(2.2 * np.sin(ph)) * np.exp(-t * 3.2) + lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 14) * .9) * v
def crumble(d=.9, v=1.):
    t = tt(d); n = rng.standard_normal(len(t)); g = np.zeros_like(n)
    for k in range(70): i = int(rng.uniform(0, d * .9) * SR); L = int(rng.uniform(.004, .02) * SR); g[i:i + L] += rng.uniform(.2, 1) * np.hanning(len(g[i:i + L]))
    return bp(n * g, 600, 6000) * np.exp(-t * 3) * v
def shimmer(base=72, v=1.):
    out = np.zeros(int(1.6 * SR))
    for k, m in enumerate([0, 4, 7, 12, 16, 19]):
        t = tt(1.6 - k * .06); s = (np.sin(2*np.pi*mtof(base + m)*t) + .3*np.sin(2*np.pi*2*mtof(base + m)*t)) * np.exp(-t * 3.5) * (1 - np.exp(-t * 400))
        i = int(k * .06 * SR); out[i:i + len(s)] += s * .5
    return out * v
def sweep(d=.6, f0=300, f1=1600, v=1.):
    t = tt(d); f = f0 * (f1 / f0) ** (t / d); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph) * (1 + .5 * np.sin(2*np.pi*18*t)) * np.sin(np.pi * t / d) * v
def bell(f=988, v=1.):
    t = tt(1.0); return (np.sin(2*np.pi*f*t) + .5*np.sin(2*np.pi*2.01*f*t)*np.exp(-t*4) + .2*np.sin(2*np.pi*3.98*f*t)*np.exp(-t*7)) * np.exp(-t * 3.2) * (1 - np.exp(-t * 600)) * v
def click(v=1.):
    t = tt(.05); return hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 160) * v + np.sin(2*np.pi*1800*t) * np.exp(-t * 120) * v * .5
def buzz(d=.32, v=1.):
    t = tt(d); s = np.sign(np.sin(2*np.pi*98*t)) * .6 + np.sign(np.sin(2*np.pi*103*t)) * .4
    return lp(s, 2200) * np.clip(np.minimum(t / .01, (d - t) / .05), 0, 1) * v
def ding(v=1.): return bell(1046.5, .7) + bell(1568, .5) * 0
def riser(d, v=1.):
    t = tt(d); n = bp(rng.standard_normal(len(t)), 800, 6000); f = 200 * (8) ** (t / d); ph = 2*np.pi*np.cumsum(f)/SR
    return (n * .5 + np.sin(ph) * .35) * (t / d) ** 2 * v
def beep(f=1000, d=.09, v=1.):
    t = tt(d); return np.sin(2*np.pi*f*t) * np.clip(np.minimum(t / .005, (d - t) / .01), 0, 1) * v
def tick(v=1.):
    t = tt(.03); return np.sin(2*np.pi*3000*t) * np.exp(-t * 200) * v

ch = np.zeros(N); dr = np.zeros(N); bs = np.zeros(N); fx = np.zeros(N)
def buzz110(d=.5, v=1.):
    t = tt(d); s = sum(np.sin(2*np.pi*110*k*t) / k for k in range(1, 14))
    return lp(s, 1800) * np.clip(np.minimum(t / .03, (d - t) / .08), 0, 1) * v
def breath_in(d=1.4, v=1.):
    t = tt(d); n = bp(rng.standard_normal(len(t)), 500, 4500)
    return n * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5 * v
def air(d=.7, v=1.):
    t = tt(d); return hp(rng.standard_normal(len(t)), 2500) * np.sin(np.pi * t / d) * v
def chord(notes, d=1.6, v=1.):
    out = np.zeros(int(d * SR))
    for m in notes: out += bell(mtof(m), 1.)[:len(out)] if False else np.pad(bell(mtof(m)), (0, max(0, len(out) - int(SR))))[:len(out)]
    return out * v
T_DROP = CS[1]
t_pause0 = W(5, 'before')[1]; t_big = W(5, 'the', 2)[0]
intro_ch = np.zeros(N)
music_section(intro_ch, dr, bs, 0, T_DROP, T_DROP, drums=False, chord0=0)
music_section(ch, dr, bs, T_DROP, t_pause0, T_DROP, drums=True, chord0=0)
music_section(ch, dr, bs, t_big, TOTAL + .2, t_big, drums=True, chord0=0)
intro_ch = lp(intro_ch, 900, 2) * 1.5
ch = lp(ch, 5200, 2); dr = lp(np.tanh(dr * 1.4), 9000, 2)
bs[:int(T_DROP * SR)] = 0
music = intro_ch + ch + dr * .8 + bs * .9
def gain_env(n):
    g = np.ones(n); i0 = int(t_pause0 * SR); i1 = int(t_big * SR)
    g[i0:i1] = 0; ramp = int(.06 * SR); g[i0 - ramp:i0] = np.linspace(1, 0, ramp)
    fe = int(.6 * SR); g[-fe:] *= np.linspace(1, 0, fe) ** 1.5
    fi = int(.5 * SR); g[:fi] *= np.linspace(0, 1, fi)
    return g
music *= gain_env(N)
for i, c in enumerate(CS[1:], 1): add(fx, whoosh(.38, 400, 3200), c - .2, .35)
for i, c in enumerate(CS): add(fx, pop(820 if i % 2 else 700), c + .06, .2)
# hook + close: the four names
for ci in (1, 6):
    for w, m in zip(['energy', 'resonance', 'tone', 'rhythm'], [72, 76, 79, 84]):
        t0 = W(ci, w)[0]; add(fx, pop(mtof(m)), t0, .2); add(fx, bell(mtof(m + 12)), t0, .07)
add(fx, shimmer(72), W(1, "here's")[0], .16)
add(fx, boom(.8), T_DROP, .45)
# energy
add(fx, breath_in(1.5), W(2, 'diaphragm')[0] - .05, .12)
add(fx, whoosh(.6, 300, 2400), W(2, 'and')[0] - .05, .3)
add(fx, boom(.5), W(2, 'weak')[0], .12)
add(fx, whoosh(.45, 600, 4000), W(2, 'steady')[0] - .05, .35); add(fx, pop(980), W(2, 'steady')[0] + .05, .16)
# resonance
add(fx, buzz110(.55), W(3, 'small')[0], .05)
for w, f in [('throat', 620), ('mouth', 780), ('nose', 940)]: add(fx, pop(f), W(3, w)[0], .2)
add(fx, shimmer(76), W(3, 'speakers')[0], .2); add(fx, boom(.9), W(3, 'speakers')[0], .3)
# tone
add(fx, buzz(.35), W(4, 'pressed')[0], .12)
add(fx, air(.8), W(4, 'breathy')[0] - .05, .12)
add(fx, bell(mtof(72)), W(4, 'clean')[0], .12); add(fx, bell(mtof(76)), W(4, 'clean')[0] + .06, .1); add(fx, bell(mtof(79)), W(4, 'clean')[0] + .12, .1)
# rhythm: soft tick on every word, riser into the pause, boom on "the big one"
for x in TL['clips'][4]['words']: add(fx, tick(), CS[4] + x['t0'], .1)
add(fx, riser(t_big - t_pause0 + .05), t_pause0, .25)
add(fx, boom(1.4), t_big, .7); add(fx, whoosh(.25, 3000, 600), t_big - .02, .4)
# close
add(fx, shimmer(72), W(6, 'together')[0], .16)
add(fx, shimmer(79), W(6, "that's")[0], .24); add(fx, boom(1.0), W(6, "that's")[0], .35)

# ---- VO + ducking
vo24, _ = sf.read('vo_full.wav'); vo = resample_poly(vo24, 2, 1)
vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
vo = vo / (np.max(np.abs(vo)) + 1e-9) * .89
env = np.abs(vo); win = int(.03 * SR)
env = np.convolve(env, np.ones(win) / win, 'same'); act = np.clip(env / .05, 0, 1)
duck = np.zeros(N); a_att, a_rel = np.exp(-1 / (.02 * SR)), np.exp(-1 / (.35 * SR)); y = 0.
for i in range(0, N, 48):
    x = act[i]; y = (a_att if x > y else a_rel) ** 48 * (y - x) + x; duck[i:i + 48] = y
music_vo = music * (1 - .55 * duck)
mix_vo = vo + music_vo * .22 + fx * .8
mix_novo = music * .22 + fx * .8
for name, m in [('mix_vo.wav', mix_vo), ('mix_novo.wav', mix_novo)]:
    m = m[:int(TOTAL * SR)]
    sf.write(name, np.stack([m, m], 1).astype(np.float32), SR, subtype='FLOAT')
sf.write('music_only.wav', np.stack([music, music], 1)[:int(TOTAL * SR)].astype(np.float32) * .3, SR, subtype='FLOAT')
print('ok', TOTAL, 'drop', T_DROP, 'pause', t_pause0, t_big)
