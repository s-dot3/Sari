// v20 "Two Moves Max": one read, two moves. Move 1 is the in-and-out - a hard dribble out, snatched back; his hips
// open or they don't. Open: rise, his weight's going the other way. Square: move 2, one hard dribble by him, into his
// hip and past. Never a third. The shooter is real basketball mocap with the ball tracked (SkillMimic's BallPlay-M):
// bp_back's out-and-back dribble (out in front at 1.25-1.55, snatched back to his side by 1.9, feet planted), cut into
// bp_shot_style1's dip and jump shot, or into bp_layup's one hard dribble, two steps and layup. His man is CMU's
// defensive takes with v14's footwork planner, the same man both times - he bites once and doesn't the second time.
// Court: rim at (0,0), offense attacks -z.
import { anchoredTrack, RIM } from './play5.js';
import { Track } from './animator.js';
import { Player, yawTo, simOf, toward } from './moves16.js';

export const CLIPS20 = ['bp_back', 'bp_shot_style1', 'bp_layup', '78_24', '78_25', '78_27', '78_28', '78_30', '124_05'];
const RT = 0.25; // a reaction time (Singh 2020: 0.225 s visual reaction in basketball players)
const f2 = (p) => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// where the move happens (the right elbow, extended - a 15-footer or a drive) and the take's moments (clip s)
const SPOT = { x: 2.6, z: 4.25 };
const MOVE1 = { from: 1.1, out: 1.3, bounce: 1.55, back: 1.88 };
// the out-and-back dribble: from the ball in his right hand out front, to the moment it's back at his side
const move1 = () => ({ clip: 'bp_back', from: MOVE1.from, at: 0 });
// A take laid down by its path: at tRef the hips are on `spot`, and the way they came from t0 points from `from`
function pathTrack(clips, segs, leg, tRef, spot, from, t0 = 0) {
  const trial = new Track(clips, segs.map((s, i) => i ? { ...s } : { ...s, place: { x: 0, z: 0, yaw: 0 } }), leg);
  const a = trial.hip(t0), b = trial.hip(tRef), have = Math.atan2(b.x - a.x, b.z - a.z), want = Math.atan2(spot.x - from.x, spot.z - from.z);
  const r = wrap(want - have), c = Math.cos(r), s = Math.sin(r), bx = b.x * c + b.z * s, bz = -b.x * s + b.z * c;
  return new Track(clips, segs.map((sg, i) => i ? { ...sg } : { ...sg, place: { x: spot.x - bx, z: spot.z - bz, yaw: r } }), leg);
}
// after the bite: he has to stop and re-plant, then the closeout - timed to get there just as the ball goes up
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
// the way the ball went on the dribble out, on the floor: from his hips to where it bounced
function ballOut(you, t) { const h = you.hip(t), b = you.at(t).pos.ball, L = Math.hypot(b.x - h.x, b.z - h.z) || 1; return { x: (b.x - h.x) / L, z: (b.z - h.z) / L }; }

