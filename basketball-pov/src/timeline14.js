// v14 street court at 30 fps: three possessions back to back, each one take from the first dribble to a beat after
// the ball goes through - no titles, no slow motion, no freezes; a short fade in and out.
export const FPS = 30;
export const SEQ = [
  { rep: 'cook', cam: 'take', from: 0.0, to: '@end', rate: 1 },
  { rep: 'pullup', cam: 'take', from: 0.0, to: '@end', rate: 1 },
  { rep: 'stepback', cam: 'take', from: 0.0, to: '@end', rate: 1 },
];

export function buildTimeMap(reps, fps = FPS) {
  for (const s of SEQ) for (const k of ['from', 'to']) if (typeof s[k] === 'string') {
    const P = reps[s.rep].plan;
    s[k] = { '@end': Math.min(P.simEnd, P.rim + 1.0) }[s[k]];
  }
  const frames = []; let vt = 0;
  SEQ.forEach((s, k) => {
    const n = Math.round((s.to - s.from) / s.rate * fps);
    for (let i = 0; i < n; i++) frames.push({ seg: k, rep: s.rep, cam: s.cam, st: s.from + (i / n) * (s.to - s.from), vt: vt + i / fps, rate: s.rate, su: i / n });
    vt += n / fps;
  });
  return frames;
}
