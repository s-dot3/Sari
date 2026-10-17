// v14 "Under the El": three possessions, each one take, the ball handler's handles all from one real freestyle take
// (CMU 06_13: crossovers, through the legs, attack and retreat dribbles - in front of a man, at the speed it was
// played), cut where the poses match (tools/transit.py) into a real finish:
//  cook     - seven crossovers attacking and backing out, then 78_34's drive (four more, up to 3.5 m/s) and
//             124_06's layup off the glass; a train goes by on the el
//  pullup   - walking it up behind three crossovers and straight up into 124_05's pull-up
//  stepback - backing out, through the legs twice, cross and cross back, the hop back (1.6x) and 124_05's three
// His man is not keyframed: he plays defence. He sits in his stance between the ball and the basket and, a reaction
// time after the ball handler gets out of line, moves to get back in front with real footwork - a slide either way
// (78_30), giving ground (78_28) or chopping up (78_25, 78_27) - picked for where the ball handler will be when the
// move ends, cut short into his stance. On the attack he bites the wrong way and is beaten.
// Court: rim at (0,0), offense attacks -z.
import { anchoredTrack, RIM } from './play5.js';
import { Track } from './animator.js';
import { findPushes } from './rep5.js';

export const CLIPS14 = ['06_13', '78_34', '124_06', '78_30', '78_28', '78_25', '78_27', '124_05'];
const yawTo = (p, q) => Math.atan2(q.x - p.x, q.z - p.z);
const DEG = Math.PI / 180, RT = 0.25; // reaction time (Singh 2020: ~0.23 s visual reaction in basketball players)
const IDLE = { amp: 0.1, period: 1.6 };
const simOf = (sg, ct) => sg.at + (ct - sg.from) / (sg.rate ?? 1);
const JUMP_STRAIGHT = { from: 3.15, to: 3.72, k: 0.33, ramp: 0.12 };
const SHOT = (from, at, extra = {}) => ({ clip: '124_05', from, at, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: JUMP_STRAIGHT, ...extra });

// his footwork: the piece of each take and how long it may run (the direction each carries him is measured from the
// take itself: slides go straight across, the retreat goes back over a shoulder, the chop steps up at ~45 degrees)
const MOVES = {
  left: { clip: '78_30', from: 1.1, max: 1.0 },
  right: { clip: '78_30', from: 2.62, max: 1.0 },
  backL: { clip: '78_28', from: 0.25, max: 0.9 },
  backF: { clip: '78_28', from: 0.55, max: 0.7 },
  backR: { clip: '78_28', from: 1.45, max: 0.9 },
  back: { clip: '78_28', from: 2.7, max: 0.8 },
  upL: { clip: '78_25', from: 1.6, max: 0.6 },
  upR: { clip: '78_27', from: 1.45, max: 0.6 },
};
const STANCE = (at, face) => ({ clip: '78_30', from: 0.93, at, inert: 0.3, idle: IDLE, yawAbs: face });

const _prof = new Map();
function profile(clips, leg, name) {
  const key = name + ':' + leg.toFixed(4);
  if (_prof.has(key)) return _prof.get(key);
  const m = MOVES[name], tr = new Track(clips, [{ clip: m.clip, from: m.from, at: 0, place: { x: 0, z: 0, yaw: 0 } }], leg), h0 = tr.hip(0), out = [];
  for (let t = 0.2; t <= m.max + 1e-6; t += 0.04) { const h = tr.hip(t); out.push({ t, l: h.x - h0.x, f: h.z - h0.z }); }
  _prof.set(key, out);
  return out;
}

