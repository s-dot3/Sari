// v16 footwork for a whole floor of players, from real takes (CMU mocap). A player's track is a list of segments
// (src/animator.js); these helpers add the pieces a team possession needs, each sized from the take itself:
//  hold  - standing in a stance (an offensive ready stance, a defensive stance, a screen), kept alive
//  go    - a stretch of a take that carries the hips from where they are to a spot by a given time: the stretch
//          that covers the distance is picked from the take, played at the rate that lands it on time, and turned
//          so that its own direction of travel points at the spot (a slide goes sideways, a closeout run goes
//          ~40 degrees off where the body faces, a sprint goes straight)
// Court: rim at (0,0), offense attacks -z.
import { Track } from './animator.js';
import { RIM } from './play5.js';

export const DEG = Math.PI / 180;
export const yawTo = (p, q) => Math.atan2(q.x - p.x, q.z - p.z);
export const simOf = (sg, ct) => sg.at + (ct - sg.from) / (sg.rate ?? 1);
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

// stances: a piece of a take held still and kept alive with a little sway
export const STANCES = {
  ready: { clip: '124_05', from: 1.85, idle: { amp: 0.06, period: 1.6 } },   // offense: spotted up, ready to catch
  guard: { clip: '78_30', from: 0.93, idle: { amp: 0.1, period: 1.6 } },     // defense: hips down, hands out
  set: { clip: '78_30', from: 0.95, idle: { amp: 0.03, period: 2.2 } },      // a screen: wide and still
  tall: { clip: '78_25', from: 2.62, idle: { amp: 0.05, period: 1.5 } },     // defense, up out of the stance
};
// moves: a stretch of a take [lo, end] - `go` starts it wherever covers the distance and always ends it at `end`
export const MOVES = {
  slideL: { clip: '78_30', lo: 1.1, end: 2.45 },   // a defensive slide to his left
  slideR: { clip: '78_30', lo: 0.05, end: 0.93 },  // ... to his right
  run: { clip: '78_24', lo: 0.55, end: 1.95 },     // from a standstill into a run (~35 deg left of his chest)
  runStop: { clip: '78_25', lo: 0.55, end: 2.3 },  // run and stop under control, hands up (a closeout)
  help: { clip: '78_26', lo: 0.2, end: 1.95 },     // sprint over and break down (~45 deg left)
  runR: { clip: '78_27', lo: 0.4, end: 2.2 },      // run and stop (~40 deg right)
  sprint: { clip: '78_12', lo: 0.0, end: 0.78 },   // flat out, straight ahead
  back: { clip: '78_28', lo: 0.25, end: 1.2 },     // giving ground
};

