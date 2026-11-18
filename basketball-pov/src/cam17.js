// v17 cameras (portrait): shot - v5's duel view on him and his man, swinging round behind him on the release and riding
// the ball in, one shot; side - the wall drill, from beside him at waist height (the wall, or the rim, at the edge of
// the picture), and for the rep with the ball, swinging round behind him on the release to ride the ball in.
import * as THREE from 'three';
import { Cam5 } from './camera5.js';
import { clamp, smooth } from './motion.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const RIM = V(0, 3.05, 0);

export class Cam17 {
  constructor(reps) {
    this.reps = reps; this.c5 = Object.create(Cam5.prototype); this.c5.reps = reps; this.paths = {};
    for (const [name, rep] of Object.entries(reps)) for (const mode of rep.plan.drill ? ['side'] : ['shot']) this.paths[name + ':' + mode] = this.bake(rep, mode);
  }
  ideal(rep, mode, t) {
    if (mode !== 'side') return this.c5.ideal(rep, mode, t);
    const P = rep.plan, fr = rep.frame('you', P.marks.off), S = fr.p, f = fr.f, r = fr.r, s = P.camSide ?? 1;
    // the wall: from behind his shoulder at 45 degrees, so the wall's face is in the picture with the tape on it;
    // with the ball: from beside him, chest high, the whole jump and the release in the picture
    const tap = P.drill === 'tap';
    const pos = S.clone().addScaledVector(r, (tap ? 2.7 : 3.6) * s).addScaledVector(f, tap ? -1.8 : 0.4); pos.y = tap ? 1.75 : 1.55;
    const look = S.clone().addScaledVector(f, tap ? 0.1 : 0.3); look.y = tap ? 1.75 : 1.55;
    let fov = tap ? 62 : 58;
    if (P.drill === 'release') {
      // on the release: round behind him and up, then riding the ball in
      const u = smooth((t - (P.release - 0.02)) / 0.75);
      const end = S.clone().addScaledVector(f, -3.9).addScaledVector(r, 0.7 * s); end.y = 2.6;
      const lk = S.clone().lerp(V(RIM.x, 0, RIM.z), 0.42); lk.y = 2.25;
      const w = smooth((t - P.release) / 0.3) * (1 - smooth((t - (P.rim + 0.5)) / 0.6));
      if (w > 0) { const b = rep.ball(t).pos, m = b.clone().lerp(RIM, 0.5); lk.lerp(m, 0.45 * w); }
      // (round him, not through him)
      const p0 = pos.clone().sub(S), p1 = end.clone().sub(S), th0 = Math.atan2(p0.z, p0.x);
      let dth = Math.atan2(p1.z, p1.x) - th0; while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI;
      const th = th0 + dth * u, rr = Math.hypot(p0.x, p0.z) + (Math.hypot(p1.x, p1.z) - Math.hypot(p0.x, p0.z)) * u;
      return { pos: V(S.x + Math.cos(th) * rr, pos.y + (end.y - pos.y) * u, S.z + Math.sin(th) * rr), look: look.lerp(lk, u), fov: fov + 6 * u };
    }
    return { pos, look, fov };
  }
  bake(rep, mode) {
    const dt = 1 / 240, lead = 0.3, track = [], end = rep.plan.simEnd, wp = mode === 'side' ? 4.5 : 3.2, wl = mode === 'side' ? 5.0 : 4.2;
    let pos = null, look = null; const vp = V(), vl = V();
    const step = (x, v, target, om) => { const f = 1 + 2 * dt * om, oo = om * om, hoo = dt * oo, hhoo = dt * hoo, detInv = 1 / (f + hhoo); return [(f * x + dt * v + hhoo * target) * detInv, (v + hoo * (target - x)) * detInv]; };
    for (let t = 0; t <= end + 1e-6; t += dt) {
      const want = this.ideal(rep, mode, Math.min(t + lead, end));
      if (!pos) { pos = want.pos.clone(); look = want.look.clone(); }
      for (const a of ['x', 'y', 'z']) { [pos[a], vp[a]] = step(pos[a], vp[a], want.pos[a], wp); [look[a], vl[a]] = step(look[a], vl[a], want.look[a], wl); }
      track.push({ pos: pos.clone(), look: look.clone(), fov: want.fov });
    }
    return { dt, track };
  }
  at(repName, mode, st) {
    const p = this.paths[repName + ':' + mode], f = clamp(st / p.dt, 0, p.track.length - 1), i = Math.floor(f), j = Math.min(i + 1, p.track.length - 1), u = f - i;
    const a = p.track[i], b = p.track[j];
    return { pos: a.pos.clone().lerp(b.pos, u), look: a.look.clone().lerp(b.look, u), fov: a.fov + (b.fov - a.fov) * u };
  }
}
