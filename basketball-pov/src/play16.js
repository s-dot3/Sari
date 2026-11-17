// v16 "No Open Looks": team defence on a full half court - three on three, every possession built from whole real
// takes (CMU mocap) and ending in a contested miss:
//  1 switch    - a ball screen; the screener's man is up at the level and takes the ball ("switch!"), the guard
//                takes the roller and fronts him, the ball handler is walled up and has to pull up over length
//  2 pin-down  - the shooter comes off a down screen to the wing; the screener's man jumps the switch on the high
//                side, the catch is contested and the shooter's man takes the screener
//  3 backdoor  - the wing is denied, cuts backdoor; his man opens to the ball, runs with him and beats him to the
//                spot - no pass, the play is dead and the ball handler has to make something late
//  4 scram     - after a switch the guard is stuck on the big in the post: the weak-side defender runs over and
//                takes the big, the guard runs out to his man, and the big on the ball handler walls him up
// Court: rim at (0,0), offense attacks -z.
import { anchoredTrack, RIM } from './play5.js';
import { findPushes } from './rep5.js';
import { Track } from './animator.js';
import { Player, yawTo, simOf, toward, DEG, lerp2 } from './moves16.js';

export const CLIPS16 = ['06_13', '78_32', '124_05', '78_30', '78_24', '78_25', '78_26', '78_27', '78_12', '78_28', '78_33', '78_34'];
// the six: offence in white, defence in red; heights as built (they read ~3% shorter in their stance)
export const CAST = {
  o1: { model: '04', tex: 'guard3', height: 2.06, team: 'O', num: 3, role: 'guard' },
  o2: { model: '04', tex: 'screener', height: 2.24, team: 'O', num: 34, role: 'big' },
  o3: { model: '04', tex: 'wing', height: 2.14, team: 'O', num: 11, role: 'wing' },
  x1: { model: '02', tex: 'd3', height: 2.06, team: 'X', num: 8, role: 'guard' },
  x2: { model: '02', tex: 'd2', height: 2.24, team: 'X', num: 21, role: 'big' },
  x3: { model: '03', tex: 'd1', height: 2.14, team: 'X', num: 5, role: 'wing' },
};
// leg lengths (hip joint to ankle) of the built rigs - the browser measures its own; these are for tools/plan16.mjs
export const LEGS = { o1: 0.9056, o2: 0.9848, o3: 0.9408, x1: 0.9056, x2: 0.9848, x3: 0.9408 };

// 124_05's jump drifts ~0.35 m in the air; keep a third of it
// (a fresh object per segment: the animator caches the jump's take-off point on it)
const jump = () => ({ from: 3.15, to: 3.72, k: 0.33, ramp: 0.12 });
// the pull-up: 124_05 from just after its own dribble - dip 3.0, takeoff 3.17, release 3.38
const SHOT = (from, at, extra = {}) => ({ clip: '124_05', from, at, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: jump(), ...extra });
// a point d metres in front of the shooter at t (toward the rim), where his man wants to be for the contest
const inFront = (tr, t, d) => { const h = tr.hip(t); return toward(h, RIM, d); };
// sideways from p, perpendicular to the direction p->q: + is to the left of someone at p facing q
const side = (p, q, d) => { const L = Math.hypot(q.x - p.x, q.z - p.z) || 1, fx = (q.x - p.x) / L, fz = (q.z - p.z) / L; return { x: p.x + fz * d, z: p.z - fx * d }; };
const add = (p, dx, dz) => ({ x: p.x + dx, z: p.z + dz });
const f2 = (p) => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
// the camera's weights on the players, eased from one set to another between a and b
const fade = (t, a, b, A, B) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))), e = u * u * (3 - 2 * u), out = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) out[k] = (A[k] ?? 0) * (1 - e) + (B[k] ?? 0) * e; return out; };

