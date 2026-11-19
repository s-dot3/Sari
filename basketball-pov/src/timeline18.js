// v18 "Unguardable" at 30 fps, v17's cut: title, three isos (live into the move, a freeze on his reaction, slow motion
// through the move and the rise, the camera swinging round behind the shooter to ride the ball in - no cut - and a
// freeze on the make), then the wall drill (the tap at the top, then the same rise with the ball), outro. Symbolic
// times ('@bite') are measured moments of each rep, resolved once the reps are built; {rep.key} in a caption is a
// measured number.
export const FPS = 30;
export const REP_TITLES = {
  behind: '1 · BEHIND THE BACK',
  legs: '2 · BETWEEN THE LEGS',
  spin: '3 · THE SPIN',
  wall: '4 · THE WALL: TIMING',
  rise: '4 · THE WALL: TIMING',
};
export const SEQ = [
  { card: 'intro', rep: 'behind', cam: 'shot', freeze: 0.1, dur: 3.6 },

  { rep: 'behind', cam: 'shot', from: 0.0, to: '@bite', rate: 0.75, caption: 'Right hand. <b>He sits down</b><br>a stride and a half off.' },
  { rep: 'behind', cam: 'shot', freeze: '@bite', dur: 2.6, caption: '<b>Behind the back.</b> He goes with it:<br>his weight is going the wrong way.' },
  { rep: 'behind', cam: 'shot', from: '@bite', to: '@shot', rate: 0.45, caption: '<b>Behind the back again</b> -<br>and straight up into the shot.' },
  { rep: 'behind', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'behind', cam: 'shot', freeze: '@net', dur: 2.2, caption: '{behind.sep} ft of space, from three.<br><b>Splash.</b>' },

  { rep: 'legs', cam: 'shot', from: 0.0, to: '@bite', rate: 0.75, caption: 'Low. <b>Through the legs</b> -<br>he shades the way it went.' },
  { rep: 'legs', cam: 'shot', freeze: '@bite', dur: 2.6, caption: '<b>Back through.</b><br>He\'s still going the other way.' },
  { rep: 'legs', cam: 'shot', from: '@bite', to: '@shot', rate: 0.45, caption: 'Pick it up off the bounce -<br><b>straight up.</b>' },
  { rep: 'legs', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'legs', cam: 'shot', freeze: '@net', dur: 2.2, caption: '{legs.sep} ft. <b>Pull-up three. Cash.</b>' },

  { rep: 'spin', cam: 'shot', from: 0.0, to: '@bite', rate: 0.75, caption: 'Going right. <b>He slides with you.</b>' },
  { rep: 'spin', cam: 'shot', freeze: '@bite', dur: 2.6, caption: '<b>Spin back.</b> He\'s still going right -<br>you\'re past him.' },
  { rep: 'spin', cam: 'shot', from: '@bite', to: '@shot', rate: 0.45, caption: 'Left hand, pick it up, <b>rise.</b>' },
  { rep: 'spin', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'spin', cam: 'shot', freeze: '@net', dur: 2.2, caption: '{spin.sep} ft. <b>He never got there.</b>' },

  { rep: 'wall', cam: 'side', from: 0.0, to: '@off', rate: 0.8, caption: 'The timing. <b>Off hand to the wall,</b><br>ball in the shooting hand: dip, and up...' },
  { rep: 'wall', cam: 'side', from: '@off', to: '@top', rate: 0.3, caption: '...off hand comes off the ball and up...' },
  { rep: 'wall', cam: 'side', freeze: '@top', dur: 2.4, caption: '<b>Off hand taps the wall at the very top</b> -<br>as the ball goes up off the other. That\'s the moment.' },
  { rep: 'wall', cam: 'side', from: '@top', to: '@end', rate: 0.8 },

  { rep: 'rise', cam: 'side', from: 0.0, to: '@off', rate: 0.8, caption: 'Now at the rim. <b>Same dip,<br>same rise.</b>' },
  { rep: 'rise', cam: 'side', from: '@off', to: '@rel', rate: 0.3, caption: 'Ball comes up <b>with your legs</b> -<br>guide hand comes off at the top.' },
  { rep: 'rise', cam: 'side', freeze: '@rel', dur: 2.4, caption: 'And it goes at the top:<br><b>the moment your off hand tapped the wall.</b>' },
  { rep: 'rise', cam: 'side', from: '@rel', to: '@net', rate: 0.8 },
  { rep: 'rise', cam: 'side', freeze: '@net', dur: 2.0, caption: 'Same time, every time.<br><b>Splash.</b>' },

  { card: 'outro', rep: 'rise', cam: 'side', freeze: '@net', dur: 3.4 },
];

// resolve the measured moments: '@bite' (his reaction shows), '@shot' (just after the release), '@net' (the ball
// through the net), '@rel' (the release), and the drill's '@off' (takeoff), '@top' (the top of the jump), '@end'
export function buildTimeMap(reps, fps = FPS) {
  for (const s of SEQ) for (const k of ['from', 'to', 'freeze']) if (typeof s[k] === 'string') {
    const P = reps[s.rep].plan, m = s[k].slice(1);
    s[k] = { shot: P.release + 0.12, net: P.rim + 0.32, rel: P.release, end: P.simEnd - 0.05 }[m] ?? P.marks[m];
    if (s[k] === undefined) throw new Error(`no mark ${m} in ${s.rep}`);
  }
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
