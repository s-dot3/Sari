// v17 "Unguardable": the art of shooting the three. One on one, every move a real take (CMU mocap) and every one a
// make over his man - he's made to move first and he's off balance when you rise:
//  1 behind  - cross, cross, a real behind-the-back (06_13 at 20.4: the right hand wraps behind the hips, the left
//              takes it on the other side), cross back and the step-back hop (06_13 at 29.3, cut where the poses
//              match) into 124_05's three; he goes with the behind-the-back and he's leaning the wrong way
//  2 snatch  - pound dribbles going right, the snatch back left (06_13's crossover at 3.5) and straight up on a 1-2
//              (124_05) - he's still sliding right
//  3 fake    - 78_23's shot fake and break left off one dribble into the pull-up: the closeout leaves his feet on the
//              fake and is still coming down when you side-step and rise
//  4 the wall drill - timing: the same 1-2, dip and jump (124_05) twice: first with no ball, tapping the wall at the
//              very top; then with the ball, letting it go at that same top
// Court: rim at (0,0), offense attacks -z.
import { anchoredTrack, RIM } from './play5.js';
import { findPushes } from './rep5.js';
import { Track } from './animator.js';
import { Player, yawTo, simOf, toward, DEG } from './moves16.js';

export const CLIPS17 = ['06_13', '124_05', '78_23', '78_25', '78_30', '78_28', '78_27'];
export const LEGS = { you: 0.934, d1: 0.9386 };
const RT = 0.25; // a reaction time (Singh 2020: 0.225 s visual reaction in basketball players)
// (a fresh object per segment: the animator caches the jump's take-off point on it)
const jump = (k = 0.33) => ({ from: 3.15, to: 3.72, k, ramp: 0.12 });
// the pull-up: 124_05 from just after its own dribble - the 1-2 into the dip at 3.0, takeoff 3.17, release 3.38
const SHOT = (from, at, extra = {}) => ({ clip: '124_05', from, at, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: jump(), ...extra });
const f2 = (p) => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
// a slide across the line between a defender (d) and his man (y), the way his man was going (from p0 to p1), dist m:
// which of the stance's two slides that is, and where it ends
function sideways(d, y, p1, p0, dist) {
  const L = Math.hypot(y.x - d.x, y.z - d.z) || 1, f = { x: (y.x - d.x) / L, z: (y.z - d.z) / L }, lft = { x: f.z, z: -f.x };
  const s = Math.sign((p1.x - p0.x) * lft.x + (p1.z - p0.z) * lft.z) || 1;
  return { way: s > 0 ? 'slideL' : 'slideR', to: { x: d.x + lft.x * s * dist, z: d.z + lft.z * s * dist } };
}
const off = (p, F, fwd, left) => ({ x: p.x + Math.sin(F) * fwd + Math.cos(F) * left, z: p.z + Math.cos(F) * fwd - Math.sin(F) * left });

