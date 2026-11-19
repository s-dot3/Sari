// v18 "Unguardable", rebuilt on real basketball mocap. The shooter is SkillMimic's BallPlay-M (Wang et al., CVPR 2025:
// optical capture of a player with the ball tracked) - his own dribbles, behind-the-backs, between-the-legs, spin and
// jump shots, with the ball where it really was and his own arms all the way to the release; his man is CMU's
// defensive takes, as before. Every move a real take played at its own speed, and every one a make over his man:
//  1 behind - right hand, then behind the back and behind the back again (bp_back: bounces behind him at 2.23 and
//             2.98), the gather off the second straight into a jump shot (bp_shot_style1); he goes with the first one
//             and the second brings it back the other way
//  2 legs   - through the legs and back through (bp_lleg_style1, low and wide: through at 0.7 and 1.4) and straight
//             up (bp_shot_style2); he shades the way the first one went and is still going when you rise
//  3 spin   - right hand, then the spin (bp_turn 0.8-1.4: the ball carried round in the right hand, off the floor into
//             the left) and up off the left hand (bp_shot_style3); he slides with the drive, the spin goes back
//             behind him
//  4 the wall drill - timing: bp_shot_style1's jump twice: first with no ball, tapping the wall at the very top;
//             then with the ball, letting it go at that same top
// Court: rim at (0,0), offense attacks -z.
import { anchoredTrack, RIM } from './play5.js';
import { Track } from './animator.js';
import { Player, yawTo, simOf, toward } from './moves16.js';

export const CLIPS18 = ['bp_back', 'bp_lleg_style1', 'bp_turn', 'bp_shot_style1', 'bp_shot_style2', 'bp_shot_style3', '78_25', '78_30', '78_28', '78_27', '78_24', '124_05'];
const RT = 0.25; // a reaction time (Singh 2020: 0.225 s visual reaction in basketball players)
// the takes' jump shots (clip s): toe-off, top of the jump (hips highest), release (the ball off the hands), landing
export const SHOTS = {
  bp_shot_style1: { off: 0.68, top: 0.87, rel: 0.975, land: 1.11 },
  bp_shot_style2: { off: 0.56, top: 0.73, rel: 0.842, land: 0.97 },
  bp_shot_style3: { off: 0.74, top: 0.95, rel: 1.025, land: 1.17 },
};
// a shot: picked up from the dribble into the take's own gather, crossfaded (the ball rides along); the little turn
// the performer makes in the air is taken out so he goes up and comes down square
const SHOT = (clip, from, at, extra = {}) => ({ clip, from, at, blend: 0.22, shot: true, unwind: { from: SHOTS[clip].off, to: SHOTS[clip].land, ramp: 0.08 }, ...extra });
const f2 = (p) => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
// a slide across the line between a defender (d) and his man (y), the way his man was going (from p0 to p1), dist m:
// which of the stance's two slides that is, and where it ends
function sideways(d, y, p1, p0, dist) {
  const L = Math.hypot(y.x - d.x, y.z - d.z) || 1, f = { x: (y.x - d.x) / L, z: (y.z - d.z) / L }, lft = { x: f.z, z: -f.x };
  const s = Math.sign((p1.x - p0.x) * lft.x + (p1.z - p0.z) * lft.z) || 1;
  return { way: s > 0 ? 'slideL' : 'slideR', to: { x: d.x + lft.x * s * dist, z: d.z + lft.z * s * dist } };
}
const off = (p, F, fwd, left) => ({ x: p.x + Math.sin(F) * fwd + Math.cos(F) * left, z: p.z + Math.cos(F) * fwd - Math.sin(F) * left });
// after the wrong-way move: he has to stop and re-plant (a beat in his stance), then the closeout - timed so he's
// still coming when the ball goes up (late: s before the release that he gets there), `dist` m off the shooter
function recover(clips, leg, x, you, release, dist, late = 0.03) {
  const tStop = x.lastArrive, yr = you.hip(release);
  const probe = Object.assign(new Player(clips, leg, 'probe'), { segs: x.segs.slice(), log: [] });
  probe.go('runStop', toward(yr, x.hip(tStop), dist), tStop + 0.05, release - late, { rmin: 0.8 });
  const spare = release - late - probe.lastArrive;
  let t0 = tStop + 0.05;
  if (spare > 0.08) { x.hold('guard', tStop, (t) => you.hip(t), { inert: 0.25 }); t0 += spare; }
  x.go('runStop', toward(yr, x.hip(t0), dist), t0, release - late, { rmin: 0.8 });
  return t0;
}
// the ball's way across him at the move: from his right to his left (+1) or back (-1), in the world
const ballSide = (you, t, s) => off(you.hip(t), you.at(t).yaw, 0, s);