export const REPS = {
  // 1 - HIPS OPEN. The dribble out goes hard - he opens his hips to run with it; snatch it back and rise while his
  // weight is still going the other way
  open: {
    simEnd: 3.4,
    plan: { rec: true, shotClip: 0.975, flight: 1.05, camRef: 0.9, camAngle: 0.75, camSide: 1, camH: 2.2 },
    build(clips, legs) {
      const P = this.plan, log = [];
      const A = move1(), tBack = simOf(A, MOVE1.back), tOut = simOf(A, MOVE1.out), tBounce = simOf(A, MOVE1.bounce);
      const B = { clip: 'bp_shot_style1', from: 0.27, at: tBack, blend: 0.22, shot: true, unwind: { from: 0.68, to: 1.11, ramp: 0.08 } };
      const release = simOf(B, 0.975);
      const you = anchoredTrack(clips, [A, B], legs.you, release, { ...SPOT, yaw: yawTo(SPOT, RIM) });
      P.gatherAt = tBack + 0.05;
      // him: square, a stride and a half off; a reaction time after the ball goes out he opens his hips and runs with
      // it (78_25's run that stops), a long step and a half the way it went; it's snatched back - a reaction time later
      // he stops, re-plants and comes back, too late
      const D0 = toward(you.hip(0), RIM, 1.55), x = new Player(clips, legs.d1, 'd1').start('guard', D0, you.hip(0));
      const way = ballOut(you, tBounce), tOpen = tOut + RT, BITE = { x: D0.x + way.x * 1.0 + (RIM.x - D0.x) * 0.05, z: D0.z + way.z * 1.0 + (RIM.z - D0.z) * 0.05 };
      x.go('runStop', BITE, tOpen, tBack + RT + 0.05, { rmin: 0.75 });
      recover(clips, legs.d1, x, you, release, 1.4);
      x.hold('tall', x.lastArrive, (t) => you.hip(t));
      const d1 = x.track();
      P.contest = [{ from: release - 0.1, rise: 0.25, to: release + 0.5, side: 'L', reach: 0.05, late: true }];
      P.marks = { read: tOpen + 0.18, back: tBack };
      P.labels = [{ t: 0, kind: 'set', open: 0 }, { t: tOut, kind: 'out', open: 0 }, { t: tOpen + 0.08, kind: 'open', open: 1 }, { t: tBack, kind: 'rise', open: 1 }];
      P.window = { from: tOpen + 0.08, to: release };
      log.push(`you ${f2(you.hip(0))} out ${tOut.toFixed(2)} back ${tBack.toFixed(2)} release ${release.toFixed(2)} | bite to ${f2(BITE)}`, ...x.log);
      return { you, d1, players: { you, d1 }, log };
    },
  },
  // 2 - HIPS SQUARE. Same move, same man - he doesn't bite: no window, no shot. Move 2: one hard dribble by him, the
  // back foot exploding, into his hip and past - and the lane is open
  square: {
    simEnd: 4.4,
    plan: { rec: true, flight: 0, camRef: 1.2, camAngle: 0.55, camSide: 1, camH: 2.1 },
    build(clips, legs) {
      const P = this.plan, log = [];
      const A = move1(), tBack = simOf(A, MOVE1.back), tOut = simOf(A, MOVE1.out);
      // move 2: bp_layup from the top of its dribble - the hard one (bounce at 0.73), two steps, the right hand off the
      // glass at 2.13
      const B = { clip: 'bp_layup', from: 0.33, at: tBack, blend: 0.22, shot: true };
      const release = simOf(B, 2.13), FIN = { x: 0.95, z: 0.75 };
      const you = pathTrack(clips, [A, B], legs.you, release, FIN, SPOT);
      P.layup = { releaseClip: 2.13, side: 'R', oneHand: 0 }; P.takeoffAt = simOf(B, 2.06); P.gatherAt = simOf(B, 1.4);
      // him: square, a stride and a half off, a touch to the inside of the line the drive will take; on the dribble out
      // he takes one short slide with it and stays square - and is back square for the snatch. Move 2 goes straight
      // at his hip: the shoulder meets it as they go by, he's knocked off it and turned, and trails
      const go = (t) => you.hip(t), tGo = tBack + 0.1, p0 = go(tGo), p1 = go(tGo + 0.6), L = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
      const dir = { x: (p1.x - p0.x) / L, z: (p1.z - p0.z) / L }, lft = { x: dir.z, z: -dir.x };
      const D0 = { x: p0.x + dir.x * 1.45 + lft.x * 0.5, z: p0.z + dir.z * 1.45 + lft.z * 0.5 };
      const x = new Player(clips, legs.d1, 'd1').start('guard', D0, you.hip(0));
      const out = ballOut(you, simOf(A, MOVE1.bounce));
      // (the stance's slide that takes him the way it went, seen from where he faces)
      const S1 = { x: D0.x + out.x * 0.22, z: D0.z + out.z * 0.22 }, fx = you.hip(0).x - D0.x, fz = you.hip(0).z - D0.z, fl = Math.hypot(fx, fz) || 1;
      x.go((S1.x - D0.x) * (fz / fl) + (S1.z - D0.z) * (-fx / fl) > 0 ? 'slideL' : 'slideR', S1, tOut + RT, tBack + 0.05, { rmin: 0.6 });
      x.hold('guard', x.lastArrive, (t) => you.hip(t));
      // (the hit: when the driver's hips come level with his)
      let tHit = tGo + 0.3; const X0 = x.track();
      for (let t = tGo; t < release; t += 0.01) { const a = you.hip(t), b = X0.hip(t); if ((a.x - b.x) * dir.x + (a.z - b.z) * dir.z > -0.12) { tHit = t; break; } }
      const back = (t) => { const h = you.hip(t); return { x: h.x - dir.x * 1.0 + lft.x * 0.75, z: h.z - dir.z * 1.0 + lft.z * 0.75 }; };
      x.go('run', back(release + 0.2), tHit + 0.2, release + 0.2, { rmin: 0.75, rmax: 1.6 });
      x.hold('tall', x.lastArrive, (t) => you.hip(t));
      const d1 = x.track();
      P.contact = { t: tHit, push: 0.16, you: 0.05 };
      P.contest = [];
      P.marks = { read: tOut + RT + 0.3, go: tGo + 0.04, hit: tHit + 0.05, finish: release - 0.3 };
      P.labels = [{ t: 0, kind: 'set', open: 0 }, { t: tOut, kind: 'out', open: 0 }, { t: tOut + RT + 0.08, kind: 'square', open: 0 }, { t: tGo, kind: 'by', open: 0.3 }, { t: tHit, kind: 'hip', open: 1 }, { t: tHit + 0.4, kind: 'past', open: 1 }];
      log.push(`you ${f2(you.hip(0))} out ${tOut.toFixed(2)} back ${tBack.toFixed(2)} go ${tGo.toFixed(2)} hit ${tHit.toFixed(2)} release ${release.toFixed(2)} at ${f2(you.hip(release))} | him ${f2(D0)}`, ...x.log);
      return { you, d1, players: { you, d1 }, log };
    },
  },
};

export function buildRep(name, clips, legs) { return REPS[name].build(clips, legs); }
