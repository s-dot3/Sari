// v19 "Downhill" at 30 fps: title card, four possessions (live into the move, a freeze on the read, slow motion through
// the move and the finish, the swing round behind the finisher riding the ball in, a freeze on the make), outro.
// Symbolic times ('@hip') are measured moments of each possession, resolved once the reps are built; {rep.key} in a
// caption is a measured number.
export const FPS = 30;
export const REP_TITLES = {
  hip: '1 · HIP TO HIP',
  crowd: '2 · THE CROWD',
  contact: '3 · HIT FIRST',
  kick: '4 · THE KICK',
};
export const SEQ = [
  { card: 'intro', rep: 'hip', cam: 'shot', freeze: 0.1, dur: 3.8 },

  { rep: 'hip', cam: 'shot', from: 0.0, to: '@hip', rate: 0.7, caption: 'Attack his <b>lead foot.</b><br>Low, and go by him close.' },
  { rep: 'hip', cam: 'shot', freeze: '@hip', dur: 2.8, caption: '<b>Hip to hip.</b> Your shoulder is past his hip:<br>he\'s behind you - he can\'t get back in front.' },
  { rep: 'hip', cam: 'shot', from: '@hip', to: '@swipe', rate: 0.45, caption: 'Ball in the <b>outside hand</b> -<br>your body between him and it.' },
  { rep: 'hip', cam: 'shot', freeze: '@swipe', dur: 2.3, caption: 'He reaches from behind.<br><b>Nothing there.</b>' },
  { rep: 'hip', cam: 'shot', from: '@swipe', to: '@finish', rate: 0.5, caption: 'Two steps, eyes on the square.' },
  { rep: 'hip', cam: 'shot', from: '@finish', to: '@shot', rate: 0.4, caption: '<b>Off the glass</b> with the hand away from him.' },
  { rep: 'hip', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'hip', cam: 'shot', freeze: '@net', dur: 2.0, caption: 'Closest his hand got: {hip.close} ft.<br><b>Two.</b>' },

  { rep: 'crowd', cam: 'shot', from: 0.0, to: '@help', rate: 0.75, caption: 'Downhill - and <b>the big steps up</b><br>to meet you at the rim.' },
  { rep: 'crowd', cam: 'shot', freeze: '@help', dur: 2.6, caption: 'Don\'t jump into his hands.<br><b>Spin away from him</b> - the ball goes with you.' },
  { rep: 'crowd', cam: 'shot', from: '@help', to: '@jump', rate: 0.45, caption: 'The ball comes up in the spin...' },
  { rep: 'crowd', cam: 'shot', freeze: '@jump', dur: 2.4, caption: '...<b>and he jumps at it.</b> He\'s in the air:<br>he can\'t block again till he lands.' },
  { rep: 'crowd', cam: 'shot', from: '@jump', to: '@up', rate: 0.4, caption: 'Gather on <b>two feet.</b><br>Let him come down.' },
  { rep: 'crowd', cam: 'shot', from: '@up', to: '@shot', rate: 0.4, caption: 'Up as he lands - <b>left hand,</b><br>the far side of the rim from him.' },
  { rep: 'crowd', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'crowd', cam: 'shot', freeze: '@net', dur: 2.0, caption: 'Crowded rim. <b>Never blocked.</b>' },

  { rep: 'contact', cam: 'shot', from: 0.0, to: '@set', rate: 0.75, caption: 'Drive - and the help<br><b>gets there first.</b>' },
  { rep: 'contact', cam: 'shot', freeze: '@set', dur: 2.6, caption: '<b>He\'s set:</b> feet down, square.<br>No way round him - and don\'t fade away.' },
  { rep: 'contact', cam: 'shot', from: '@set', to: '@hit', rate: 0.4, caption: '<b>Hit first.</b> Shoulder into his chest<br>before he can hit your arms.' },
  { rep: 'contact', cam: 'shot', freeze: '@hit', dur: 2.4, caption: 'Two feet, <b>ball high and tight</b> -<br>he can\'t get to it without fouling.' },
  { rep: 'contact', cam: 'shot', from: '@hit', to: '@shot', rate: 0.45, caption: 'Absorb it, stay square,<br><b>finish up through it.</b>' },
  { rep: 'contact', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'contact', cam: 'shot', freeze: '@net', dur: 1.9, caption: '<b>And-one.</b>' },

  { rep: 'kick', cam: 'film', from: 0.0, to: '@commit', rate: 0.75, caption: 'Downhill. <b>Watch the shooter\'s man.</b>' },
  { rep: 'kick', cam: 'film', freeze: '@commit', dur: 2.9, caption: '<b>Second foot in the paint:</b> he\'s committed.<br>Jump stop - no charge, no travel, both pivots.' },
  { rep: 'kick', cam: 'film', from: '@commit', to: '@pass', rate: 0.45, caption: 'Eyes on the rim - then <b>behind him,</b><br>two hands, on a line.' },
  { rep: 'kick', cam: 'film', freeze: '@pass', dur: 2.3, caption: 'Went by {kick.lane} ft from his hands.<br><b>No tip, no steal.</b>' },
  { rep: 'kick', cam: 'film', from: '@pass', to: '@catch', rate: 0.6, caption: 'Into the <b>shooting pocket</b> - caught ready.' },
  { rep: 'kick', cam: 'shot', from: '@catch', to: '@shot', rate: 0.5, caption: 'He has to run all the way back out.' },
  { rep: 'kick', cam: 'shot', from: '@shot', to: '@net', rate: 0.8 },
  { rep: 'kick', cam: 'shot', freeze: '@net', dur: 2.2, caption: 'Drive, draw two, kick.<br><b>No turnover.</b>' },

  { card: 'outro', rep: 'kick', cam: 'shot', freeze: '@net', dur: 3.6 },
];

export function buildTimeMap(reps, fps = FPS) {
  for (const s of SEQ) for (const k of ['from', 'to', 'freeze']) if (typeof s[k] === 'string') {
    const P = reps[s.rep].plan, m = s[k].slice(1);
    s[k] = { shot: P.release + 0.12, net: P.rim + 0.32, pre: P.release - 0.75 }[m] ?? P.marks[m];
    if (s[k] === undefined) throw new Error(`no mark ${m} in ${s.rep}`);
  }
  const frames = []; let vt = 0;
  SEQ.forEach((s, k) => {
    if (s.freeze !== undefined) {
      const n = Math.round(s.dur * fps);
      for (let i = 0; i < n; i++) frames.push({ seg: k, rep: s.rep, cam: s.cam, st: s.freeze, vt: vt + i / fps, freeze: true, fu: i / n, fdur: s.dur, card: s.card, caption: s.caption, rate: 0 });
      vt += n / fps;
    } else {
      const n = Math.round((s.to - s.from) / s.rate * fps);
      for (let i = 0; i < n; i++) frames.push({ seg: k, rep: s.rep, cam: s.cam, st: s.from + (i / n) * (s.to - s.from), vt: vt + i / fps, rate: s.rate, caption: s.caption, su: i / n });
      vt += n / fps;
    }
  });
  return frames;
}
