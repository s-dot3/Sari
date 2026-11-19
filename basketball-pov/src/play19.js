// v19 "Downhill": attacking the rim without giving the ball away - the drive, the finish in a crowd, the finish
// through contact, and the kick-out with no turnover. Everyone on offence is real basketball mocap with the ball
// tracked (SkillMimic's BallPlay-M: his own dribbles, layups, spin finishes, pass and jump shot, the ball where it
// really was); the defence is CMU's defensive takes with v14's footwork planner.
//  1 hip    - a right-hand drive (bp_run_183, cut into bp_layup's last dribble) past his man: once the shoulder is past
//             his hip he's behind you; he reaches from behind and the ball's on the outside hand - nothing there
//  2 crowd  - the help big steps up; the spin (bp_turnhook) takes it away from him, he jumps at the ball going up in
//             the spin, and you go up off two feet as he comes down, left hand, high off the glass
//  3 contact- the help is set in the lane; the shoulder goes into his chest first (bp_turnlayup's last turn into a
//             two-foot power finish), the ball high and tight, and up through it off the glass
//  4 kick   - drive, the shooter's man helps; jump stop on two feet, pivot, and the pass (bp_pass) to the shooter's
//             pocket away from the help's hands the moment he commits; catch and shoot (bp_shot_style2)
// Court: rim at (0,0), offense attacks -z.
import { RIM } from './play5.js';
import { Track } from './animator.js';
import { Player, yawTo, simOf, toward, lerp2 } from './moves16.js';
import * as THREE from 'three';

export const CLIPS19 = ['bp_run_183', 'bp_run_823', 'bp_layup', 'bp_turnhook', 'bp_turnlayup', 'bp_pass', 'bp_shot_style2',
  '124_05', '78_30', '78_24', '78_25', '78_26', '78_27', '78_12', '78_28'];
// the four: offence in white, defence in red; heights as built (they read ~3% shorter in their stance)
export const CAST = {
  o1: { model: '04', tex: 'guard3', height: 2.06, team: 'O', role: 'guard' },
  o2: { model: '04', tex: 'wing', height: 2.14, team: 'O', role: 'wing' },
  x1: { model: '02', tex: 'd3', height: 2.06, team: 'X', role: 'guard' },
  x2: { model: '02', tex: 'd2', height: 2.24, team: 'X', role: 'big' },
};
// leg lengths (hip joint to ankle) of the built rigs - the browser measures its own; these are for tools/plan19.mjs
export const LEGS = { o1: 0.9056, o2: 0.9408, x1: 0.9056, x2: 0.9848 };
const RT = 0.25; // a reaction time (Singh 2020: 0.225 s visual reaction in basketball players)
const f2 = (p) => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// the camera's weights on the players, eased from one set to another between a and b
const fade = (t, a, b, A, B) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))), e = u * u * (3 - 2 * u), out = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) out[k] = (A[k] ?? 0) * (1 - e) + (B[k] ?? 0) * e; return out; };

