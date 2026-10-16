// v13 "game speed": four new plays at full speed, each one take from the first dribble to the net. Every play is
// built from whole real takes (CMU mocap) cut together with inertialized transitions, the moves at their real speed:
//  crossdrive  - 78_34's drive (four crossovers at up to 3.5 m/s) into 124_06's layup off the glass; his man slides
//                with the first cross and is beaten by the second
//  spin        - 78_13's spin move at speed (a full turn round his man) into 124_05's pull-up
//  stepback3   - 06_13's through the legs, cross and cross back, the hop back snatched (1.6x), and 124_05's jumper
//                from behind the arc; his man slides with the cross and is late back
//  doublecross - 78_33's drive (crossovers either way at over 2 m/s) into 124_05's pull-up at the elbow
// Court: rim at (0,0), offense attacks -z.
import { anchoredTrack, RIM } from './play5.js';
import { findPushes } from './rep5.js';

export const CLIPS13 = ['78_34', '124_06', '78_30', '78_13', '124_05', '06_13', '78_33'];
const yawTo = (p, q) => Math.atan2(q.x - p.x, q.z - p.z);
// 124_05's jump drifts ~0.35 m in the air, mostly sideways; keep a third of it so the jump goes up, not across
const JUMP_STRAIGHT = { from: 3.15, to: 3.72, k: 0.33, ramp: 0.12 };
// the pull-up: 124_05 from just after its own dribble (ball in both hands, stepping into it) - dip at 3.0, takeoff
// 3.17, release 3.38
const SHOT = (from, at, extra = {}) => ({ clip: '124_05', from, at, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: JUMP_STRAIGHT, ...extra });
const simOf = (sg, ct) => sg.at + (ct - sg.from) / (sg.rate ?? 1);
const RT = 0.25; // his reaction time (Singh 2020: 0.225 s visual reaction in basketball players)

// his man: square in his stance `dist` off at tRef (shaded `shade` m to the ball handler's right), and a reaction time
// after the first move he bites on it: a slide (78_30) the way it went - to the ball handler's right ('R': the end
// of 78_30's slide to his left, aimed) or left ('L': its slide to his right) - so the next move goes by him
function onBall(clips, legs, you, { tRef, dist, shade = 0, tMove, way, slideFor = 0.9 }) {
  const h = you.hip(tRef), F = you.at(tRef).yaw, fw = { x: Math.sin(F), z: Math.cos(F) }, rt = { x: -fw.z, z: fw.x };
  const at0 = { x: h.x + fw.x * dist + rt.x * shade, z: h.z + fw.z * dist + rt.z * shade };
  const t0 = tMove + RT, s = way === 'R' ? 1 : -1, aim = { x: at0.x + rt.x * s * 2.5, z: at0.z + rt.z * s * 2.5 };
  const slide = way === 'R'
    ? { clip: '78_30', from: 1.45, at: t0, inert: 0.2, yawAbs: (p) => yawTo(p, aim) - 80 * Math.PI / 180 }
    : { clip: '78_30', from: 0.05, at: t0, inert: 0.2, yawAbs: (p) => yawTo(p, aim) + 80 * Math.PI / 180 };
  const dsegs = [{ clip: '78_30', from: 0.93, at: 0, idle: { amp: 0.1, period: 1.6 } }, slide,
    { clip: '78_30', from: 2.45, at: t0 + slideFor, inert: 0.3, idle: { amp: 0.06, period: 1.5 }, yawAbs: (p) => yawTo(p, you.hip(t0 + slideFor + 0.4)) }];
  return anchoredTrack(clips, dsegs, legs.d1, tRef, { ...at0, yaw: yawTo(at0, h) });
}

