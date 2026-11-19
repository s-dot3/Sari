// v20 "Two Moves Max" at 30 fps: title card, the two reads (live into the move, a freeze on his hips, slow motion
// through the answer, the swing round behind the finisher riding the ball in, a freeze on the make), outro. Symbolic
// times ('@read') are measured moments of each rep, resolved once the reps are built; {rep.key} in a caption is a
// measured number.
export const FPS = 30;
export const REP_TITLES = {
  open: 'MOVE 1 · HIPS OPEN',
  square: 'MOVE 1 · HIPS SQUARE → MOVE 2',
};
export const SEQ = [
  { card: 'intro', rep: 'open', cam: 'shot', freeze: 0.1, dur: 4.0 },

  { rep: 'open', cam: 'shot', from: 0.0, to: '@read', rate: 0.7, caption: 'Move 1: <b>the in-and-out.</b><br>Hard dribble out...' },
  { rep: 'open', cam: 'shot', freeze: '@read', dur: 2.8, caption: '...<b>his hips open.</b><br>His weight is going with the drive.' },
  { rep: 'open', cam: 'shot', from: '@read', to: '@shot', rate: 0.4, caption: 'Snatch it back - <b>and rise.</b><br>He guessed your speed wrong.' },
  { rep: 'open', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'open', cam: 'shot', freeze: '@net', dur: 2.7, caption: '{open.window} s of his weight going the wrong way.<br><b>That\'s the window.</b> One move was enough.' },

  { rep: 'square', cam: 'shot', from: 0.0, to: '@read', rate: 0.7, caption: 'Same move. <b>Hard dribble out,</b><br>snatch it back...' },
  { rep: 'square', cam: 'shot', freeze: '@read', dur: 2.6, caption: '...<b>his hips stay square.</b><br>No window - don\'t force the shot.' },
  { rep: 'square', cam: 'shot', from: '@read', to: '@hit', rate: 0.4, caption: 'Move 2: <b>one hard dribble by him.</b><br>Same foot plants, back foot explodes.' },
  { rep: 'square', cam: 'shot', freeze: '@hit', dur: 2.4, caption: '<b>Not around him - into his hip.</b><br>Then past.' },
  { rep: 'square', cam: 'shot', from: '@hit', to: '@finish', rate: 0.5, caption: 'He opened the lane.' },
  { rep: 'square', cam: 'shot', from: '@finish', to: '@shot', rate: 0.45 },
  { rep: 'square', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'square', cam: 'shot', freeze: '@net', dur: 2.6, caption: 'Two moves, either way.<br><b>The third is where possessions die.</b>' },

  { card: 'outro', rep: 'square', cam: 'shot', freeze: '@net', dur: 4.2 },
];

// resolve the measured moments: '@read' (his hips, a beat after the dribble out), '@shot' (just after the release),
// '@net' (the ball through the net), and each rep's own marks
export function buildTimeMap(reps, fps = FPS) {
  for (const s of SEQ) for (const k of ['from', 'to', 'freeze']) if (typeof s[k] === 'string') {
    const P = reps[s.rep].plan, m = s[k].slice(1);
    s[k] = { shot: P.release + 0.12, net: P.rim + 0.32, rel: P.release }[m] ?? P.marks[m];
    if (s[k] === undefined) throw new Error(`no mark ${m} in ${s.rep}`);
  }
  // (the window: how long his weight was going the wrong way before the ball went up)
  for (const rep of Object.values(reps)) if (rep.plan.window) rep.plan.vals = { ...(rep.plan.vals || {}), window: (rep.plan.window.to - rep.plan.window.from).toFixed(1) };
  const frames = []; let vt = 0;
  SEQ.forEach((s, k) => {
    if (s.freeze !== undefined) {
      const n = Math.round(s.dur * fps);
      for (let i = 0; i < n; i++) frames.push({ seg: k, rep: s.rep, cam: s.cam, st: s.freeze, vt: vt + i / fps, freeze: true, fu: i / n, card: s.card, caption: s.caption, rate: 0 });
      vt += n / fps;
    } else {
      const n = Math.round((s.to - s.from) / s.rate * fps);
      for (let i = 0; i < n; i++) frames.push({ seg: k, rep: s.rep, cam: s.cam, st: s.from + (i / n) * (s.to - s.from), vt: vt + i / fps, rate: s.rate, caption: s.caption, su: i / n });
      vt += n / fps;
    }
  });
  return frames;
}
