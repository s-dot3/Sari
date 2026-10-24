// v13 "game speed" at 30 fps: a title, then the four plays back to back at full speed - each one take from the first
// dribble to the net, no freezes and no slow motion - and an outro. '@end' is a beat after the ball goes through.
export const FPS = 30;
export const REP_TITLES = { crossdrive: 'CROSSOVER · DRIVE · LAYUP', spin: 'SPIN · PULL-UP', stepback3: 'THROUGH THE LEGS · STEP-BACK THREE', doublecross: 'DOUBLE CROSS · PULL-UP' };
export const SEQ = [
  { card: 'intro', rep: 'crossdrive', cam: 'take', freeze: 0.02, dur: 2.0 },
  { rep: 'crossdrive', cam: 'take', from: 0.0, to: '@end', rate: 1 },
  { rep: 'spin', cam: 'take', from: 0.0, to: '@end', rate: 1 },
  { rep: 'stepback3', cam: 'take', from: 0.0, to: '@end', rate: 1 },
  { rep: 'doublecross', cam: 'take', from: 0.0, to: '@end', rate: 1 },
  { card: 'outro', rep: 'doublecross', cam: 'take', freeze: '@end', dur: 2.6 },
];

export function buildTimeMap(reps, fps = FPS) {
  for (const s of SEQ) for (const k of ['from', 'to', 'freeze']) if (typeof s[k] === 'string') {
    const P = reps[s.rep].plan;
    s[k] = { '@end': Math.min(P.simEnd, P.rim + 0.85) }[s[k]];
  }
  const frames = []; let vt = 0;
  SEQ.forEach((s, k) => {
    if (s.freeze !== undefined) {
      const n = Math.round(s.dur * fps);
      for (let i = 0; i < n; i++) frames.push({ seg: k, rep: s.rep, cam: s.cam, st: s.freeze, vt: vt + i / fps, freeze: true, fu: i / n, card: s.card, rate: 0 });
      vt += n / fps;
    } else {
      const n = Math.round((s.to - s.from) / s.rate * fps);
      for (let i = 0; i < n; i++) frames.push({ seg: k, rep: s.rep, cam: s.cam, st: s.from + (i / n) * (s.to - s.from), vt: vt + i / fps, rate: s.rate, su: i / n });
      vt += n / fps;
    }
  });
  return frames;
}