export const REPS = {
  // 1 - crossover drive and a layup off the glass
  crossdrive: {
    simEnd: 3.6,
    plan: { gatherDur: 0.2, layup: { releaseClip: 3.36, side: 'R', oneHand: 0 },
      camTake: { stiff: 2.2, pairW: 0.15, side: -1, az0: 0.75, az1: 0.45, back0: 3.6, back1: 4.2, h0: 2.8, h1: 3.0, fov0: 52, fov1: 60, lookRim: 0.55, lookY1: 1.9 } },
    build(clips, legs) {
      const P = this.plan;
      // you: 78_34 from its first step - crossovers at 0.90 (right to left), 1.27, 1.57 and 1.82, speeding up to
      // 3.5 m/s - and on the last one into 124_06's gather and layup (its own drive is going 3.3 m/s there)
      const A = { clip: '78_34', from: 0.55, at: 0 };
      const tCut = simOf(A, 2.02);
      const B = { clip: '124_06', from: 2.633, at: tCut, inert: 0.25, shot: true, unwind: { from: 3.02, to: 3.85, ramp: 0.12, k: 0.85 } };
      P.dribble = [0, tCut]; P.gatherAt = tCut; P.layup.oneHand = simOf(B, 3.2);
      const tTake = simOf(B, 3.02), TAKE = { x: 0.8, z: 1.0 };
      const you = anchoredTrack(clips, [A, B], legs.you, tTake, { ...TAKE, yaw: yawTo(TAKE, { x: 0.2, z: 0.05 }) });
      // him: shading your right; he bites on the drive right and the cross takes you left, by him
      const d1 = onBall(clips, legs, you, { tRef: simOf(A, 0.75), dist: 1.8, shade: 0.35, tMove: simOf(A, 0.62), way: 'R' });
      return { you, d1 };
    },
  },
  // 2 - spin move into a pull-up
  spin: {
    simEnd: 3.3,
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.1,
      camTake: { stiff: 2.2, pairW: 0.3, side: -1, az0: 0.75, az1: 0.3, back0: 3.6, back1: 4.6, h0: 2.8, h1: 3.1, fov0: 52, fov1: 62 } },
    build(clips, legs) {
      const P = this.plan;
      // you: 78_13 at speed - the spin (a full turn, clip 0.3-0.9) round his man - and out of it on the next
      // dribble's way back up into the stop and the pull-up
      const A = { clip: '78_13', from: 0.0, at: 0 };
      const pushes = findPushes(clips['78_13'], 0.0, 1.3), last = pushes[pushes.length - 1], s1 = simOf(A, last.c1);
      P.dribble = [0.0, s1 + 0.02]; P.gatherAt = s1 + 0.24;
      const tStop = P.gatherAt - 0.08, segs = [A, SHOT(2.72, tStop, { inert: 0.35 })];
      const tOff = simOf(segs[1], 3.17), SPOT = { x: 1.6, z: 4.4 };
      const you = anchoredTrack(clips, segs, legs.you, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      // him: in front as you come at him, he jumps the way you were going and the spin takes you round him
      const d1 = onBall(clips, legs, you, { tRef: 0.25, dist: 1.5, tMove: 0.3, way: 'L' });
      return { you, d1 };
    },
  },
  // 3 - through the legs, cross, cross back, step back: a three
  stepback3: {
    simEnd: 3.9,
    plan: { hold: [0, 0.02], gatherDur: 0.2, shotClip: 3.38, flight: 1.25,
      camTake: { stiff: 2.2, side: -1, az0: 0.72, az1: 0.28, back0: 3.3, back1: 4.6, h0: 2.6, h1: 3.1, fov0: 46, fov1: 62, follow: 0.3, lookRim: 0.36 } },
    build(clips, legs) {
      const P = this.plan;
      const MOVE = { cross: 29.18, gather: 29.9 };
      const A = { clip: '06_13', from: 28.6, at: 0 };
      const B = { clip: '06_13', from: 29.5, at: simOf(A, 29.5), rate: 1.6, inert: 0.1 };
      P.dribble = [0.0, simOf(B, 29.75)]; P.gatherAt = simOf(B, MOVE.gather);
      const segs = [A, B, SHOT(3.04, simOf(B, 30.12), { inert: 0.18 })];
      const tOff = simOf(segs[2], 3.17), SPOT = { x: -3.0, z: 6.65 };
      const you = anchoredTrack(clips, segs, legs.you, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      const release = simOf(segs[2], 3.38), tCross = simOf(A, MOVE.cross);
      // him: square, 1.65 m off at the cross; he slides with it and comes back at you late
      const h = you.hip(tCross), F = you.at(tCross).yaw, at0 = { x: h.x + Math.sin(F) * 1.65, z: h.z + Math.cos(F) * 1.65 };
      const yr = you.hip(release), L = Math.hypot(at0.x - yr.x, at0.z - yr.z) || 1, T = { x: yr.x + (at0.x - yr.x) / L * 0.9, z: yr.z + (at0.z - yr.z) / L * 0.9 };
      const d1 = anchoredTrack(clips, [{ clip: '78_30', from: 0.93, at: 0, idle: { amp: 0.1, period: 1.6 } }, { clip: '78_30', from: 0.05, at: tCross + 0.15, inert: 0.2 },
        { clip: '78_30', from: 1.45, at: tCross + 0.85, inert: 0.2, yawAbs: (p) => yawTo(p, T) - 80 * Math.PI / 180 },
        { clip: '78_30', from: 2.45, at: tCross + 1.32, inert: 0.3, idle: { amp: 0.06, period: 1.5 }, yawAbs: (p) => yawTo(p, yr) }], legs.d1, tCross, { ...at0, yaw: yawTo(at0, h) });
      P.contest = [{ from: tCross + 1.1, rise: 0.25, to: release + 0.5, side: 'L', reach: 0.1 }];
      return { you, d1 };
    },
  },
  // 4 - double crossover at speed into a pull-up
  doublecross: {
    simEnd: 3.1,
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.1,
      camTake: { stiff: 2.2, pairW: 0.15, side: -1, az0: 0.75, az1: 0.3, back0: 3.6, back1: 4.6, h0: 2.8, h1: 3.1, fov0: 52, fov1: 62 } },
    build(clips, legs) {
      const P = this.plan;
      // you: 78_33 - crossovers at 0.12, 0.30, 0.68 and 0.90 at over 2 m/s - and on the next dribble's way up, the
      // stop and the pull-up
      const A = { clip: '78_33', from: 0.0, at: 0 };
      const pushes = findPushes(clips['78_33'], 0.0, 1.25), last = pushes[pushes.length - 1], s1 = simOf(A, last.c1);
      P.dribble = [0.0, s1 + 0.02]; P.gatherAt = s1 + 0.24;
      const tStop = P.gatherAt - 0.08, segs = [A, SHOT(2.72, tStop, { inert: 0.35 })];
      const tOff = simOf(segs[1], 3.17), SPOT = { x: -1.7, z: 4.6 };
      const you = anchoredTrack(clips, segs, legs.you, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      // him: shading your left; he goes with the first move left and the cross takes you right, by him
      const d1 = onBall(clips, legs, you, { tRef: 0.3, dist: 2.0, shade: -0.35, tMove: 0.12, way: 'L' });
      return { you, d1 };
    },
  },
};

export function buildRep(name, clips, legs) { return REPS[name].build(clips, legs); }