export const REPS = {
  // 1 - SWITCH IT. The ball handler (o1) walks it up and the big (o2) comes up to screen his man (x1) on the right;
  // o1 drives off it. x2, the screener's man, is up at the level of the screen, not back in the paint: on "switch!"
  // he steps out into the drive and slides with it, chest in front, and o1 has to pull up over him. x1 gets
  // screened, switches onto the roller and fronts him on the ball side so there's no pass over the top.
  switch: {
    simEnd: 4.9,
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.15, miss: { side: 0.05, kick: 0.3 } },
    build(clips, legs) {
      const P = this.plan, log = [];
      // o1: 06_13 walking it up (right-hand pounds, a crossover at 0.8), cut where the poses match (tools/transit.py)
      // into 78_32's drive (right hand), and on its second dribble the stop and 124_05's pull-up
      const A = { clip: '06_13', from: 0.35, at: 0 };
      const tDrive = simOf(A, 1.533);
      const B = { clip: '78_32', from: 0.0, at: tDrive, rate: 0.92, inert: 0.3, pushHand: 'R' };
      const pk = findPushes(clips['78_32'], 0.8, 1.2, 'R')[0], s1 = simOf(B, pk.c1);
      P.dribble = [0.05, s1 + 0.02]; P.gatherAt = s1 + 0.24;
      const stopAt = P.gatherAt - 0.06, C = SHOT(2.75, stopAt, { inert: 0.35 });
      const tOff = simOf(C, 3.17), release = simOf(C, 3.38), SPOT = { x: 1.75, z: 6.15 };
      const o1 = anchoredTrack(clips, [A, B, C], legs.o1, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      // x1: square to o1 between him and the rim; the screen comes on his left (o1's right), a body's width off
      const o0 = o1.hip(0), x1At = toward(o0, RIM, 1.15), S = add(side(x1At, o0, 0.64), -0.05, -0.2);
      // (when o1 comes past it: the moment he's closest to the screen)
      let tS = tDrive, dS = 1e9; for (let t = tDrive; t < stopAt; t += 0.02) { const h = o1.hip(t), d = Math.hypot(h.x - S.x, h.z - S.z); if (d < dS) { dS = d; tS = t; } }
      const x1 = new Player(clips, legs.x1, 'x1').start('guard', x1At, o0);
      // (he goes with the drive and runs into it)
      x1.go('slideL', toward(x1At, S, 0.08), tDrive + 0.12, tS - 0.05, { rmin: 0.5 }); x1.hold('guard', x1.lastArrive, (t) => o1.hip(t));
      // o2: up from the elbow into the screen, set before o1 goes; then rolls to the rim, facing the ball
      const S0 = add(S, 0.45, -2.3), ROLL = { x: -0.55, z: 2.6 };
      const o2 = new Player(clips, legs.o2, 'o2').start('ready', S0, o0);
      o2.go('runStop', S, 0.1, tDrive - 0.15); o2.hold('set', o2.lastArrive, x1At);
      o2.go('run', add(lerp2(S, ROLL, 0.5), -0.35, 0), tS + 0.2, tS + 1.0); o2.go('runStop', ROLL, o2.lastArrive, tS + 1.85);
      o2.hold('ready', o2.lastArrive, (t) => o1.hip(t));
      const O2 = o2.track();
      // x2: the screener's man, with him all the way up and level with the screen (not dropped back): on the switch
      // he's already in the drive's way, gives ground in front of it and closes to an arm's length for the pull-up
      const L0 = add(S0, 0.5, -0.8), LEVEL = toward(o1.hip(tS + 0.25), SPOT, 1.5);
      const x2 = new Player(clips, legs.x2, 'x2').start('guard', L0, o0);
      x2.go('runStop', LEVEL, 0.2, tDrive + 0.05); x2.hold('guard', x2.lastArrive, (t) => o1.hip(t));
      const gap = (t) => 1.45 - 0.4 * Math.min(1, Math.max(0, (t - tS) / (release - 0.4 - tS)));
      x2.follow((t) => toward(o1.hip(t), RIM, gap(t)), (t) => o1.hip(t), tS - 0.05, release - 0.4, { rt: 0.1 });
      x2.hold('tall', Math.max(x2.lastArrive ?? 0, release - 0.38), (t) => o1.hip(t));
      // x1, switched: off the screen and down with the roller, a step behind him on the ball side, then fronting him
      const FRONT = toward(ROLL, o1.hip(release), 0.8);
      x1.go('run', add(lerp2(x1.hip(tS + 0.3), FRONT, 0.5), -0.1, 0), tS + 0.32, tS + 1.1); x1.go('runStop', FRONT, x1.lastArrive, tS + 1.95);
      x1.hold('guard', x1.lastArrive, (t) => O2.hip(t));
      P.contest = [{ from: release - 0.32, rise: 0.25, to: release + 0.6, both: true, reach: 0.1 }];
      const tSw = tS + 0.12;
      P.marks = { screen: tS, switch: tSw };
      // the coaches' angle: high behind the ball, weighted to the ball and the switch
      P.camFilm = { focus: { o1: 1.6, x2: 1.0, o2: 0.6, x1: 0.6 }, off: { x: 0.3, y: 5.6, z: 8.6 }, lookOff: { x: 0, z: -2.0 }, lookY: 1.0, fov: 50 };
      P.camShot = { az: 0.22, back: 3.6, h: 2.5, fov: 58 };
      P.arms = [{ who: 'o2', kind: 'screen', from: tDrive - 0.25, to: tS + 0.22 }];
      P.assign = [{ t: 0, map: { x1: 'o1', x2: 'o2' } }, { t: tSw, map: { x1: 'o2', x2: 'o1' } }];
      P.arrows = [
        { who: 'o1', from: tSw, to: tOff, at: tSw, until: release - 0.3, delay: 0.3 },
        { who: 'o2', from: tSw + 0.05, to: tS + 1.85, at: tSw, until: release - 0.3, delay: 0.55 },
        { who: 'x2', from: tSw, to: release - 0.4, at: tSw, until: release - 0.3, color: 'def', delay: 1.5 },
        { who: 'x1', from: tSw + 0.1, to: tS + 1.95, at: tSw, until: release - 0.3, color: 'def', delay: 1.7 },
      ];
      P.tags = [
        { who: 'o2', text: 'SCREEN', kind: 'off', from: tS - 0.55, to: tSw + 0.2 },
        { who: 'x2', text: 'SWITCH!', kind: 'def', from: tSw, to: tSw + 0.7, delay: 1.1 },
        { who: 'x1', text: 'FRONT', kind: 'def', from: tS + 1.2, to: release + 0.2 },
      ];
      P.clock = release + 4.3;
      P.vals = {};
      log.push(`screen at ${f2(S)} t ${tS.toFixed(2)}; o1 start ${f2(o0)} spot ${f2(SPOT)}; release ${release.toFixed(2)}`);
      for (const p of [o2, x1, x2]) log.push(...p.log);
      const X1 = x1.track(), X2 = x2.track();
      return { cast: { you: 'o1', d1: 'x2' }, you: o1, d1: X2, extra: { o2: O2, x1: X1 }, players: { o1, o2: O2, x1: X1, x2: X2 }, log };
    },
  },
  // 2 - KILL THE PIN-DOWN. The shooter (o3) starts on the left block; the big (o2) comes down from the elbow to
  // screen his man (x3) and o3 comes up off it to the wing for a three, the ball at the top with o1. The screener's
  // man (x2) is with him all the way down and on the cut he jumps out on the high side - beats the shooter to the
  // spot, switch - so the catch is made with a hand in his face. x3 takes the screener. No three: one dribble to get
  // off the line and a long two over a 6'10" contest.
  pindown: {
    simEnd: 6.4,
    plan: { gatherDur: 0.18, shotClip: 3.38, flight: 1.15, holdHands: true, miss: { side: -0.05, kick: 0.32 } },
    build(clips, legs) {
      const P = this.plan, log = [];
      // o1, the passer: 06_13 walking it up at the top, cut (tools/transit.py) into 124_05's pickup at 2.717, held,
      // and the pass out to the wing
      const A = { clip: '06_13', from: 0.35, at: 0 }, tPick = simOf(A, 1.733);
      const aB = { clip: '124_05', from: 2.717, at: tPick, inert: 0.3 }, aC = { clip: '124_05', from: 2.98, at: tPick + 0.26, inert: 0.15, idle: { amp: 0.03, period: 1.2 } };
      const pushes = findPushes(clips['06_13'], 0.35, 1.733), lastA = pushes[pushes.length - 1];
      const planA = { dribble: [0.05, simOf(A, lastA.c1) + 0.02], gatherAt: tPick + 0.1, gatherDur: 0.2, passOut: true };
      const W = { x: -4.55, z: 6.05 }, TOP = { x: 1.1, z: 7.9 };
      const o1 = anchoredTrack(clips, [A, aB, aC], legs.o1, tPick + 0.3, { ...TOP, yaw: yawTo(TOP, lerp2(RIM, W, 0.55)) });
      // o3: on the left block, ready; at the cut he steps up, runs off the screen's outside shoulder and stops on the
      // wing facing the ball, catches and turns into 124_05's one dribble and pull-up
      const B = { x: -2.8, z: 0.95 }, PS = { x: -2.75, z: 2.75 };
      const tCut = 1.05, o3 = new Player(clips, legs.o3, 'o3').start('ready', B, o1.hip(0));
      o3.go('run', { x: -3.55, z: 3.0 }, tCut, tCut + 0.75); o3.go('runStop', W, o3.lastArrive, tCut + 1.55);
      // (the pass leads him: in the air as he stops, caught as he plants)
      const tStop = o3.lastArrive, t0 = tStop - 0.42, from0 = o1.hip(t0), flight = Math.hypot(W.x - from0.x, W.z - from0.z) / 9.0, t1 = t0 + flight;
      // (124_05 from its ready stance before the catch: caught ~0.3 s in, then straight into its one dribble)
      const c0 = t1 - 0.3, catchSeg = { clip: '124_05', from: 1.6, at: c0, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: jump(),
        yawAbs: (p) => yawTo(p, o1.hip(t0)) + 8 * DEG };
      o3.segs.push(catchSeg);
      const O3 = o3.track(), release = simOf(catchSeg, 3.38);
      const push = findPushes(clips['124_05'], 2.1, 2.5, 'R')[0];
      P.pass = { from: { x: 0, y: 1.2, z: 0 }, t0, t1 }; P.hold = [t1, simOf(catchSeg, push.c0) - 0.1];
      P.dribble = [t1, simOf(catchSeg, push.c1) + 0.02]; P.gatherAt = simOf(catchSeg, 2.6); P.pushHand = 'R';
      planA.release = t0; planA.passDir = { x: W.x - from0.x, z: W.z - from0.z };
      // o2: down from the elbow into the screen on x3, set; then he slips to the rim
      const E = { x: -2.0, z: 4.7 };
      const o2 = new Player(clips, legs.o2, 'o2').start('ready', E, o1.hip(0));
      o2.go('runStop', PS, 0.2, 0.95); o2.hold('set', o2.lastArrive, B);
      o2.go('run', { x: -1.25, z: 1.55 }, tCut + 0.75, tCut + 1.65); o2.hold('ready', o2.lastArrive, (t) => o1.hip(t));
      const O2 = o2.track();
      // x3: on the shooter's high side; he chases the cut and runs into the screen, then takes the screener
      const x3At = toward(B, o1.hip(0), 0.8);
      const x3 = new Player(clips, legs.x3, 'x3').start('guard', x3At, B);
      x3.go('runStop', toward(PS, B, 0.62), tCut + 0.2, tCut + 0.65); x3.hold('guard', x3.lastArrive, (t) => O3.hip(t));
      x3.follow((t) => toward(O2.hip(t), o1.hip(t), 0.75), (t) => O2.hip(t), tCut + 0.75, this.simEnd - 0.3, { rt: 0.15, tolL: 0.45, tolF: [-0.5, 0.5], turnMax: 70 });
      // x2: with the screener all the way down, level with the screen on the lane side; on the cut he jumps out on
      // the high side, beats him to the wing and is there for the catch, then stays in front of the dribble
      const x2At = toward(E, RIM, 0.95), LV = { x: -2.05, z: 2.95 };
      const x2 = new Player(clips, legs.x2, 'x2').start('guard', x2At, o1.hip(0));
      x2.go('slideR', LV, 0.3, 1.0, { rmin: 0.6 }); x2.hold('guard', x2.lastArrive, (t) => O3.hip(t));
      const JUMP = toward(W, RIM, 1.25);
      x2.go('runStop', JUMP, tCut + 0.25, t1 - 0.05); x2.hold('tall', x2.lastArrive, (t) => O3.hip(t));
      x2.follow((t) => toward(O3.hip(t), RIM, 1.05), (t) => O3.hip(t), t1 + 0.1, release - 0.4, { rt: 0.12 });
      x2.hold('tall', Math.max(x2.lastArrive ?? 0, release - 0.38), (t) => O3.hip(t));
      // x1: on the ball
      const x1 = new Player(clips, legs.x1, 'x1').start('guard', toward(o1.hip(0), RIM, 1.15), o1.hip(0));
      x1.follow((t) => toward(o1.hip(t), RIM, 1.15), (t) => o1.hip(t), 0.1, this.simEnd - 0.3, { rt: 0.25 });
      const X1 = x1.track(), X2 = x2.track(), X3 = x3.track();
      P.contest = [{ from: t1 - 0.25, rise: 0.25, to: t1 + 0.5, fall: 0.3, side: 'L', reach: 0.1 }, { from: release - 0.32, rise: 0.25, to: release + 0.6, both: true, reach: 0.1 }];
      planA.contest = [];
      const tSw = tCut + 0.32;
      P.marks = { cut: tCut, switch: tSw, catch: t1 + 0.05, pass: t0 };
      P.camFilm = { focus: (t) => fade(t, t1 - 0.9, t1 + 0.1, { o3: 1.4, x2: 1.0, o2: 0.6, x3: 0.6, o1: 0.5 }, { o3: 1.6, x2: 1.2 }), off: { x: -0.7, y: 6.2, z: -8.4 }, lookOff: { x: 0.2, z: 0.9 }, lookY: 1.0, fov: 52, spread: 0.1, span0: 3.5 };
      P.camShot = { az: 0.22, back: 3.6, h: 2.5, fov: 58 };
      P.assign = [{ t: 0, map: { x1: 'o1', x2: 'o2', x3: 'o3' } }, { t: tSw, map: { x2: 'o3', x3: 'o2' } }];
      P.arrows = [
        { who: 'o3', from: tSw, to: tStop, at: tSw, until: t1, delay: 0.3 },
        { who: 'x2', from: tSw, to: x2.track ? t1 - 0.05 : t1, at: tSw, until: t1, color: 'def', delay: 1.2 },
        { who: 'x3', from: tSw, to: tCut + 1.9, at: tSw, until: t1, color: 'def', delay: 1.5 },
      ];
      P.arms = [{ who: 'o2', kind: 'screen', from: 0.95, to: tCut + 0.7 }];
      P.tags = [
        { who: 'o2', text: 'PIN-DOWN', kind: 'off', from: 0.85, to: tSw - 0.02 },
        { who: 'x2', text: 'JUMP IT!', kind: 'def', from: tSw, to: tSw + 0.7, delay: 1.0 },
        { who: 'x3', text: 'TAKE THE BIG', kind: 'def', from: tSw, to: tSw + 0.5, delay: 1.6 },
        { who: 'x2', text: 'HAND UP', kind: 'def', from: t1 - 0.15, to: t1 + 0.45 },
      ];
      P.clock = release + 6.2;
      log.push(`o1 top ${f2(o1.hip(0))} pass ${t0.toFixed(2)}->${t1.toFixed(2)} release ${release.toFixed(2)} stop ${f2(O3.hip(tStop))}`);
      for (const p of [o3, o2, x3, x2, x1]) log.push(...p.log);
      return { cast: { you: 'o3', d1: 'x2', A: 'o1' }, you: O3, d1: X2, partA: { tracks: { you: o1, d1: X2 }, plan: planA },
        extra: { o2: O2, x1: X1, x3: X3 }, players: { o1, o2: O2, o3: O3, x1: X1, x2: X2, x3: X3 }, log };
    },
  },
  // 3 - NO BACKDOOR. The wing (o3) is denied - his man (x3) is in the passing lane, hand in it - so he fakes up and
  // cuts backdoor. x3 opens to the ball and runs with him on the ball side, beats him to the rim and the help (x2)
  // is there too: no pass. The play is dead, the clock is running out, and o1 has to make something on his own -
  // crossovers going left and a pull-up with x1 sliding with him all the way.
  backdoor: {
    simEnd: 6.3,
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.1, miss: { side: 0.04, kick: 0.3 } },
    build(clips, legs) {
      const P = this.plan, log = [];
      // o1: triple threat at the top, looking for the wing (124_05's stance, kept alive); when the cut is covered and
      // the clock is going he has to go himself - one hard dribble, the 1-2 and the pull-up (124_05 on, as v10's
      // iso: the take's 60 deg turn taken out, he faces his man)
      const tGo = 2.85, A = { clip: '124_05', from: 1.8, at: 0, idle: { amp: 0.06, period: 1.5 } };
      const B = { clip: '124_05', from: 1.8, at: tGo, inert: 0.2, unwind: { from: 2.25, to: 3.12, ramp: 0.25 } };
      const C = { clip: '124_05', from: 3.12, at: simOf(B, 3.12), inert: 0.05, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: jump() };
      const push = findPushes(clips['124_05'], 2.1, 2.5, 'R')[0];
      P.hold = [0, simOf(B, push.c0) - 0.12]; P.dribble = [B.at, simOf(B, push.c1) + 0.02]; P.gatherAt = simOf(B, 2.6); P.pushHand = 'R';
      const tDrive = tGo, tOff = simOf(C, 3.17), release = simOf(C, 3.38), SPOT = { x: 0.75, z: 7.0 };
      const o1 = anchoredTrack(clips, [A, B, C], legs.o1, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      // o3: on the right wing, denied; he takes a step up to sell it, plants and cuts backdoor, then clears out to the
      // corner when there's nothing there
      const W3 = { x: 4.95, z: 5.35 }, o0 = o1.hip(0);
      const tUp = 0.55, tBD = 1.2, RIMSPOT = { x: 1.15, z: 1.05 }, CORNER = { x: 6.2, z: 0.75 };
      const o3 = new Player(clips, legs.o3, 'o3').start('ready', W3, o0);
      o3.go('runStop', toward(W3, o0, 0.75), tUp, tBD - 0.05); o3.hold('ready', o3.lastArrive, (t) => o1.hip(t));
      o3.go('run', lerp2(toward(W3, o0, 0.75), RIMSPOT, 0.5), tBD, tBD + 0.6); o3.go('runStop', RIMSPOT, o3.lastArrive, tBD + 1.2);
      o3.hold('ready', o3.lastArrive, (t) => o1.hip(t), { turn: 0 });
      o3.go('run', lerp2(RIMSPOT, CORNER, 0.5), tBD + 1.75, tBD + 2.35); o3.go('runStop', CORNER, o3.lastArrive, tBD + 3.0);
      o3.hold('ready', o3.lastArrive, (t) => o1.hip(t));
      const O3 = o3.track();
      // x3: denying - one pass away, in the lane, hand in it; he goes up with the fake and on the cut opens to the ball
      // and runs with him on the ball side, then follows him out
      const D = toward(lerp2(W3, o0, 0.24), RIM, 0.3);
      const x3 = new Player(clips, legs.x3, 'x3').start('guard', D, W3, 0);
      x3.follow((t) => toward(lerp2(O3.hip(t), o1.hip(t), 0.2), RIM, 0.3), (t) => O3.hip(t), 0.1, tBD + 0.1, { rt: 0.2 });
      // (he has the shorter way: from the lane straight to the spot between the rim and the ball, ahead of him)
      const BEAT = toward(RIMSPOT, o0, 0.95), xb = x3.hip(tBD + 0.12);
      x3.go('run', lerp2(xb, BEAT, 0.55), tBD + 0.14, tBD + 0.7); x3.go('runStop', BEAT, x3.lastArrive, tBD + 1.12);
      x3.hold('guard', x3.lastArrive, (t) => O3.hip(t));
      x3.follow((t) => toward(O3.hip(t), o1.hip(t), 0.9), (t) => O3.hip(t), tBD + 1.75, this.simEnd - 0.3, { rt: 0.15, tolL: 0.4, tolF: [-0.5, 0.5], turnMax: 70 });
      // the weak side: o2 on the left block, x2 in help in the lane - he steps over on the cut, then back
      const LB = { x: -2.3, z: 1.4 };
      const o2 = new Player(clips, legs.o2, 'o2').start('ready', LB, o0);
      o2.hold('ready', 0.3, (t) => o1.hip(t));
      const O2 = o2.track();
      const HELP = { x: -0.7, z: 2.7 };
      const x2 = new Player(clips, legs.x2, 'x2').start('guard', HELP, o0);
      x2.go('slideR', { x: -0.2, z: 2.3 }, tBD + 0.35, tBD + 1.0, { rmin: 0.6 }); x2.hold('guard', x2.lastArrive, (t) => O3.hip(t));
      x2.go('slideL', { x: -0.85, z: 2.75 }, tBD + 1.9, tBD + 2.6, { rmin: 0.6 }); x2.hold('guard', x2.lastArrive, (t) => o1.hip(t));
      // x1: on the ball, an arm's length and a bit off; on the drive he slides with it and contests the pull-up
      const x1 = new Player(clips, legs.x1, 'x1').start('guard', toward(o0, RIM, 1.2), o0);
      const gap = (t) => 1.25 - 0.3 * Math.min(1, Math.max(0, (t - tDrive) / (release - 0.4 - tDrive)));
      x1.follow((t) => toward(o1.hip(t), RIM, gap(t)), (t) => o1.hip(t), 0.1, release - 0.4, { rt: 0.2 });
      x1.hold('tall', Math.max(x1.lastArrive ?? 0, release - 0.38), (t) => o1.hip(t));
      const X1 = x1.track(), X2 = x2.track(), X3 = x3.track();
      P.contest = [{ from: release - 0.32, rise: 0.25, to: release + 0.6, both: true, reach: 0.1 }];
      P.marks = { cut: tBD + 0.12, dead: tBD + 1.05 };
      P.camFilm = { focus: (t) => fade(t, tBD + 1.1, tBD + 1.9, { o3: 1.2, x3: 1.2, o1: 1.0, x1: 0.5, x2: 0.3 }, { o1: 1.6, x1: 1.2 }), off: { x: 0.4, y: 5.8, z: 8.8 }, lookOff: { x: 0, z: -1.6 }, lookY: 1.0, fov: 52, spread: 0.1, span0: 3.5 };
      P.camShot = { az: 0.22, back: 3.6, h: 2.5, fov: 58 };
      P.assign = [{ t: 0, map: { x1: 'o1', x2: 'o2', x3: 'o3' } }];
      P.arrows = [
        { who: 'o3', from: tBD + 0.12, to: tBD + 1.2, at: tBD + 0.12, until: tBD + 1.3, delay: 0.3 },
        { who: 'x3', from: tBD + 0.12, to: tBD + 1.15, at: tBD + 0.12, until: tBD + 1.3, color: 'def', delay: 1.1 },
        { who: 'x2', from: tBD + 0.3, to: tBD + 1.0, at: tBD + 0.12, until: tBD + 1.3, color: 'def', delay: 1.5 },
      ];
      P.arms = [{ who: 'x3', kind: 'deny', from: 0, to: tBD + 0.05 }, { who: 'x3', kind: 'deny', from: tBD + 0.7, to: tBD + 1.6 }];
      P.tags = [
        { who: 'x3', text: 'DENY', kind: 'def', from: 0.15, to: tBD - 0.1 },
        { who: 'o3', text: 'BACKDOOR', kind: 'off', from: tBD + 0.12, to: tBD + 0.5, delay: 0.25 },
        { who: 'x3', text: 'OPEN UP & RUN', kind: 'def', from: tBD + 0.12, to: tBD + 0.5, delay: 1.0 },
        { who: 'o1', text: 'NOTHING THERE', kind: 'bad', from: tBD + 1.05, to: tBD + 1.6, delay: 0.3 },
        { who: 'x1', text: 'NO AIR SPACE', kind: 'def', from: release - 0.55, to: release + 0.2 },
      ];
      P.clock = release + 1.4;
      log.push(`o1 start ${f2(o0)} drive ${tDrive.toFixed(2)} release ${release.toFixed(2)} spot ${f2(SPOT)}`);
      for (const p of [o3, x3, x2, x1]) log.push(...p.log);
      return { cast: { you: 'o1', d1: 'x1' }, you: o1, d1: X1, extra: { o2: O2, o3: O3, x2: X2, x3: X3 }, players: { o1, o2: O2, o3: O3, x1: X1, x2: X2, x3: X3 }, log };
    },
  },
  // 4 - SCRAM THE MISMATCH. After a switch the guard (x1) is on the big (o2), who has him sealed on the block, and
  // the big (x2) is out on the ball handler. Nobody waits for the entry pass: the weak-side defender (x3) sprints
  // over and fronts the big, and only then does x1 run out to x3's man on the wing - a scram. Back to size on size.
  // x2 stays down on the guard, gives him a cushion, and he settles for a jumper over a big.
  scram: {
    simEnd: 5.9,
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.15, miss: { side: -0.04, kick: 0.3 } },
    build(clips, legs) {
      const P = this.plan, log = [];
      // o1: 06_13's walk-up dribbles, crossovers and the snatch back, cut (tools/transit.py) into 124_05's 1-2 and
      // pull-up (as v15)
      const A = { clip: '06_13', from: 0.35, at: 0 }, tStop = simOf(A, 3.583);
      const C = { clip: '124_05', from: 2.733, at: tStop, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: jump() };
      const pushes = findPushes(clips['06_13'], 2.8, 3.583), lastP = pushes[pushes.length - 1];
      P.dribble = [0.05, simOf(A, lastP.c1) + 0.02]; P.gatherAt = Math.max(simOf(A, lastP.c1) + 0.2, tStop - 0.02);
      const tOff = simOf(C, 3.17), release = simOf(C, 3.38), SPOT = { x: 2.55, z: 6.25 };
      const o1 = anchoredTrack(clips, [A, C], legs.o1, tOff, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      const o0 = o1.hip(0);
      // o2: posting on the right block, sealing, a target hand up
      const PB = { x: 2.2, z: 1.55 };
      const o2 = new Player(clips, legs.o2, 'o2').start('set', PB, o0, 0);
      o2.hold('set', 0.4, (t) => o1.hip(t));
      const O2 = o2.track();
      // o3: spotted up on the left wing
      const LW = { x: -4.75, z: 5.1 };
      const o3 = new Player(clips, legs.o3, 'o3').start('ready', LW, o0);
      o3.hold('ready', 0.4, (t) => o1.hip(t));
      const O3 = o3.track();
      // x1: the guard stuck behind the big; when x3 gets there he runs out to the wing
      const x1At = toward(PB, RIM, 0.62);
      const tScram = 0.75, x3At = toward(toward(LW, o0, 1.3), RIM, 0.6), FRONT = toward(PB, o0, 0.72);
      const x1 = new Player(clips, legs.x1, 'x1').start('guard', x1At, PB);
      // x3: sags off his man in the gap; on "scram!" he sprints across and fronts the big on the high side
      const x3 = new Player(clips, legs.x3, 'x3').start('guard', x3At, o0);
      x3.go('run', { x: -0.4, z: 3.35 }, tScram, tScram + 0.85); x3.go('runStop', FRONT, x3.lastArrive, tScram + 1.6);
      x3.hold('guard', x3.lastArrive, (t) => O2.hip(t));
      const tGo = x3.lastArrive - 0.15;
      x1.go('run', { x: -0.6, z: 2.1 }, tGo, tGo + 0.8); x1.go('runStop', toward(LW, RIM, 1.1), x1.lastArrive, tGo + 1.75);
      x1.hold('tall', x1.lastArrive, (t) => O3.hip(t));
      // x2: the big on the guard - a cushion, chest in front, in front of the 1-2 and up with him
      const x2 = new Player(clips, legs.x2, 'x2').start('guard', toward(o0, RIM, 1.45), o0);
      const gap = (t) => 1.45 - 0.45 * Math.min(1, Math.max(0, (t - (tStop - 0.6)) / 0.6));
      x2.follow((t) => toward(o1.hip(t), RIM, gap(t)), (t) => o1.hip(t), 0.1, release - 0.4, { rt: 0.22 });
      x2.hold('tall', Math.max(x2.lastArrive ?? 0, release - 0.38), (t) => o1.hip(t));
      const X1 = x1.track(), X2 = x2.track(), X3 = x3.track();
      P.contest = [{ from: release - 0.32, rise: 0.25, to: release + 0.6, both: true, reach: 0.12 }];
      P.marks = { scram: tScram, fixed: tGo + 0.1 };
      P.camFilm = { focus: (t) => fade(t, tGo + 0.3, tGo + 1.2, { o1: 1.0, x2: 0.8, o2: 1.0, x1: 1.0, x3: 1.2 }, { o1: 1.6, x2: 1.3, o2: 0.3, x3: 0.3 }), off: { x: -0.2, y: 6.0, z: 9.0 }, lookOff: { x: 0, z: -1.5 }, lookY: 1.0, fov: 52, spread: 0.2, span0: 3.0 };
      P.camShot = { az: 0.22, back: 3.6, h: 2.5, fov: 58 };
      P.assign = [{ t: 0, map: { x1: 'o2', x2: 'o1', x3: 'o3' } }, { t: tScram, map: { x3: 'o2' } }, { t: tGo + 0.1, map: { x1: 'o3' } }];
      P.bad = [{ x: 'x1', from: 0, to: tGo + 0.1 }, { x: 'x2', from: 0, to: tScram }];
      P.arrows = [
        { who: 'x3', from: tScram, to: x3.lastArrive ?? tScram + 1.6, at: tScram, until: tGo + 0.6, color: 'def', delay: 0.6 },
        { who: 'x1', from: tGo, to: tGo + 1.75, at: tScram, until: tGo + 1.2, color: 'def', delay: 1.3 },
      ];
      P.arms = [{ who: 'o2', kind: 'deny', from: 0, to: tScram + 1.4 }];
      P.tags = [
        { who: 'x1', text: 'MISMATCH', kind: 'bad', from: 0.05, to: tScram + 0.3 },
        { who: 'x3', text: 'SCRAM!', kind: 'def', from: tScram, to: tScram + 0.6, delay: 0.5 },
        { who: 'x1', text: 'GO!', kind: 'def', from: tGo, to: tGo + 0.5 },
      ];
      P.clock = release + 1.6;
      log.push(`o1 start ${f2(o0)} stop ${tStop.toFixed(2)} release ${release.toFixed(2)}; x1 goes ${tGo.toFixed(2)}`);
      for (const p of [x3, x1, x2]) log.push(...p.log);
      return { cast: { you: 'o1', d1: 'x2' }, you: o1, d1: X2, extra: { o2: O2, o3: O3, x1: X1, x3: X3 }, players: { o1, o2: O2, o3: O3, x1: X1, x2: X2, x3: X3 }, log };
    },
  },
};

export function buildRep(name, clips, legs) { return REPS[name].build(clips, legs); }