// his man, playing the ball until t1: gap (m off the ball handler, toward the basket)
function shadow(clips, legs, you, o) {
  // (o.gap may be a function of time: he can start further off and close to his gap as the ball comes to him)
  const gap = typeof o.gap === 'function' ? o.gap : () => o.gap ?? 1.5;
  const spot = (t) => { const h = you.hip(t), g = gap(t), dx = RIM.x - h.x, dz = RIM.z - h.z, L = Math.hypot(dx, dz) || 1; return { x: h.x + dx / L * g, z: h.z + dz / L * g }; };
  const s0 = spot(0);
  const segs = [{ clip: '78_30', from: 0.93, at: 0, idle: IDLE, place: { ...s0, yaw: yawTo(s0, you.hip(0)) } }];
  let tr = new Track(clips, segs, legs.d1), t = 0.1;
  const log = [];
  while (t < o.t1) {
    // if he held his stance, where would he be against where he should be by the time he could react?
    const d = tr.hip(t + RT), face = yawTo(d, you.hip(t + RT)), w = spot(t + RT + 0.25);
    const eL = (w.x - d.x) * Math.cos(face) - (w.z - d.z) * Math.sin(face), eF = (w.x - d.x) * Math.sin(face) + (w.z - d.z) * Math.cos(face);
    if (Math.abs(eL) < 0.32 && eF > -0.4 && eF < 0.6) { t += 0.04; continue; }
    const t0 = t + RT, c = tr.hip(t0), f0 = yawTo(c, you.hip(t0));
    let best = null;
    for (const name of Object.keys(MOVES)) for (const p of profile(clips, legs.d1, name)) {
      if (t0 + p.t > o.t1 + 0.4) continue;
      // where he has to be when this move ends, in his frame now
      const a = spot(t0 + p.t), aL = (a.x - c.x) * Math.cos(f0) - (a.z - c.z) * Math.sin(f0), aF = (a.x - c.x) * Math.sin(f0) + (a.z - c.z) * Math.cos(f0);
      for (let dl = -45; dl <= 45; dl += 5) {
        const r = dl * DEG, pl = p.l * Math.cos(r) + p.f * Math.sin(r), pf = -p.l * Math.sin(r) + p.f * Math.cos(r);
        // (out of line, or left too close, is worse than a little too far off)
        const eF = pf - aF, cost = Math.hypot(pl - aL, eF > 0 ? 1.5 * eF : 0.6 * eF) + 0.1 * p.t + 0.006 * Math.max(0, Math.abs(dl) - 15);
        if (!best || cost < best.cost) best = { name, t: p.t, r, cost };
      }
    }
    if (!best) break;
    const m = MOVES[best.name], end = t0 + best.t, yaw0 = f0 + best.r;
    segs.push({ clip: m.clip, from: m.from, at: t0, inert: 0.2, yawAbs: () => yaw0 });
    segs.push(STANCE(end, (p) => yawTo(p, you.hip(end + 0.25))));
    tr = new Track(clips, segs, legs.d1);
    log.push(`${t0.toFixed(2)} ${best.name} ${best.t.toFixed(2)}s ${(best.r / DEG).toFixed(0)}deg miss ${best.cost.toFixed(2)}`);
    t = end + 0.12;
  }
  return { segs, tr, log };
}

