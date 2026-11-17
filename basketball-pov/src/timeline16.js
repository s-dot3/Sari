// v16 "No Open Looks" at 30 fps: title card, the possessions (live into the action from the coaches' angle, a freeze
// with the diagram drawn on the floor, slow motion through the defence's answer, then the shot from down on the floor
// - the swing round behind the shooter riding the ball off the rim in one shot), outro. Symbolic times ('@screen')
// are measured moments of each possession, resolved once the reps are built; {rep.key} in a caption is a measured
// number.
export const FPS = 30;
export const REP_TITLES = {
  switch: '1 · SWITCH IT',
  pindown: '2 · KILL THE PIN-DOWN',
  backdoor: '3 · NO BACKDOOR',
  scram: '4 · SCRAM THE MISMATCH',
};
export const SEQ = [
  { card: 'intro', rep: 'switch', cam: 'film', freeze: 0.1, dur: 3.8 },

  { rep: 'switch', cam: 'film', from: 0.0, to: '@switch', rate: 0.8, caption: 'Ball screen coming.<br>Big is <b>up at the level</b>, not back in the paint.' },
  { rep: 'switch', cam: 'film', freeze: '@switch', dur: 3.3, caption: '<b>"SWITCH!"</b> Call it early.<br>Big takes the ball, guard takes the roller.' },
  { rep: 'switch', cam: 'film', from: '@switch', to: '@pre', rate: 0.55, caption: 'No gap: <b>wall him up.</b><br>Guard fronts the roll: no lob, no pocket pass.' },
  { rep: 'switch', cam: 'shot', from: '@pre', to: '@shot', rate: 0.5, caption: 'Nothing at the rim, <b>so he settles.</b>' },
  { rep: 'switch', cam: 'shot', from: '@shot', to: '@miss', rate: 0.8 },
  { rep: 'switch', cam: 'shot', freeze: '@miss', dur: 2.3, caption: 'Long two over length,<br>contested at {switch.sep} ft. <b>Miss.</b>' },

  { rep: 'pindown', cam: 'film', from: 0.0, to: '@switch', rate: 0.8, caption: 'Pin-down for the shooter.<br><b>The screener\'s man goes down with him.</b>' },
  { rep: 'pindown', cam: 'film', freeze: '@switch', dur: 3.5, caption: 'Switch it on the high side:<br><b>beat him to the spot.</b> Shooter\'s man takes the big.' },
  { rep: 'pindown', cam: 'film', from: '@switch', to: '@catch', rate: 0.6, caption: 'He comes off it <b>looking for a three...</b>' },
  { rep: 'pindown', cam: 'film', freeze: '@catch', dur: 1.9, caption: '...and catches it with <b>a hand in his face.</b><br>No three.' },
  { rep: 'pindown', cam: 'film', from: '@catch', to: '@pre', rate: 0.7, caption: 'Run him off the line. <b>He has to put it down.</b>' },
  { rep: 'pindown', cam: 'shot', from: '@pre', to: '@shot', rate: 0.5, caption: 'One dribble <b>into a long two.</b>' },
  { rep: 'pindown', cam: 'shot', from: '@shot', to: '@miss', rate: 0.8 },
  { rep: 'pindown', cam: 'shot', freeze: '@miss', dur: 2.3, caption: 'Contested at {pindown.sep} ft. <b>Miss.</b><br>The play they drew up: gone.' },

  { rep: 'backdoor', cam: 'film', from: 0.0, to: '@cut', rate: 0.8, caption: 'Wing is denied:<br><b>hand and foot in the passing lane.</b>' },
  { rep: 'backdoor', cam: 'film', freeze: '@cut', dur: 3.3, caption: 'He goes backdoor. <b>Open to the ball<br>and run with him</b> - you have the shorter way.' },
  { rep: 'backdoor', cam: 'film', from: '@cut', to: '@dead', rate: 0.6, caption: 'Beat him to the spot.<br><b>The help is there too.</b>' },
  { rep: 'backdoor', cam: 'film', freeze: '@dead', dur: 2.2, caption: '<b>No pass.</b> The play is dead,<br>and the clock is running out.' },
  { rep: 'backdoor', cam: 'film', from: '@dead', to: '@pre', rate: 0.85, caption: 'Now he has to make something himself.' },
  { rep: 'backdoor', cam: 'shot', from: '@pre', to: '@shot', rate: 0.5, caption: 'Stay in front. <b>Hands up, no foul.</b>' },
  { rep: 'backdoor', cam: 'shot', from: '@shot', to: '@miss', rate: 0.8 },
  { rep: 'backdoor', cam: 'shot', freeze: '@miss', dur: 2.3, caption: 'Late clock, contested at {backdoor.sep} ft.<br><b>Miss.</b>' },

  { rep: 'scram', cam: 'film', from: 0.0, to: '@scram', rate: 0.6, caption: 'After a switch: <b>guard on the big</b> in the post,<br><b>big on the ball.</b> Two mismatches.' },
  { rep: 'scram', cam: 'film', freeze: '@scram', dur: 3.4, caption: '<b>"SCRAM!"</b> Don\'t wait for the entry pass.<br>Weak side runs over and fronts the big...' },
  { rep: 'scram', cam: 'film', from: '@scram', to: '@fixed', rate: 0.6, caption: '...and only then does the guard<br>run out to the wing. <b>Size back on size.</b>' },
  { rep: 'scram', cam: 'film', from: '@fixed', to: '@pre', rate: 0.8, caption: 'Big on the ball: <b>a cushion, chest in front.</b>' },
  { rep: 'scram', cam: 'shot', from: '@pre', to: '@shot', rate: 0.5, caption: 'He settles for a jumper <b>over the length.</b>' },
  { rep: 'scram', cam: 'shot', from: '@shot', to: '@miss', rate: 0.8 },
  { rep: 'scram', cam: 'shot', freeze: '@miss', dur: 2.3, caption: 'Contested at {scram.sep} ft. <b>Miss.</b>' },

  { card: 'outro', rep: 'scram', cam: 'shot', freeze: '@miss', dur: 3.6 },
];

export function buildTimeMap(reps, fps = FPS) {
  for (const s of SEQ) for (const k of ['from', 'to', 'freeze']) if (typeof s[k] === 'string') {
    const P = reps[s.rep].plan, m = s[k].slice(1);
    s[k] = { shot: P.release + 0.12, miss: P.rim + 0.16, pre: P.release - 0.75 }[m] ?? P.marks[m];
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
