"""The film's timeline, frame by frame: cut.json (the sequence) with marks.json (the moments read off each generated rep)
-> work/timeline.json, which the film page draws and audio.py scores.

  python3 aigen/timeline.py

A sequence entry plays a stretch of a rep ({rep, from, to, rate}: rate 1 is full speed, 0.5 is the slow motion), holds
one frame of it ({rep, freeze, dur}), or a card over a held frame ({card, rep, freeze, dur}). Times are seconds of the
rep's clip, or '@name' for a mark. A caption may hold {rep.name}, a value from marks.json.
"""
import argparse
import json
import os
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
WORKDIR = os.environ.get('AIGEN_WORK', 'work')  # (relative to aigen/, as the page fetches it)
WORK = HERE / WORKDIR


def build(cut_path=HERE / 'cut.json', marks_path=HERE / 'marks.json'):
    cut = json.loads(pathlib.Path(cut_path).read_text())
    marks = json.loads(pathlib.Path(marks_path).read_text())
    reps = {r: json.loads((WORK / r / 'frames.json').read_text()) for r in {s['rep'] for s in cut['seq']}}
    fps = next(iter(reps.values()))['fps']
    assert all(abs(m['fps'] - fps) < 1e-6 for m in reps.values()), 'the reps differ in frame rate'

    def T(rep, v):
        return marks[rep][v[1:]] if isinstance(v, str) else float(v)

    def text(s):
        return s and re.sub(r'\{(\w+)\.(\w+)\}', lambda m: str(marks[m[1]]['vals'][m[2]]), s)

    def src(rep, st, rate):
        M = reps[rep]
        if rate == 0.5:
            return f'{WORKDIR}/{rep}/m_{min(M["n2"] - 1, round(st * 2 * fps)) + 1:05d}.jpg'
        return f'{WORKDIR}/{rep}/o_{min(M["n"] - 1, max(0, round(st * fps))) + 1:05d}.jpg'

    frames, segs, vt = [], [], 0.0
    for k, s in enumerate(cut['seq']):
        rep = s['rep']
        if 'freeze' in s:
            st, n, rate = T(rep, s['freeze']), round(s['dur'] * fps), 0
            sts = [st] * n
        else:
            a, b, rate = T(rep, s['from']), T(rep, s['to']), s.get('rate', 1)
            assert rate in (1, 0.5), 'rates are 1 or 0.5 (every frame once, or every frame of the interpolated clip once)'
            n = round((b - a) / rate * fps)
            sts = [a + i * rate / fps for i in range(n)]
        seg = {'k': k, 'rep': rep, 'vt0': vt, 'vt1': vt + n / fps, 'rate': rate, 'st0': sts[0], 'st1': sts[-1] + rate / fps,
               'card': s.get('card'), 'caption': text(s.get('caption')), 'live': s.get('live', False), 'cap': s.get('cap', 'bottom')}
        segs.append(seg)
        for i, st in enumerate(sts):
            frames.append({'seg': k, 'rep': rep, 'st': round(st, 4), 'vt': round(vt + i / fps, 4), 'src': src(rep, st, rate)})
        vt += n / fps
    tl = {'fps': fps, 'dur': vt, 'titles': cut['titles'], 'kicker': cut.get('kicker', ''), 'cards': cut.get('cards', {}),
          'hits': {r: m['hit'] for r, m in marks.items() if 'hit' in m}, 'segs': segs, 'frames': frames}
    (WORK / 'timeline.json').write_text(json.dumps(tl))
    print(f'{len(frames)} frames, {vt:.2f} s at {fps:g} fps')
    for s in segs:
        what = f'card {s["card"]}' if s['card'] else 'freeze' if s['rate'] == 0 else f'x{s["rate"]:g}'
        print(f'  {s["vt0"]:6.2f}-{s["vt1"]:6.2f}  {s["rep"]:6s} {what:11s} src {s["st0"]:.2f}-{s["st1"]:.2f}  {(s["caption"] or "")[:60]}')
    return tl


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--cut', default=HERE / 'cut.json')
    ap.add_argument('--marks', default=HERE / 'marks.json')
    a = ap.parse_args()
    build(a.cut, a.marks)