// beaten: a reaction time after the move he slides the way it showed - away from where the ball handler actually goes
// by him - and then turns to the ball where he ended up; chase: he turns and runs after the drive (78_27's closeout
// run, which carries him ~52 degrees right of where he faces) toward a spot on his side of the rim, too late
function bite(segs, clips, legs, you, tMove, slideFor = 0.75, chase = null) {
  const t0 = tMove + RT, out = segs.filter(s => s.at < t0 - 0.05);
  const tr = new Track(clips, out, legs.d1), d = tr.hip(t0), f = yawTo(d, you.hip(t0)), past = you.hip(t0 + 0.6);
  // (which side of him the ball handler goes by: his left is (cos f, -sin f))
  const side = (past.x - d.x) * Math.cos(f) - (past.z - d.z) * Math.sin(f);
  out.push(side < 0
    ? { clip: '78_30', from: 1.45, at: t0, inert: 0.2, yawAbs: () => f + 8 * DEG }     // goes by on his right: he slides left
    : { clip: '78_30', from: 0.05, at: t0, inert: 0.2, yawAbs: () => f - 8 * DEG });   // ... on his left: he slides right
  if (chase) {
    const t1 = t0 + slideFor, tr2 = new Track(clips, out, legs.d1), p1 = tr2.hip(t1);
    const L = Math.hypot(p1.x - RIM.x, p1.z - RIM.z), goal = { x: RIM.x + (p1.x - RIM.x) / L * chase.stop, z: RIM.z + (p1.z - RIM.z) / L * chase.stop };
    out.push({ clip: '78_27', from: 0.55, at: t1, inert: 0.25, yawAbs: (p) => yawTo(p, goal) + 52 * DEG });
    out.push({ clip: '78_30', from: 2.45, at: t1 + chase.run, inert: 0.35, idle: { amp: 0.06, period: 1.5 }, yawAbs: (p) => yawTo(p, RIM) });
    return out;
  }
  out.push({ clip: '78_30', from: 2.45, at: t0 + slideFor, inert: 0.3, idle: { amp: 0.06, period: 1.5 }, yawAbs: (p) => yawTo(p, you.hip(t0 + slideFor + 0.4)) });
  return out;
}

// place a track: hip at `at` at sim time t, facing `face` (a point) turned by `turn` degrees
const place = (clips, segs, leg, t, at, face, turn = 0) => anchoredTrack(clips, segs, leg, t, { ...at, yaw: yawTo(at, face) + turn * DEG });