// A take laid down by its path: at tRef the hips are on `spot`, and the way they came from t=0 points from `from`
// (a drive is placed by where it starts and where it finishes, whatever way the performer was facing in the lab)
function pathTrack(clips, segs, leg, tRef, spot, from, t0 = 0) {
  const trial = new Track(clips, segs.map((s, i) => i ? { ...s } : { ...s, place: { x: 0, z: 0, yaw: 0 } }), leg);
  const a = trial.hip(t0), b = trial.hip(tRef), have = Math.atan2(b.x - a.x, b.z - a.z), want = Math.atan2(spot.x - from.x, spot.z - from.z);
  const r = wrap(want - have), c = Math.cos(r), s = Math.sin(r);
  // rotate the first segment's placement about the origin by r, then shift so the hips land on the spot at tRef
  const bx = b.x * c + b.z * s, bz = -b.x * s + b.z * c;
  return new Track(clips, segs.map((sg, i) => i ? { ...sg } : { ...sg, place: { x: spot.x - bx, z: spot.z - bz, yaw: r } }), leg);
}
// where someone's hips are against another's, along the second one's way to the rim: + ahead of him, - behind
const along = (tr, other, t) => { const a = tr.hip(t), o = other.hip(t), d = toward(o, RIM, 1); const fx = d.x - o.x, fz = d.z - o.z; return (a.x - o.x) * fx + (a.z - o.z) * fz; };
// first moment from t0 that a track's hips pass level with another's on his way to the rim (shoulder past the hip)
function levelWith(you, him, t0, t1) { for (let t = t0; t < t1; t += 0.01) if (along(you, him, t) > 0) return t; return t1; }
// which of a defender's hands is nearer a point (by his facing at t)
function nearHand(tr, t, p) { const T = tr.at(t), l = T.pos.lradius, r = T.pos.rradius; return Math.hypot(p.x - l.x, p.z - l.z) < Math.hypot(p.x - r.x, p.z - r.z) ? 'L' : 'R'; }
// the driver's way (unit, on the floor) at t, and his left
function wayAt(tr, t) { const p = tr.hip(t), q = tr.hip(t + 0.12), L = Math.hypot(q.x - p.x, q.z - p.z) || 1, f = { x: (q.x - p.x) / L, z: (q.z - p.z) / L }; return { p, f, l: { x: f.z, z: -f.x } }; }
// The man on the ball, beaten by the first step: in his stance in front, a little off the line the drive takes
// (`gap` m to the driver's left, `side` -1 for his right), he slides across to cut it off - late - and the driver's
// shoulder goes by his hip at tBy; a reaction time later he turns and runs with him, behind his hip on that side
// (chase: [back, off] m), until `until`
function beatenMan(clips, leg, you, tBy, until, o = {}) {
  const side = o.side ?? 1, gap = o.gap ?? 0.85, slide = o.slide ?? 0.25, [back, off] = o.chase ?? [0.55, 0.8];
  const W = wayAt(you, tBy), at = (d, a = 0) => ({ x: W.p.x + W.l.x * side * d + W.f.x * a, z: W.p.z + W.l.z * side * d + W.f.z * a });
  const D0 = at(gap, 0.15), D1 = at(gap - slide, 0.05), x = new Player(clips, leg, o.name ?? 'x1').start('guard', D0, you.hip(0));
  // (which of the stance's slides takes him across: toward the line, seen from where he faces)
  const fx = you.hip(0).x - D0.x, fz = you.hip(0).z - D0.z, fl = Math.hypot(fx, fz) || 1, lft = { x: fz / fl, z: -fx / fl };
  x.go((D1.x - D0.x) * lft.x + (D1.z - D0.z) * lft.z > 0 ? 'slideL' : 'slideR', D1, 0.12, tBy - 0.02, { rmin: 0.7 });
  // (behind him along the drive's overall way - from where he went by to where he finishes - not his step of the
  // moment, which swings about when he stops, spins or lands)
  const e = you.hip(o.dirTo ?? until - 0.3), dl = Math.hypot(e.x - W.p.x, e.z - W.p.z) || 1, F = { x: (e.x - W.p.x) / dl, z: (e.z - W.p.z) / dl }, Lf = { x: F.z, z: -F.x };
  const chase = (t) => { const h = you.hip(t); return { x: h.x - F.x * back + Lf.x * side * off, z: h.z - F.z * back + Lf.z * side * off }; };
  x.go('run', chase(until), tBy + RT, until, { rmin: 0.75, rmax: 1.6 });
  x.hold('tall', x.lastArrive, (t) => you.hip(t));
  return x;
}

