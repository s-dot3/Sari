// v16 cameras (portrait). film: the coaches' angle - high up behind the offence, looking down the floor at the
// whole action (the ball, the screen, the cut, everyone's man), riding a weighted middle of the players who matter
// right now; shot: low behind the shooter's shoulder with his man in front of him and the rim, riding the ball in.
// Smoothed per rep with v5's critically damped follow and look-ahead.
import * as THREE from 'three';
import { clamp, smooth } from './motion.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const RIM3 = V(0, 3.05, 0);

export class Cam16 {
  // where(repName, who, t) -> {x, z}: any player's spot in a rep
  constructor(reps, where) {
    this.reps = reps; this.where = where; this.paths = {};
    for (const [name, rep] of Object.entries(reps)) for (const mode of ['film', 'shot']) this.paths[name + ':' + mode] = this.bake(rep, mode);
  }
  ideal(rep, mode, t) {
    // shot: low behind the shooter's shoulder, the shooter and the man contesting him in front of the rim; after the
    // release it rides the ball to the rim
    if (mode === 'shot') {
      const P = rep.plan, C = P.camShot || {}, S = rep.frame('you', P.release).p, y = rep.frame('you', Math.min(t, P.release)).p;
      const away = V(S.x - RIM3.x, 0, S.z - RIM3.z).normalize(), a = (C.az ?? 0.22) * (C.side ?? 1);
      const dir = V(away.x * Math.cos(a) - away.z * Math.sin(a), 0, away.x * Math.sin(a) + away.z * Math.cos(a)).normalize();
      const anchor = y.clone().lerp(S, 0.5);
      const pos = anchor.clone().addScaledVector(dir, C.back ?? 3.6); pos.y = C.h ?? 2.5;
      const look = anchor.clone().lerp(V(RIM3.x, 0, RIM3.z), C.lookRim ?? 0.33); look.y = C.lookY ?? 1.75;
      const w = smooth((t - P.release) / 0.3) * (1 - smooth((t - (P.rim + 0.5)) / 0.6));
      if (w > 0) { const b = rep.ball(t).pos, m = b.clone().lerp(RIM3, 0.5); look.lerp(m, (C.follow ?? 0.5) * w); }
      return { pos, look, fov: C.fov ?? 58 };
    }
    const C = rep.plan.camFilm, focus = typeof C.focus === 'function' ? C.focus(t) : C.focus;
    let sx = 0, sz = 0, sw = 0, xs = [];
    for (const [who, w] of Object.entries(focus)) { if (w <= 0.01) continue; const p = this.where(rep.name, who, t); sx += p.x * w; sz += p.z * w; sw += w; if (w > 0.3) xs.push(p); }
    const look = V(sx / sw + (C.lookOff?.x ?? 0), C.lookY ?? 0.6, sz / sw + (C.lookOff?.z ?? 0));
    // back off when the players who matter spread across the narrow frame
    const span = Math.max(...xs.map(p => p.x)) - Math.min(...xs.map(p => p.x));
    const k = 1 + (C.spread ?? 0.08) * Math.max(0, span - (C.span0 ?? 3.0));
    const off = V(C.off.x, C.off.y, C.off.z).multiplyScalar(k);
    // (in the shot it eases in toward a lower, closer angle on the shooter)
    return { pos: look.clone().add(off), look, fov: C.fov ?? 52 };
  }
  bake(rep, mode) {
    const dt = 1 / 240, lead = mode === 'film' ? 0.25 : 0.3, track = [], end = rep.plan.simEnd;
    const wp = mode === 'film' ? 2.0 : 3.2, wl = mode === 'film' ? 2.6 : 4.2;
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