// how far a take's hips travel on the floor between clip times a and b (our scale)
export function travel(clip, a, b) {
  const H = clip.pos.lhipjoint, K = clip.pos.rhipjoint, at = (ct) => { const i = Math.max(0, Math.min(clip.n - 1, Math.round(ct * clip.fps))); return [(H[i * 3] + K[i * 3]) / 2, (H[i * 3 + 2] + K[i * 3 + 2]) / 2]; };
  let d = 0, p = at(a); for (let ct = a + 0.02; ct <= b + 1e-6; ct += 0.02) { const q = at(ct); d += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; }
  return d * (clip.cal ? clip.cal.scale : 1);
}
// the clip time to start a stretch that ends at `end` so the hips cover `dist`
export function startFor(clip, end, dist, lo, hi = end - 0.05) {
  if (travel(clip, lo, end) < dist) return lo;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (travel(clip, m, end) > dist) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// A player: segments built up in time order, each placed off where the last one leaves him.
export class Player {
  constructor(clips, leg, name) { this.clips = clips; this.leg = leg; this.name = name; this.segs = []; this.log = []; }
  track() { return new Track(this.clips, this.segs, this.leg); }
  // first segment: a stance with the hips at `at`, facing `face` (a point), from t=0
  start(kind, at, face, turn = 0) {
    const S = STANCES[kind];
    // (hips placed where asked: the take's own hip offset from its placement point is measured and taken out)
    const probe = new Track(this.clips, [{ ...S, at: 0, place: { x: 0, z: 0, yaw: 0 } }], this.leg), h = probe.hip(0), yaw = yawTo(at, face) + turn * DEG;
    const r = { x: h.x * Math.cos(yaw) + h.z * Math.sin(yaw), z: -h.x * Math.sin(yaw) + h.z * Math.cos(yaw) };
    this.segs.push({ ...S, at: 0, place: { x: at.x - r.x, z: at.z - r.z, yaw } });
    return this;
  }
  hip(t) { return this.track().hip(t); }
  // a stance from t, facing a point (or a function of time giving one)
  hold(kind, t, face, opts = {}) {
    const S = STANCES[kind], f = typeof face === 'function' ? face : () => face;
    this.segs.push({ ...S, at: t, inert: opts.inert ?? 0.3, yawAbs: (p) => yawTo(p, f(t + (opts.lead ?? 0.3))) + (opts.turn ?? 0) * DEG, ...(opts.seg || {}) });
    return this;
  }
  // a move from t0 that lands the hips on `to` at t1 (rate kept to [rmin, rmax]; outside it he gets there early or
  // late and the log says so)
  go(move, to, t0, t1, opts = {}) {
    const M = MOVES[move], clip = this.clips[M.clip], inert = opts.inert ?? 0.2, rmin = opts.rmin ?? 0.7, rmax = opts.rmax ?? 1.45;
    const end = opts.end ?? M.end;
    let from = M.lo, rate = 1, fix = 0, scale = 1;
    const base = this.segs.slice();
    // where he is at t0, and the stretch's own direction of travel relative to where he faces at its start
    const own = (f) => { const tr = new Track(this.clips, [{ clip: M.clip, from: f, at: 0, place: { x: 0, z: 0, yaw: 0 } }], this.leg), a = tr.hip(0), b = tr.hip(end - f); return Math.atan2(b.x - a.x, b.z - a.z); };
    let seg = null;
    for (let it = 0; it < 3; it++) {
      const p0 = new Track(this.clips, base, this.leg).hip(t0), dist = Math.hypot(to.x - p0.x, to.z - p0.z) * scale;
      from = startFor(clip, end, dist, M.lo);
      rate = Math.min(rmax, Math.max(rmin, (end - from) / (t1 - t0)));
      const dir = Math.atan2(to.x - p0.x, to.z - p0.z) + fix, yaw = dir - own(from);
      seg = { clip: M.clip, from, at: t0, rate, inert, yawAbs: () => yaw, ...(opts.seg || {}) };
      // correct for the curve of the stretch and the blend in: aim off by the miss, lengthen or shorten by it
      const tr = new Track(this.clips, base.concat([seg]), this.leg), got = tr.hip(t0 + (end - from) / rate);
      const want = Math.atan2(to.x - p0.x, to.z - p0.z), gotDir = Math.atan2(got.x - p0.x, got.z - p0.z);
      fix += wrap(want - gotDir);
      const gl = Math.hypot(got.x - p0.x, got.z - p0.z), wl = Math.hypot(to.x - p0.x, to.z - p0.z);
      if (gl > 0.05) scale *= wl / gl;
    }
    this.segs.push(seg);
    const arrive = t0 + (end - from) / rate, got = this.track().hip(arrive);
    this.log.push(`${this.name} ${move} ${t0.toFixed(2)}->${arrive.toFixed(2)} (want ${t1.toFixed(2)}) rate ${rate.toFixed(2)} miss ${Math.hypot(got.x - to.x, got.z - to.z).toFixed(2)} m`);
    this.lastArrive = arrive;
    return this;
  }
}

// v14's footwork planner, for anyone keeping to a moving spot: pieces of takes that start where they are (`from`) and
// may run up to `max` s; the direction each carries him is measured from the take
export const PMOVES = {
  left: { clip: '78_30', from: 1.1, max: 1.0 },
  right: { clip: '78_30', from: 2.62, max: 1.0 },
  backL: { clip: '78_28', from: 0.25, max: 0.9 },
  backF: { clip: '78_28', from: 0.55, max: 0.7 },
  backR: { clip: '78_28', from: 1.45, max: 0.9 },
  back: { clip: '78_28', from: 2.7, max: 0.8 },
  upL: { clip: '78_25', from: 1.6, max: 0.6 },
  upR: { clip: '78_27', from: 1.45, max: 0.6 },
  // (longer ways: a run that stops - 78_25's closeout run ~40 deg left of his chest, 78_27's ~40 deg right)
  runL: { clip: '78_25', from: 0.75, max: 1.45, run: true },
  runR: { clip: '78_27', from: 0.5, max: 1.6, run: true },
};
const _prof = new Map();
function profile(clips, leg, name) {
  const key = name + ':' + leg.toFixed(4);
  if (_prof.has(key)) return _prof.get(key);
  const m = PMOVES[name], tr = new Track(clips, [{ clip: m.clip, from: m.from, at: 0, place: { x: 0, z: 0, yaw: 0 } }], leg), h0 = tr.hip(0), out = [];
  for (let t = 0.2; t <= m.max + 1e-6; t += 0.04) { const h = tr.hip(t); out.push({ t, l: h.x - h0.x, f: h.z - h0.z }); }
  _prof.set(key, out);
  return out;
}
Player.prototype.follow = function (spot, face, t0, t1, o = {}) {
  const RT = o.rt ?? 0.25, names = o.moves ?? Object.keys(PMOVES), tolL = o.tolL ?? 0.32, tolF = o.tolF ?? [-0.4, 0.6], turnMax = o.turnMax ?? 45;
  const stance = o.stance ?? 'guard';
  let tr = this.track(), t = t0;
  while (t < t1) {
    // if he held his stance, where would he be against where he should be by the time he could react?
    const d = tr.hip(t + RT), fc = yawTo(d, face(t + RT)), w = spot(t + RT + 0.25);
    const eL = (w.x - d.x) * Math.cos(fc) - (w.z - d.z) * Math.sin(fc), eF = (w.x - d.x) * Math.sin(fc) + (w.z - d.z) * Math.cos(fc);
    if (Math.abs(eL) < tolL && eF > tolF[0] && eF < tolF[1]) { t += 0.04; continue; }
    const ta = t + RT, c = tr.hip(ta), f0 = yawTo(c, face(ta));
    let best = null;
    for (const name of names) for (const p of profile(this.clips, this.leg, name)) {
      if (ta + p.t > t1 + 0.4) continue;
      const a = spot(ta + p.t), aL = (a.x - c.x) * Math.cos(f0) - (a.z - c.z) * Math.sin(f0), aF = (a.x - c.x) * Math.sin(f0) + (a.z - c.z) * Math.cos(f0);
      for (let dl = -turnMax; dl <= turnMax; dl += 5) {
        const r = dl * DEG, pl = p.l * Math.cos(r) + p.f * Math.sin(r), pf = -p.l * Math.sin(r) + p.f * Math.cos(r);
        // (out of line, or left too close, is worse than a little too far off)
        const eF2 = pf - aF, cost = Math.hypot(pl - aL, eF2 > 0 ? (o.closeK ?? 1.5) * eF2 : 0.6 * eF2) + 0.1 * p.t + 0.006 * Math.max(0, Math.abs(dl) - 15);
        if (!best || cost < best.cost) best = { name, t: p.t, r, cost };
      }
    }
    if (!best) break;
    const m = PMOVES[best.name], end = ta + best.t, yaw0 = f0 + best.r;
    this.segs.push({ clip: m.clip, from: m.from, at: ta, inert: 0.2, yawAbs: () => yaw0 });
    const S = STANCES[stance];
    this.segs.push({ ...S, at: end, inert: 0.3, yawAbs: (p) => yawTo(p, face(end + 0.25)) });
    tr = this.track();
    this.log.push(`${this.name} ${ta.toFixed(2)} ${best.name} ${best.t.toFixed(2)}s ${(best.r / DEG).toFixed(0)}deg miss ${best.cost.toFixed(2)}`);
    t = end + 0.12; this.lastArrive = end;
  }
  return this;
};

// the point d metres from `p` toward `q`
export const toward = (p, q, d) => { const L = Math.hypot(q.x - p.x, q.z - p.z) || 1; return { x: p.x + (q.x - p.x) / L * d, z: p.z + (q.z - p.z) / L * d }; };
// between a man and the rim: d metres off him
export const offRim = (p, d) => toward(p, RIM, d);
export const lerp2 = (p, q, u) => ({ x: p.x + (q.x - p.x) * u, z: p.z + (q.z - p.z) * u });