export const REPS = {
  // 1 - seven crossovers attacking and backing out, then the crossover drive to the glass
  cook: {
    simEnd: 10.2, d: 'd_blue', train: { x0: -120, v: 18 },
    plan: { gatherDur: 0.2, layup: { releaseClip: 3.36, side: 'R', oneHand: 0 },
      camTake: { track: true, stiff: 1.6, pairW: 0.3, side: -1, az0: 0.58, az1: 0.42, back0: 3.6, back1: 4.2, h0: 1.85, h1: 2.3, fov0: 56, fov1: 62, lookY0: 1.35, lookRim: 0.55, lookY1: 1.9 } },
    build(clips, legs) {
      const P = this.plan;
      // you: 06_13 from 32.9 - at him behind crossovers at 33.0, 33.7 and 34.4, backing out behind three more (35.9,
      // 36.4, 37.9) and one at 38.5 - then 78_34's drive from the matching moment of its own take: crossovers at
      // 0.90, 1.27, 1.57 and 1.82, the last into 124_06's gather and layup (its own drive is going 3.3 m/s there)
      const A = { clip: '06_13', from: 32.9, at: 0 };
      const B = { clip: '78_34', from: 0.583, at: simOf(A, 38.85), inert: 0.3 };
      const tCut = simOf(B, 2.02);
      const C = { clip: '124_06', from: 2.633, at: tCut, inert: 0.25, shot: true, unwind: { from: 3.02, to: 3.85, ramp: 0.12, k: 0.85 } };
      P.dribble = [0, tCut]; P.gatherAt = tCut; P.layup.oneHand = simOf(C, 3.2);
      const tTake = simOf(C, 3.02);
      const you = place(clips, [A, B, C], legs.you, tTake, { x: 1.0, z: 1.4 }, { x: 0.2, z: 0.05 }, this.turn ?? 24);
      // him: plays him all the way through the handles; bites on the drive's first crossover and is beaten
      const tMove = simOf(B, 0.9);
      const sh = shadow(clips, legs, you, { t1: tMove + RT - 0.05, gap: (t) => 1.55 + 0.9 * (1 - Math.min(1, Math.max(0, (t - 0.6) / 1.4))) });
      const d1 = new Track(clips, bite(sh.segs, clips, legs, you, tMove, 0.6, { run: 0.85, stop: 2.2 }), legs.d1);
      this.log = sh.log;
      return { you, d1 };
    },
  },
  // 2 - walk it up behind three crossovers and straight up from the top
  pullup: {
    simEnd: 6.0, d: 'd_gold',
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.15,
      camTake: { stiff: 1.4, pairW: 0.4, side: 1, az0: 0.62, az1: 0.32, back0: 3.6, back1: 4.5, h0: 1.85, h1: 2.4, fov0: 56, fov1: 62, lookY0: 1.35, follow: 0.35, lookRim: 0.38 } },
    build(clips, legs) {
      const P = this.plan;
      // you: 06_13 from 0.35 - the first dribble, up the floor behind crossovers at 0.8, 1.6 and 3.5 - and on the way
      // up from that last one into 124_05's dip and rise (its own dribble just caught, release at 3.38)
      const A = { clip: '06_13', from: 0.35, at: 0 };
      const tStop = simOf(A, 3.583), segs = [A, SHOT(2.733, tStop, { inert: 0.3 })];
      const pushes = findPushes(clips['06_13'], 2.8, 3.583), last = pushes[pushes.length - 1];
      P.hold = [0, 0.15]; P.dribble = [0.15, simOf(A, last.c1) + 0.02]; P.gatherAt = Math.max(simOf(A, last.c1) + 0.2, tStop - 0.02);
      const tOff = simOf(segs[1], 3.17);
      const you = place(clips, segs, legs.you, tOff, { x: 0.9, z: 6.3 }, RIM);
      const release = simOf(segs[1], 3.38);
      // him: picks him up and gives ground with him; a stride off when he rises, hand up late
      const sh = shadow(clips, legs, you, { t1: tStop, gap: 1.45 });
      const d1 = new Track(clips, sh.segs, legs.d1);
      P.contest = [{ from: tStop + 0.12, rise: 0.25, to: release + 0.5, side: 'R', reach: 0.1 }];
      this.log = sh.log;
      return { you, d1 };
    },
  },
  // 3 - backing out, through the legs twice, cross and cross back, step back: a three
  stepback: {
    simEnd: 6.8, d: 'd_blue',
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.25,
      camTake: { track: true, stiff: 1.6, pairW: 0.3, side: -1, az0: 0.58, az1: 0.28, back0: 3.6, back1: 4.6, h0: 1.85, h1: 2.4, fov0: 56, fov1: 62, lookY0: 1.35, follow: 0.3, lookRim: 0.36 } },
    build(clips, legs) {
      const P = this.plan;
      // you: 06_13 from 25.8 - at him, through the legs at 28.0 and 28.8, crossover at 29.2 and back at 29.5 - the
      // hop back snatched (1.6x) and 124_05's jumper from behind the arc
      const A = { clip: '06_13', from: 25.8, at: 0 };
      const B = { clip: '06_13', from: 29.5, at: simOf(A, 29.5), rate: 1.6, inert: 0.1 };
      P.dribble = [0.0, simOf(B, 29.75)]; P.gatherAt = simOf(B, 29.9);
      const segs = [A, B, SHOT(3.04, simOf(B, 30.12), { inert: 0.18 })];
      const tOff = simOf(segs[2], 3.17);
      const you = place(clips, segs, legs.you, tOff, { x: -3.0, z: 6.65 }, RIM);
      const release = simOf(segs[2], 3.38), tCross = simOf(A, 29.18);
      // him: with him through the handles; goes with the crossover and is late back to the shot
      const sh = shadow(clips, legs, you, { t1: tCross + RT - 0.05, gap: 1.5 });
      const d1 = new Track(clips, bite(sh.segs, clips, legs, you, tCross, 0.6), legs.d1);
      P.contest = [{ from: tCross + 1.0, rise: 0.25, to: release + 0.5, side: 'L', reach: 0.1 }];
      this.log = sh.log;
      return { you, d1 };
    },
  },
};

export function buildRep(name, clips, legs) { return REPS[name].build(clips, legs); }