export const REPS = {
  // 1 - BEHIND THE BACK. Right hand, then behind the back: he goes with it - and behind the back again, and the
  // gather off it straight into the shot: he's going the wrong way
  behind: {
    simEnd: 4.75,
    plan: { rec: true, shotClip: SHOTS.bp_shot_style1.rel, flight: 1.25, camRef: 1.6, camAngle: 0.8, camSide: 1, camH: 2.3 },
    build(clips, legs) {
      const P = this.plan, log = [];
      const A = { clip: 'bp_back', from: 1.25, at: 0 }, tG = simOf(A, 3.3);
      const B = SHOT('bp_shot_style1', 0.27, tG);
      const release = simOf(B, SHOTS.bp_shot_style1.rel), SPOT = { x: -2.2, z: 7.25 };
      const you = anchoredTrack(clips, [A, B], legs.you, release, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      P.gatherAt = tG;
      const tBTB = simOf(A, 2.2), tBack = simOf(A, 2.97);
      // him: in his stance a stride and a half off, keeping in front (v14's planner) until the behind-the-back; a
      // reaction time after it he goes with it - a hard slide the way the ball went (your right to your left) - and
      // is still going when it comes back behind you the other way; he stops and comes back late
      const x = new Player(clips, legs.d1, 'd1').start('guard', toward(you.hip(0), RIM, 1.6), you.hip(0));
      x.follow((t) => toward(you.hip(t), RIM, 1.55), (t) => you.hip(t), 0.1, tBTB + RT - 0.05, { rt: RT });
      const d0 = x.hip(tBTB + RT), wrong = sideways(d0, you.hip(tBTB + RT), ballSide(you, tBTB, 1), you.hip(tBTB), 1.2);
      x.go(wrong.way, wrong.to, tBTB + RT, tBack + RT, { rmin: 0.8 });
      const tRe = recover(clips, legs.d1, x, you, release, 1.4);
      x.hold('tall', x.lastArrive, (t) => you.hip(t));
      const d1 = x.track();
      P.contest = [{ from: release - 0.12, rise: 0.25, to: release + 0.5, side: 'L', reach: 0.05, late: true }];
      P.marks = { bite: tBTB + RT + 0.15, back: tBack };
      P.labels = [{ t: 0, kind: 'balanced', open: 0 }, { t: tBTB + RT + 0.1, kind: 'lean', open: 1 }, { t: tBack + RT, kind: 'wrong', open: 1 }, { t: tRe + 0.3, kind: 'beat', open: 1 }];
      log.push(`you start ${f2(you.hip(0))} spot ${f2(SPOT)} btb ${tBTB.toFixed(2)} back ${tBack.toFixed(2)} gather ${tG.toFixed(2)} release ${release.toFixed(2)}`, ...x.log);
      return { you, d1, players: { you, d1 }, log };
    },
  },
  // 2 - BETWEEN THE LEGS. Low, through and back through - he shades the way the first one went - and up off the second
  legs: {
    simEnd: 4.25,
    plan: { rec: true, shotClip: SHOTS.bp_shot_style2.rel, flight: 1.25, camRef: 0.5, camAngle: 0.6, camSide: -1, camH: 2.2 },
    build(clips, legs) {
      const P = this.plan, log = [];
      const A = { clip: 'bp_lleg_style1', from: 0.05, at: 0 }, tG = simOf(A, 1.72);
      const B = SHOT('bp_shot_style2', 0.2, tG);
      const release = simOf(B, SHOTS.bp_shot_style2.rel), SPOT = { x: 1.6, z: 7.45 };
      const you = anchoredTrack(clips, [A, B], legs.you, release, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      P.gatherAt = tG;
      const t1 = simOf(A, 0.68), t2 = simOf(A, 1.38);
      // him: a stride and a half off; a reaction time after the first one through he shades the way it went (a short
      // slide, your left), the second one through brings it back and you're rising while he's still on that slide
      const x = new Player(clips, legs.d1, 'd1').start('guard', toward(you.hip(0), RIM, 1.6), you.hip(0));
      x.follow((t) => toward(you.hip(t), RIM, 1.55), (t) => you.hip(t), 0.1, t1 + RT - 0.05, { rt: RT });
      const d0 = x.hip(t1 + RT), wrong = sideways(d0, you.hip(t1 + RT), ballSide(you, t1, 1), you.hip(t1), 0.95);
      x.go(wrong.way, wrong.to, t1 + RT, t2 + RT + 0.1, { rmin: 0.8 });
      const tRe = recover(clips, legs.d1, x, you, release, 1.35);
      x.hold('tall', x.lastArrive, (t) => you.hip(t));
      const d1 = x.track();
      P.contest = [{ from: release - 0.1, rise: 0.25, to: release + 0.5, side: 'R', reach: 0.05, late: true }];
      P.marks = { bite: t2 + 0.12, first: t1 };
      P.labels = [{ t: 0, kind: 'balanced', open: 0 }, { t: t1 + RT + 0.1, kind: 'lean', open: 1 }, { t: t2 + RT, kind: 'wrong', open: 1 }, { t: tRe + 0.25, kind: 'beat', open: 1 }];
      log.push(`you start ${f2(you.hip(0))} spot ${f2(SPOT)} through ${t1.toFixed(2)} back ${t2.toFixed(2)} gather ${tG.toFixed(2)} release ${release.toFixed(2)}`, ...x.log);
      return { you, d1, players: { you, d1 }, log };
    },
  },
  // 3 - THE SPIN. Right hand going right, he slides with you - spin back the other way, behind him, and up
  spin: {
    simEnd: 4.7,
    plan: { rec: true, shotClip: SHOTS.bp_shot_style3.rel, flight: 1.25, camRef: 1.2, camAngle: 0.9, camSide: -1, camH: 2.3 },
    build(clips, legs) {
      const P = this.plan, log = [];
      const A = { clip: 'bp_turn', from: 0.0, at: 0 }, tG = simOf(A, 2.0);
      const B = SHOT('bp_shot_style3', 0.42, tG);
      const release = simOf(B, SHOTS.bp_shot_style3.rel), SPOT = { x: -3.0, z: 6.9 };
      const you = anchoredTrack(clips, [A, B], legs.you, release, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      P.gatherAt = tG;
      const tSpin = simOf(A, 0.82), tOut = simOf(A, 1.45);
      // (through the spin the head goes round with the body)
      P.eyes = [{ from: tSpin - 0.05, to: tOut, w: 0.05 }];
      // him: with the drive, sliding; a reaction time after the spin starts he's still going with the drive, then
      // stops, turns and chases - late
      // (a little more room than the others: the spin swings the ball and the arms round wide)
      const x = new Player(clips, legs.d1, 'd1').start('guard', toward(you.hip(0), RIM, 2.2), you.hip(0));
      x.follow((t) => toward(you.hip(t), RIM, 2.05), (t) => you.hip(t), 0.1, tSpin + RT - 0.05, { rt: RT });
      const d0 = x.hip(tSpin + RT), wrong = sideways(d0, you.hip(tSpin + RT), you.hip(tSpin), you.hip(tSpin - 0.35), 1.0);
      x.go(wrong.way, wrong.to, tSpin + RT, tOut + RT, { rmin: 0.8 });
      const tRe = recover(clips, legs.d1, x, you, release, 1.45);
      x.hold('tall', x.lastArrive, (t) => you.hip(t));
      const d1 = x.track();
      P.contest = [{ from: release - 0.1, rise: 0.25, to: release + 0.5, side: 'L', reach: 0.05, late: true }];
      P.marks = { bite: tSpin + RT + 0.2, spin: tSpin };
      P.labels = [{ t: 0, kind: 'running', open: 0.2 }, { t: tSpin + RT, kind: 'wrong', open: 1 }, { t: tRe + 0.25, kind: 'beat', open: 1 }];
      log.push(`you start ${f2(you.hip(0))} spot ${f2(SPOT)} spin ${tSpin.toFixed(2)}-${tOut.toFixed(2)} gather ${tG.toFixed(2)} release ${release.toFixed(2)}`, ...x.log);
      return { you, d1, players: { you, d1 }, log };
    },
  },
  // 4a - THE WALL. Off-hand side to the wall, ball in the shooting hand: set, dip and straight up - the off hand
  // taps the wall at the very top as the ball goes up off the other, a soft one up in the air
  wall: {
    simEnd: 3.1,
    plan: { rec: true, shotClip: SHOTS.bp_shot_style1.rel, flight: 1.1, drill: 'tap', offHand: true, formShot: { up: 2.7, fwd: 0.35 } },
    build(clips, legs) { return drill(this.plan, clips, legs, 'tap'); },
  },
  // 4b - THE SAME RISE, WITH THE BALL: let it go at that same top
  rise: {
    simEnd: 3.45,
    plan: { rec: true, shotClip: SHOTS.bp_shot_style1.rel, flight: 1.25, drill: 'release' },
    build(clips, legs) { return drill(this.plan, clips, legs, 'release'); },
  },
};

// the drill: one and the same motion for both - set, a breath, then the take's dip and straight up (its little air
// turn taken out). The wall rep stands side-on to the side wall, his off hand (the left: the performer shoots right
// handed) an arm's reach off it, facing along it; the shot rep faces the rim from the top of the key
function drill(P, clips, legs, kind) {
  const tGo = 0.55, S = SHOTS.bp_shot_style1;
  const A = { clip: 'bp_shot_style1', from: 0.02, at: 0, idle: { amp: 0.025, period: 1.6 } };
  const B = { clip: 'bp_shot_style1', from: 0.02, at: tGo, blend: 0.2, shot: true, unwind: { from: S.off, to: S.land, ramp: 0.08 } };
  P.gatherAt = tGo + 0.05;
  const tOff = simOf(B, S.off), top = simOf(B, S.top), land = simOf(B, S.land);
  const SPOT = kind === 'tap' ? { x: 9.6 - 0.62, z: 3.0 } : { x: 0.0, z: 7.6 }, FACE = kind === 'tap' ? { x: 9.6 - 0.62, z: 20 } : RIM;
  const you = anchoredTrack(clips, [A, B], legs.you, tOff, { ...SPOT, yaw: yawTo(SPOT, FACE) });
  // nobody guards him: the engine's second player stands far off the floor, never in the picture
  const d1 = new Track(clips, [{ clip: '78_30', from: 0.93, at: 0, idle: { amp: 0.1, period: 1.6 }, place: { x: 40, z: 40, yaw: 0 } }], legs.d1);
  P.marks = { go: tGo, off: tOff, top, land };
  P.wallX = 9.6;
  return { you, d1, players: { you }, log: [`${kind}: takeoff ${tOff.toFixed(2)} top ${top.toFixed(2)} land ${land.toFixed(2)} spot ${f2(you.hip(tOff))}`] };
}

export function buildRep(name, clips, legs) { return REPS[name].build(clips, legs); }