export const REPS = {
  // 1 - HIP TO HIP. Attack his lead foot; the moment your shoulder is past his hip he's behind you and can't get back
  // in front. He reaches from behind - the ball's on your outside hand, your body between - and the layup goes in
  // off the glass.
  hip: {
    simEnd: 4.6,
    plan: { rec: true, flight: 0, camRef: 0.6, camAngle: 0.55, camSide: 1, camH: 2.0, floorInShot: true },
    build(clips, legs) {
      const P = this.plan, log = [];
      // o1: bp_run_183 (flat out, right hand) cut at the top of its second dribble into bp_layup's, the one-dribble
      // layup: the bounce, two steps, off the left foot and the right hand up off the glass (released at 2.13)
      const A = { clip: 'bp_run_183', from: 0.0, at: 0 }, tCut = simOf(A, 0.85);
      const B = { clip: 'bp_layup', from: 0.33, at: tCut, blend: 0.2, shot: true };
      const release = simOf(B, 2.13), START = { x: 3.1, z: 6.6 }, SPOT = { x: 0.95, z: 0.75 };
      const o1 = pathTrack(clips, [A, B], legs.o1, release, SPOT, START);
      P.layup = { releaseClip: 2.13, side: 'R', oneHand: 0 }; P.takeoffAt = simOf(B, 2.06); P.gatherAt = simOf(B, 1.4);
      // x1: in his stance in front, a little off the line; he slides across late, the shoulder goes by his hip, and a
      // reaction time later he's turned and running with him on his inside, behind the hip - and reaches
      const tHip = 0.62, x1 = beatenMan(clips, legs.x1, o1, tHip, release + 0.35, { gap: 0.82, slide: 0.22, chase: [0.45, 0.72] });
      const X1 = x1.track();
      // his reach: as the shoulder goes by, the hand nearer the ball goes across at it - and comes up short: the ball
      // is on the far hand with the body in between
      const tSwipe = tHip - 0.06, ballAt = o1.at(tSwipe + 0.2).pos.ball;
      P.swipe = [{ from: tSwipe, to: tSwipe + 0.42, rise: 0.18, side: nearHand(X1, tSwipe + 0.2, ballAt), gap: 0.45 }];
      P.contest = [];
      P.marks = { hip: tHip - 0.1, swipe: tSwipe + 0.26, finish: release - 0.35 };
      P.labels = [{ t: 0, kind: 'attack' }, { t: tHip - 0.12, kind: 'hip' }, { t: tSwipe + 0.12, kind: 'shield' }, { t: release - 0.3, kind: 'glass' }];
      P.tags = [
        { who: 'o1', text: 'HIP TO HIP', kind: 'off', from: tHip - 0.1, to: tHip + 0.15, shot: true, delay: 0.3 },
        { who: 'x1', text: 'REACHING', kind: 'def', from: tSwipe + 0.26, to: tSwipe + 0.7, shot: true, delay: 0.4 },
      ];
      P.arrows = [{ who: 'o1', from: 0.0, to: release, at: 0, until: tHip + 0.2, delay: 0.1 }];
      log.push(`o1 ${f2(o1.hip(0))} -> ${f2(o1.hip(release))} release ${release.toFixed(2)} hip ${tHip.toFixed(2)} swipe ${tSwipe.toFixed(2)} (${P.swipe[0].side})`, ...x1.log);
      return { cast: { you: 'o1', d1: 'x1' }, you: o1, d1: X1, extra: {}, players: { o1, x1: X1 }, log };
    },
  },
  // 2 - THE CROWD. Downhill, and the big steps up to meet you at the rim. Spin away from him: he jumps at the ball
  // as it comes up in the spin - and you go up off two feet as he comes down, left hand, off the glass, his man
  // still behind you.
  crowd: {
    simEnd: 4.9,
    plan: { rec: true, flight: 0, camRef: 1.5, camAngle: 0.6, camSide: 1, camH: 2.1, floorInShot: true },
    build(clips, legs) {
      const P = this.plan, log = [];
      // o1: bp_run_823 cut at its push into the floor into bp_turnhook's: the bounce, the spin (0.5-1.5), both feet,
      // up at 1.67 and the left hand over the top at 2.08
      const A = { clip: 'bp_run_823', from: 0.2, at: 0 }, tCut = simOf(A, 0.85);
      const B = { clip: 'bp_turnhook', from: 0.15, at: tCut, blend: 0.22, shot: true };
      const release = simOf(B, 2.08), START = { x: -1.6, z: 7.0 }, SPOT = { x: -0.55, z: 0.95 };
      const o1 = pathTrack(clips, [A, B], legs.o1, release, SPOT, START);
      P.layup = { releaseClip: 2.08, side: 'L', oneHand: 0 }; P.takeoffAt = simOf(B, 1.66); P.gatherAt = simOf(B, 1.35);
      const tSpin = simOf(B, 0.55), tUp = simOf(B, 1.0);
      // x2, the big: on the weak-side block, he steps up to meet the drive - on its right, where the ball is going -
      // and jumps at the ball as it comes up in the spin (124_05's jump, both hands up); he's coming down when the shot
      // goes up off two feet on the other side of him
      const tJump = tUp + 0.08, TO = wayAt(o1, P.takeoffAt - 0.25), MEET = { x: TO.p.x - TO.l.x * 1.15 + TO.f.x * 0.4, z: TO.p.z - TO.l.z * 1.15 + TO.f.z * 0.4 };
      const BLOCK = { x: MEET.x * 0.4 + 1.9 * 0.6, z: 1.1 };
      const x2 = new Player(clips, legs.x2, 'x2').start('guard', BLOCK, o1.hip(0));
      x2.go('runStop', MEET, 0.4, tJump - 0.42, { rmin: 0.75 });
      if (x2.lastArrive < tJump - 0.3) x2.hold('tall', x2.lastArrive, (t) => o1.hip(t));
      x2.segs.push({ clip: '124_05', from: 3.0, at: tJump - 0.17, inert: 0.2, yawAbs: (p) => yawTo(p, o1.hip(tJump)), compress: { from: 3.15, to: 3.72, k: 0.15, ramp: 0.12 } });
      const tLand = tJump + 0.55;
      x2.hold('tall', tLand + 0.08, (t) => o1.hip(t));
      const X2 = x2.track();
      // x1: on the ball and beaten off the first step - running with him, behind his hip, well back
      const x1 = beatenMan(clips, legs.x1, o1, 0.55, release + 0.3, { gap: 0.85, chase: [1.2, 0.9], dirTo: P.takeoffAt });
      const X1 = x1.track();
      P.contest = [{ from: tJump - 0.05, rise: 0.18, to: tLand - 0.08, fall: 0.25, both: true, reach: 0.2 }];
      P.marks = { help: tSpin - 0.2, jump: tJump + 0.2, up: P.takeoffAt + 0.05 };
      P.labels = [{ t: 0, kind: 'attack' }, { t: tSpin - 0.2, kind: 'help' }, { t: tSpin, kind: 'spin' }, { t: tJump + 0.1, kind: 'early' }, { t: P.takeoffAt - 0.15, kind: 'twofeet' }];
      P.tags = [
        { who: 'x2', text: 'HELP', kind: 'def', from: tSpin - 0.35, to: tSpin + 0.3, shot: true },
        { who: 'x2', text: 'LEFT HIS FEET', kind: 'def', from: tJump + 0.2, to: tLand, shot: true, delay: 0.4 },
        { who: 'o1', text: 'TWO FEET', kind: 'off', from: P.takeoffAt - 0.2, to: release, shot: true },
      ];
      log.push(`o1 ${f2(o1.hip(0))} -> ${f2(o1.hip(release))} spin ${tSpin.toFixed(2)} up ${P.takeoffAt.toFixed(2)} release ${release.toFixed(2)} | x2 meets ${f2(MEET)} jump ${tJump.toFixed(2)} land ${tLand.toFixed(2)}`, ...x2.log, ...x1.log);
      return { cast: { you: 'o1', d1: 'x2' }, you: o1, d1: X2, extra: { x1: X1 }, players: { o1, x1: X1, x2: X2 }, log };
    },
  },
  // 3 - HIT FIRST. The help is set in the lane, feet down - you can't go round him. Turn the shoulder into his chest
  // first, before he can hit your arms, off two feet, ball high and tight, and finish up through it off the glass.
  contact: {
    simEnd: 4.0,
    plan: { rec: true, flight: 0, camRef: 1.3, camAngle: 0.3, camSide: 1, camH: 1.9, floorInShot: true },
    build(clips, legs) {
      const P = this.plan, log = [];
      // o1: bp_run_183 cut at the top of its second dribble into bp_turnlayup's last quarter turn, the stop on both
      // feet (1.47), up at 1.73 and the left hand up off the glass at 2.13
      const A = { clip: 'bp_run_183', from: 0.0, at: 0 }, tCut = simOf(A, 0.9);
      const B = { clip: 'bp_turnlayup', from: 1.22, at: tCut, blend: 0.22, shot: true };
      const release = simOf(B, 2.13), START = { x: 1.2, z: 6.8 }, SPOT = { x: 0.35, z: 1.05 };
      const o1 = pathTrack(clips, [A, B], legs.o1, release, SPOT, START);
      P.layup = { releaseClip: 2.13, side: 'L', oneHand: 0 }; P.takeoffAt = simOf(B, 1.72); P.gatherAt = simOf(B, 1.45);
      // x2: from the weak side, over into the lane and set (feet down, square, hands up) before he gets there, in his
      // path a body's width off where he takes off
      const tHit = P.takeoffAt - 0.04, path = o1.hip(tHit), SET = toward(path, RIM, 0.55);
      const x2 = new Player(clips, legs.x2, 'x2').start('guard', { x: -2.0, z: 1.6 }, o1.hip(0));
      x2.go('runStop', SET, 0.2, tHit - 0.45, { rmin: 0.75 });
      x2.hold('set', x2.lastArrive, (t) => o1.hip(t));
      const X2 = x2.track();
      // x1: beaten off the first step, behind his hip
      const x1 = beatenMan(clips, legs.x1, o1, 0.5, release + 0.3, { gap: 0.85, chase: [1.2, 0.9], dirTo: P.takeoffAt });
      const X1 = x1.track();
      P.contact = { t: tHit, push: 0.24, you: 0.07 };
      P.contest = [{ from: tHit - 0.35, rise: 0.25, to: release + 0.3, both: true, reach: -0.14 }];
      P.marks = { set: tHit - 0.4, hit: tHit + 0.06 };
      P.labels = [{ t: 0, kind: 'attack' }, { t: tHit - 0.45, kind: 'set' }, { t: tHit - 0.12, kind: 'hit' }, { t: release - 0.1, kind: 'and1' }];
      P.tags = [
        { who: 'x2', text: 'SET', kind: 'def', from: tHit - 0.45, to: tHit - 0.05, shot: true },
        { who: 'o1', text: 'HIT FIRST', kind: 'off', from: tHit, to: release, shot: true, delay: 0.5 },
        { who: 'o1', text: 'AND-ONE', kind: 'off', from: release + 0.45, to: release + 1.2, shot: true },
      ];
      log.push(`o1 ${f2(o1.hip(0))} -> ${f2(o1.hip(release))} hit ${tHit.toFixed(2)} release ${release.toFixed(2)} | x2 set ${f2(SET)}`, ...x2.log, ...x1.log);
      return { cast: { you: 'o1', d1: 'x2' }, you: o1, d1: X2, extra: { x1: X1 }, players: { o1, x1: X1, x2: X2 }, log };
    },
  },
  // 4 - THE KICK. Downhill, and the shooter's man comes off him to help. Jump stop on two feet - no charge, no
  // travel, both pivots - eyes on the rim; the moment his second foot is in the paint, the pass to the shooter's
  // pocket, away from his hands. Catch, shoot.
  kick: {
    simEnd: 4.7,
    plan: { rec: true, shotClip: 0.842, flight: 1.2, camRef: 2.4, camAngle: 0.8, camSide: -1, camH: 2.2 },
    build(clips, legs) {
      const P = this.plan, log = [];
      // o1, the passer: bp_run_823 into a stop on both feet, turned to the shooter, set a beat (bp_pass's own stance,
      // ball at the chest), and bp_pass's two-hand pass (released at 0.33)
      const A = { clip: 'bp_run_823', from: 0.2, at: 0 }, tStop = simOf(A, 1.22);
      const START = { x: -2.6, z: 6.6 }, STOP = { x: -0.6, z: 3.2 }, WING = { x: 4.9, z: 4.55 };
      const trialA = pathTrack(clips, [A], legs.o1, tStop, STOP, START);
      const B = { clip: 'bp_pass', from: 0.0, at: tStop, blend: 0.3, idle: { amp: 0.02, period: 1.4 }, yawAbs: (p) => yawTo(p, WING) };
      const tPass = tStop + 0.42, C = { clip: 'bp_pass', from: 0.02, at: tPass - 0.31, blend: 0.12 };
      const o1 = pathTrack(clips, [A, B, C], legs.o1, tStop, STOP, START);
      const planA = { rec: true, passOut: true, release: tPass, gatherAt: tStop, lookRim: [tStop - 0.6, tPass - 0.12] };
      // o2, the shooter: spotted up on the right wing behind the line, ready (bp_shot_style2's own stance, hands in
      // his pocket); the pass gets there in 0.55 s and he goes straight up into the shot off the catch
      const t1 = tPass + 0.55;
      const S0 = { clip: 'bp_shot_style2', from: 0.0, at: 0, idle: { amp: 0.015, period: 1.6 } };
      const S1 = { clip: 'bp_shot_style2', from: 0.04, at: t1 - 0.04, blend: 0.08, shot: true, unwind: { from: 0.56, to: 0.97, ramp: 0.08 } };
      const tRel = simOf(S1, 0.842);
      const o2 = new Track(clips, [{ ...S0, place: { x: WING.x, z: WING.z, yaw: yawTo(WING, lerp2(o1.hip(tPass), RIM, 0.5)) } }, { ...S1, blend: 0.15, yawAbs: () => yawTo(WING, RIM) }], legs.o2);
      P.pass = { from: { x: 0, y: 1.3, z: 0 }, t0: tPass, t1 }; P.gatherAt = t1;
      // x2, on the shooter: a stride off him toward the rim, then he helps - two steps into the lane at the drive -
      // and once the ball's gone he has to close out from there: late
      const x2 = new Player(clips, legs.x2, 'x2').start('guard', toward(WING, RIM, 1.3), o1.hip(0));
      // (in the paint between him and the rim - committed to the ball - with the lane to the wing behind him, out of
      // his reach)
      const HELP = { x: STOP.x + (RIM.x - STOP.x) * 0.45 + (WING.x - STOP.x) * 0.12, z: STOP.z + (RIM.z - STOP.z) * 0.45 + (WING.z - STOP.z) * 0.12 };
      x2.go('runStop', HELP, tStop - 0.75, tPass - 0.08, { rmin: 0.75 });
      x2.hold('guard', x2.lastArrive, (t) => o1.hip(t));
      x2.go('runStop', toward(WING, RIM, 1.0), tPass + 0.12, tRel - 0.02, { rmin: 0.75 });
      x2.hold('tall', x2.lastArrive, (t) => o2.hip(t));
      const X2 = x2.track();
      // x1: on the ball, beaten off the first step, behind his hip when he stops
      const x1 = beatenMan(clips, legs.x1, o1, 0.5, tStop + 0.3, { gap: 0.85, chase: [1.1, 0.95], dirTo: tStop });
      const X1 = x1.track();
      // (his reach into the passing lane comes up short: the pass goes the other side of him)
      P.contest = [{ from: tRel - 0.1, rise: 0.25, to: tRel + 0.5, side: 'L', reach: 0.05, late: true }];
      planA.contest = [];
      P.marks = { commit: tPass - 0.08, pass: tPass + 0.12, catch: t1 + 0.02 };
      P.labels = [{ t: 0, kind: 'attack' }, { t: tStop - 0.1, kind: 'stop' }, { t: tPass - 0.25, kind: 'commit' }, { t: tPass, kind: 'kick' }, { t: t1, kind: 'pocket' }];
      P.tags = [
        { who: 'o1', text: 'JUMP STOP', kind: 'off', from: tStop - 0.05, to: tPass - 0.1 },
        { who: 'x2', text: 'HELP', kind: 'def', from: tStop - 0.5, to: tPass + 0.15 },
        { who: 'o2', text: 'POCKET', kind: 'off', from: t1 - 0.15, to: t1 + 0.4 },
      ];
      P.arrows = [{ who: 'x2', from: tStop - 0.75, to: tPass - 0.08, at: P.marks.commit, until: tPass + 0.4, color: 'def', delay: 0.6 }];
      P.camFilm = { focus: (t) => fade(t, tPass - 0.1, t1 + 0.3, { o1: 1.3, x2: 1.0, o2: 1.0, x1: 0.3 }, { o2: 1.5, x2: 1.0, o1: 0.5 }), off: { x: -0.4, y: 6.2, z: 7.4 }, lookY: 0.5, fov: 58, spread: 0.12, span0: 3.0 };
      Object.assign(P, { camRef: tRel - 0.4 });
      log.push(`o1 ${f2(o1.hip(0))} stop ${f2(o1.hip(tStop))} pass ${tPass.toFixed(2)} -> catch ${t1.toFixed(2)} release ${tRel.toFixed(2)} | x2 help ${f2(HELP)}`, ...x2.log, ...x1.log);
      return { cast: { you: 'o2', d1: 'x2', A: 'o1' }, you: o2, d1: X2, partA: { tracks: { you: o1, d1: X2 }, plan: planA },
        extra: { x1: X1 }, players: { o1, o2, x1: X1, x2: X2 }, log };
    },
  },
};

export function buildRep(name, clips, legs) { return REPS[name].build(clips, legs); }