export const REPS = {
  // 1 - BEHIND THE BACK. Attacking him with crosses, then the behind-the-back: he goes with it - and as he does, the
  // cross back and the step-back: he's leaning the wrong way, going away from where you rise
  behind: {
    simEnd: 4.9,
    plan: { hold: [0, 0.02], gatherDur: 0.2, shotClip: 3.38, flight: 1.25, camRef: 1.6, camAngle: 0.8, camSide: 1, camH: 2.3 },
    build(clips, legs) {
      const P = this.plan, log = [];
      const A = { clip: '06_13', from: 18.3, at: 0 }, tCut = simOf(A, 20.767);
      const B = { clip: '06_13', from: 29.333, at: tCut, inert: 0.25 };
      const C = { clip: '06_13', from: 29.5, at: simOf(B, 29.5), rate: 1.6, inert: 0.1 };
      P.dribble = [0.0, simOf(C, 29.75)]; P.gatherAt = simOf(C, 29.9);
      const D = SHOT(3.04, simOf(C, 30.12), { inert: 0.18 });
      const tOff = simOf(D, 3.17), release = simOf(D, 3.38), SPOT = { x: -2.2, z: 7.25 };
      const you = anchoredTrack(clips, [A, B, C, D], legs.you, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      const tBTB = simOf(A, 20.6), tBack = simOf(C, 29.52);
      // him: in his stance a stride and a half off, keeping in front (v14's planner) until the behind-the-back; a
      // reaction time after it he goes with it - a hard slide the way the ball went (your left, his right) - and is
      // still going when you cross back and hop away; he stops and comes back late
      const x = new Player(clips, legs.d1, 'd1').start('guard', toward(you.hip(0), RIM, 1.6), you.hip(0));
      x.follow((t) => toward(you.hip(t), RIM, 1.55), (t) => you.hip(t), 0.1, tBTB + RT - 0.05, { rt: RT });
      // (the way the ball went: from the right hand behind his back to the left)
      const d0 = x.hip(tBTB + RT), F = you.at(tBTB).yaw, ballWay = off(you.hip(tBTB), F, 0, 1);
      const wrong = sideways(d0, you.hip(tBTB + RT), ballWay, you.hip(tBTB), 1.25);
      x.go(wrong.way, wrong.to, tBTB + RT, tBTB + RT + 0.62, { rmin: 0.8 });
      const tRe = x.lastArrive, yr = you.hip(release);
      x.go('runStop', toward(yr, x.hip(tRe), 1.45), tRe + 0.05, release - 0.15, { rmin: 0.8 });
      x.hold('tall', x.lastArrive, (t) => you.hip(t));
      const d1 = x.track();
      P.contest = [{ from: release - 0.12, rise: 0.25, to: release + 0.5, side: 'L', reach: 0.05, late: true }];
      P.marks = { bite: tBTB + RT + 0.12, back: tBack };
      P.labels = [{ t: 0, kind: 'balanced', open: 0 }, { t: tBTB + RT + 0.1, kind: 'lean', open: 1 }, { t: tRe + 0.3, kind: 'beat', open: 1 }];
      log.push(`you start ${f2(you.hip(0))} spot ${f2(SPOT)} release ${release.toFixed(2)}`, ...x.log);
      return { you, d1, players: { you, d1 }, log };
    },
  },
  // 2 - THE SNATCH. Pounding it going right, he slides with you - then the snatch back left and straight up on a 1-2
  snatch: {
    simEnd: 5.3,
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.25, camRef: 2.6, camAngle: 0.85, camSide: -1, camH: 2.3 },
    build(clips, legs) {
      const P = this.plan, log = [];
      const A = { clip: '06_13', from: 0.35, at: 0 }, tStop = simOf(A, 3.583);
      const B = { clip: '124_05', from: 2.733, at: tStop, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: jump(0.15) };
      const pushes = findPushes(clips['06_13'], 2.8, 3.583), last = pushes[pushes.length - 1];
      P.hold = [0, 0.15]; P.dribble = [0.15, simOf(A, last.c1) + 0.02]; P.gatherAt = Math.max(simOf(A, last.c1) + 0.2, tStop - 0.02);
      const tOff = simOf(B, 3.17), release = simOf(B, 3.38), SPOT = { x: 1.6, z: 7.45 };
      const you = anchoredTrack(clips, [A, B], legs.you, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      const tSnatch = simOf(A, 3.45);
      // him: with you as you walk it up, giving ground; on the pounds he's sliding with you to your right; a reaction
      // time after the snatch he's still going that way (his left), then stops and comes back late
      const x = new Player(clips, legs.d1, 'd1').start('guard', toward(you.hip(0), RIM, 1.7), you.hip(0));
      x.follow((t) => toward(you.hip(t), RIM, 1.6), (t) => you.hip(t), 0.1, tSnatch + RT - 0.05, { rt: RT });
      const d0 = x.hip(tSnatch + RT), wrong = sideways(d0, you.hip(tSnatch + RT), you.hip(tSnatch) , you.hip(tSnatch - 0.4), 1.1);
      x.go(wrong.way, wrong.to, tSnatch + RT, tSnatch + RT + 0.55, { rmin: 0.8 });
      const tRe = x.lastArrive, yr = you.hip(release);
      x.go('runStop', toward(yr, x.hip(tRe), 1.4), tRe + 0.05, release - 0.12, { rmin: 0.8 });
      x.hold('tall', x.lastArrive, (t) => you.hip(t));
      const d1 = x.track();
      P.contest = [{ from: release - 0.1, rise: 0.25, to: release + 0.5, side: 'R', reach: 0.05, late: true }];
      P.marks = { bite: tSnatch + RT + 0.25 };
      P.labels = [{ t: 0, kind: 'balanced', open: 0 }, { t: tSnatch + RT, kind: 'wrong', open: 1 }, { t: tRe + 0.25, kind: 'beat', open: 1 }];
      log.push(`you start ${f2(you.hip(0))} spot ${f2(SPOT)} release ${release.toFixed(2)}`, ...x.log);
      return { you, d1, players: { you, d1 }, log };
    },
  },
  // 3 - THE PUMP FAKE. He closes out hard; sell the shot - he leaves his feet - rip it through, one dribble left and
  // rise while he's still coming down
  fake: {
    simEnd: 5.0,
    plan: { hold: [0, 1.4], holdHands: true, lookRim: [0.15, 1.1], gatherDur: 0.2, shotClip: 3.38, flight: 1.25, camRef: 0.9, camAngle: 1.0, camSide: 1, camH: 2.0 },
    build(clips, legs) {
      const P = this.plan, log = [];
      // you: 78_23 - ball at the hip, the fake (ball up past the eyes, 0.8-1.6), the rip down played quick, the jab
      // and the break left off the left hand, played a touch quick; stop on the way up from that one dribble and rise
      const A = { clip: '78_23', from: 0.55, at: 0 };
      const B = { clip: '78_23', from: 1.75, at: simOf(A, 1.75), rate: 2.3, inert: 0.12 };
      const C = { clip: '78_23', from: 2.75, at: simOf(B, 2.75), rate: 1.3, inert: 0.12 };
      const push = findPushes(clips['78_23'], 3.0, 3.35, 'L')[0], s1 = simOf(C, push.c1);
      P.hold = [0, simOf(C, push.c0) - 0.1]; P.dribble = [simOf(C, push.c0) - 0.05, s1 + 0.02]; P.gatherAt = s1 + 0.26; P.pushHand = 'L';
      const D = SHOT(2.75, P.gatherAt - 0.06);
      const tOff = simOf(D, 3.17), release = simOf(D, 3.38), SPOT = { x: -3.1, z: 6.85 };
      const you = anchoredTrack(clips, [A, B, C, D], legs.you, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      // the closeout: v8's - 78_25's sprint, still chopping at the top of the fake, a stride in front, and he leaves
      // his feet at you (124_05's jump, carrying the closeout's speed), lands past your shoulder and has to turn
      const jumpAt = 0.72, h = you.hip(jumpAt), F = you.at(jumpAt).yaw, fw = { x: Math.sin(F), z: Math.cos(F) }, lf = { x: Math.cos(F), z: -Math.sin(F) };
      // (he comes in a stride in front and off the shoulder away from where you'll go, and flies on by it)
      const brk = Math.sign((SPOT.x - h.x) * lf.x + (SPOT.z - h.z) * lf.z) || 1;
      const at0 = { x: h.x + fw.x * 1.3 - lf.x * brk * 0.6, z: h.z + fw.z * 1.3 - lf.z * brk * 0.6 }, carry = { x: -fw.x * 1.7 - lf.x * brk * 0.4, z: -fw.z * 1.7 - lf.z * brk * 0.4 };
      const landAt = jumpAt + (3.76 - 3.05), yr = you.hip(release);
      const base = anchoredTrack(clips, [{ clip: '78_25', from: 1.99 - jumpAt, at: 0 },
        { clip: '124_05', from: 3.05, at: jumpAt, inert: 0.16, unwind: { from: 3.15, to: 3.72, ramp: 0.08 }, compress: { ...jump(0.15), carry } }], legs.d1, jumpAt, { ...at0, yaw: yawTo(at0, h) });
      // landed past your shoulder: he turns and runs back at you, a closeout that gets there after the ball is gone,
      // stopping on your right side, a stride off
      const x = new Player(clips, legs.d1, 'd1'); x.segs = base.segs.map(sg => ({ ...sg, pl: undefined, _off: undefined, _turn: undefined }));
      x.hold('guard', landAt + 0.2, (t) => you.hip(t));
      const tRun = Math.max(landAt + 0.45, release - 0.55), pl = x.hip(tRun), back = toward(yr, pl, 1.45);
      x.go('runStop', back, tRun, release + 0.15, { rmin: 0.75 });
      x.hold('tall', x.lastArrive, (t) => you.hip(t));
      const d1 = x.track();
      P.contest = [{ from: jumpAt - 0.2, rise: 0.2, to: landAt - 0.1, fall: 0.25, both: true, reach: 0.16 },
        { from: release - 0.12, rise: 0.25, to: release + 0.5, side: 'R', reach: 0.05, late: true }];
      P.marks = { bite: jumpAt + 0.24 }; P.vals = { air: (landAt - (jumpAt + 0.12)).toFixed(1) };
      P.labels = [{ t: 0, kind: 'closing', open: 0.55 }, { t: 0.3, kind: 'chop', open: 0.3 }, { t: jumpAt + 0.1, kind: 'air', open: 1 }, { t: landAt, kind: 'beat', open: 1 }];
      log.push(`you start ${f2(you.hip(0))} spot ${f2(SPOT)} release ${release.toFixed(2)} d1 at jump ${f2(d1.hip(jumpAt))} lands ${f2(d1.hip(landAt))}`, ...x.log);
      return { you, d1, players: { you, d1 }, log };
    },
  },
  // 4a - THE WALL. No ball: ready, the 1-2, the dip and straight up - and tap the wall at the very top
  wall: {
    simEnd: 2.6,
    plan: { hold: [0, 0.5], holdHands: true, gatherDur: 0.2, shotClip: 3.38, flight: 1.1, noBall: true, drill: 'tap' },
    build(clips, legs) { return drill(this.plan, clips, legs, 'tap'); },
  },
  // 4b - THE SAME RISE, WITH THE BALL: let it go at that same top
  rise: {
    simEnd: 3.9,
    plan: { hold: [0, 0.5], holdHands: true, gatherDur: 0.2, shotClip: 3.38, flight: 1.25, drill: 'release' },
    build(clips, legs) { return drill(this.plan, clips, legs, 'release'); },
  },
};

// the drill: one and the same motion for both - ready (124_05's stance), then from 2.75 its 1-2, dip at 3.0, takeoff
// 3.17 and straight up (a tenth of the take's drift); the wall rep faces the side wall a step off it, the shot rep the
// rim from the top of the key
function drill(P, clips, legs, kind) {
  const tGo = 0.55, A = { clip: '124_05', from: 1.85, at: 0, idle: { amp: 0.04, period: 1.6 } };
  const B = { clip: '124_05', from: 2.75, at: tGo, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: jump(0.1) };
  P.gatherAt = tGo + 0.05;
  const tOff = simOf(B, 3.17), top = simOf(B, 3.43), land = simOf(B, 3.72);
  const SPOT = kind === 'tap' ? { x: 9.08, z: 3.0 } : { x: 0.0, z: 7.6 }, FACE = kind === 'tap' ? { x: 20, z: 3.0 } : RIM;
  const you = anchoredTrack(clips, [A, B], legs.you, tOff, { ...SPOT, yaw: yawTo(SPOT, FACE) });
  // nobody guards him: the engine's second player stands far off the floor, never in the picture
  const d1 = new Track(clips, [{ clip: '78_30', from: 0.93, at: 0, idle: { amp: 0.1, period: 1.6 }, place: { x: 40, z: 40, yaw: 0 } }], legs.d1);
  P.marks = { go: tGo, off: tOff, top, land };
  P.wallX = 9.6;
  return { you, d1, players: { you }, log: [`${kind}: takeoff ${tOff.toFixed(2)} top ${top.toFixed(2)} land ${land.toFixed(2)} spot ${f2(you.hip(tOff))}`] };
}

export function buildRep(name, clips, legs) { return REPS[name].build(clips, legs); }
