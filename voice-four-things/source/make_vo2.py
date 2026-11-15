import warnings, json, sys; warnings.filterwarnings("ignore")
from kokoro import KPipeline
import soundfile as sf, numpy as np

SR = 24000; FPS = 30; VOICE = 'am_puck'; SPEED = 1.12
# (tts text, pause after) per clip; display text comes from token text with SUBS applied
CLIPS = [
  dict(lead=0.12, tail=0.45, segs=[
    ("Your voice comes down to four things.", 0.2),
    ("Energy.", 0.12), ("Resonance.", 0.12), ("Tone.", 0.12), ("And rhythm.", 0.22),
    ("Here's what each one really is.", 0.0)]),
  dict(lead=0.2, tail=0.4, segs=[
    ("Energy is breath.", 0.18),
    ("Your diaphragm drops, your lungs fill,", 0.08),
    ("and the air coming back up powers every word.", 0.22),
    ("Weak air sounds tired.", 0.16),
    ("Steady air carries.", 0.0)]),
  dict(lead=0.2, tail=0.4, segs=[
    ("Resonance is how that sound gets big.", 0.18),
    ("Your vocal cords only make a small buzz.", 0.16),
    ("Your throat, your mouth, and your nose", 0.06),
    ("are the speakers that make it full.", 0.0)]),
  dict(lead=0.2, tail=0.4, segs=[
    ("Tone is the color.", 0.18),
    ("Squeeze your cords too tight, it comes out pressed.", 0.18),
    ("Leave them loose, it gets breathy.", 0.18),
    ("When they close clean, the tone sounds warm and solid.", 0.0)]),
  dict(lead=0.2, tail=0.4, segs=[
    ("Rhythm is the timing.", 0.2),
    ("Speed up!", 0.14, 1.4),
    ("Slow... down.", 0.2, 0.78),
    ("Hit the words that matter,", 0.1),
    ("and pause right before...", 0.6),
    ("the big one.", 0.22),
    ("That's what makes people listen.", 0.0)]),
  dict(lead=0.2, tail=1.3, segs=[
    ("Energy is the fuel.", 0.1), ("Resonance is the speaker.", 0.1), ("Tone is the color.", 0.1), ("Rhythm is the timing.", 0.22),
    ("Put all four together...", 0.14), ("that's your real voice.", 0.0)]),
]
SUBS = {}
PUNCT = set(".,!?;:…")

p = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')

def synth(text, speed=None):
    audio, toks, off = [], [], 0.0
    for r in p(text, voice=VOICE, speed=speed or SPEED):
        a = r.audio.numpy(); audio.append(a)
        for tk in r.tokens:
            toks.append(dict(text=tk.text, ws=tk.whitespace,
                             t0=None if tk.start_ts is None else tk.start_ts + off,
                             t1=None if tk.end_ts is None else tk.end_ts + off))
        off += len(a) / SR
    return np.concatenate(audio), toks

def fade(a, n=96):
    n = min(n, len(a)//2); w = np.linspace(0, 1, n)
    a[:n] *= w; a[-n:] *= w[::-1]; return a

out = dict(fps=FPS, sr=SR, clips=[])
full, t_clip = [], 0.0
for ci, c in enumerate(CLIPS):
    parts = [np.zeros(int(c['lead'] * SR), np.float32)]; cur = c['lead']; words = []
    for seg in c['segs']:
        text, pause = seg[0], seg[1]
        a, toks = synth(text, seg[2] if len(seg) > 2 else None)
        env = np.convolve(np.abs(a), np.ones(240)/240, 'same'); thr = env.max() * 0.012
        idx = np.where(env > thr)[0]
        s0 = max(0.0, idx[0]/SR - 0.03); s1 = min(len(a)/SR, idx[-1]/SR + 0.07)
        seg = fade(a[int(s0*SR):int(s1*SR)].copy())
        for t in toks:
            if t['t0'] is None: continue
            t0, t1 = max(0, t['t0'] - s0) + cur, min(s1 - s0, t['t1'] - s0) + cur
            if all(ch in PUNCT for ch in t['text']):
                if words: words[-1]['w'] += t['text'].replace('...', '…')
                continue
            words.append(dict(w=SUBS.get(t['text'], t['text']), t0=round(t0, 3), t1=round(t1, 3)))
        parts.append(seg); cur += len(seg)/SR
        parts.append(np.zeros(int(pause*SR), np.float32)); cur += pause
        words[-1]['seg_end'] = True
    parts.append(np.zeros(int(c['tail']*SR), np.float32)); cur += c['tail']
    clip = np.concatenate(parts)
    dur = len(clip) / SR
    # snap clip length to whole frames
    nfr = int(round(dur * FPS)); dur = nfr / FPS
    clip = np.pad(clip, (0, max(0, int(dur*SR) - len(clip))))[:int(dur*SR)]
    sf.write(f'clip{ci+1}.wav', clip, SR)
    full.append(clip)
    out['clips'].append(dict(id=ci+1, start=round(t_clip, 4), dur=round(dur, 4), frames=nfr, words=words))
    print(f"clip {ci+1}: {dur:.2f}s  ", ' '.join(f"{w['w']}@{w['t0']:.2f}" for w in words))
    t_clip += dur
vo = np.concatenate(full); sf.write('vo_full.wav', vo, SR)
# mouth envelope per frame (RMS, smoothed, normalized)
hop = SR // FPS; n = len(vo) // hop
rms = np.array([np.sqrt(np.mean(vo[i*hop:(i+1)*hop]**2)) for i in range(n)])
rms = rms / np.percentile(rms[rms > 1e-4], 95)
env = np.clip(rms, 0, 1.2)
sm = np.copy(env)
for i in range(1, n): sm[i] = max(env[i], sm[i-1]*0.55) if env[i] < sm[i-1] else 0.5*sm[i-1] + 0.5*env[i]
out['mouth'] = [round(float(x), 3) for x in sm]
out['total'] = round(t_clip, 4); out['frames'] = int(round(t_clip * FPS))
json.dump(out, open('timeline.json', 'w'))
print('total', t_clip, 'frames', out['frames'])
