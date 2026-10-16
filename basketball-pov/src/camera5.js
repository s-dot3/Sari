// v5 cameras (portrait). duel: three-quarter view of the shooter and his defender, wide enough to keep the
// defender's feet and the floor meter in frame; rim: beside the rim for the result; finish: from the baseline for the
// drive, the contact and the layup. Smoothed per rep with a critically damped follow and a look-ahead.
import * as THREE from 'three';
import { smooth, clamp } from './motion.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const RIM = V(0, 3.05, 0);

export class Cam5 {
  constructor(reps) {
    this.reps = reps; this.paths = {};
    for (const [name, rep] of Object.entries(reps)) for (const mode of rep.plan.contact ? ['finish'] : ['duel', 'rim'].concat(rep.plan.camTeam ? ['team'] : [], rep.plan.camTake ? ['take'] : [], rep.plan.shotClip !== undefined ? ['shot'] : [])) this.paths[name + ':' + mode] = this.bake(rep, mode);
  }
  ideal(rep, mode, t) {
    // team: high and behind the play, on the ball and the man guarding it - the driver and you until his pass, then
    // swinging over to your man and you as you close out
    if (mode === 'team') {
      const C = rep.plan.camTeam, A = rep.partA, d = rep.frame('d1', t).p;
      const o1 = (A || rep).frame('you', t).p, o2 = rep.frame('you', t).p;
      // (on the pass it eases halfway over and pulls back, so the ball's flight to your man and you are both in it)
      const u = rep.plan.pass ? smooth((t - (rep.plan.pass.t0 - 0.2)) / 0.7) : 0;
      const look = o1.clone().lerp(d, 0.5).lerp(o2.clone().lerp(d, 0.5), 0.5 * u).add(V(C.lookOff.x, 0, C.lookOff.z)); look.y = C.lookY;
      return { pos: look.clone().add(V(C.off.x, C.off.y, C.off.z).multiplyScalar(1 + 0.45 * u)), look, fov: C.fov };
    }
    const y = rep.frame('you', t).p, d = rep.frame('d1', t).p;
    // take: one take from the first dribble to the net. High and behind the ball handler, off his shoulder, so a
    // cross goes left-right across the picture and his man stays in view; tight on the two of them for the move,
    // then from the gather it rises, pulls back and tilts up to the rim, and after the release it rides the ball
    // all the way to the net - the shot, the flight and the make in the same shot, no cut
    if (mode === 'take') {
      const C = rep.plan.camTake, P = rep.plan, S = rep.frame('you', P.release).p;
      const u = smooth((t - (P.gatherAt - 0.3)) / (P.release + 0.15 - (P.gatherAt - 0.3)));
      const k = (a, b) => a + (b - a) * u;
      // (off his shoulder for the move; round behind him for the shot, so he and the rim share the narrow frame)
      const away = V(S.x - RIM.x, 0, S.z - RIM.z).normalize(), a = k(C.az0 ?? 0.7, C.az1 ?? 0.3) * (C.side ?? 1);
      const dir = V(away.x * Math.cos(a) - away.z * Math.sin(a), 0, away.x * Math.sin(a) + away.z * Math.cos(a)).normalize();
      const anchor = y.clone().lerp(d, 0.3 * (1 - u));
      const pos = anchor.clone().addScaledVector(dir, k(C.back0 ?? 3.1, C.back1 ?? 4.3)); pos.y = k(C.h0 ?? 2.5, C.h1 ?? 3.0);
      const pair = y.clone().lerp(d, 0.42); pair.y = C.lookY0 ?? 0.95;
      const shot = S.clone().lerp(V(RIM.x, 0, RIM.z), C.lookRim ?? 0.5); shot.y = C.lookY1 ?? 2.15;
      const look = pair.lerp(shot, u);
      // in the air: between the ball and the rim, so both stay in the picture
      if (P.release !== undefined && !P.layup) {
        const w = smooth((t - P.release) / 0.3) * (1 - smooth((t - (P.rim + 0.5)) / 0.6));
        if (w > 0) { const b = rep.ball(t).pos, m = b.clone().lerp(RIM, 0.5); look.lerp(m, (C.follow ?? 0.55) * w); }
      }
      return { pos, look, fov: k(C.fov0 ?? 44, C.fov1 ?? 60) };
    }
    // shot: the duel view up to the release, then, without a cut, it swings round behind the shooter (round him, not
    // through him), rises and tilts up to the rim and rides the ball in - the release, the flight and the make (or the
    // miss) in one shot
    if (mode === 'shot') {
      const base = this.ideal(rep, 'duel', t), P = rep.plan, C = P.camShot || {};
      // (from the release it tilts up with the ball right away, so the ball never leaves the picture)
      const w = smooth((t - P.release) / 0.25) * (1 - smooth((t - (P.rim + 0.5)) / 0.6)), mid = w > 0 ? rep.ball(t).pos.clone().lerp(RIM, 0.5) : null;
      if (w > 0) base.look.lerp(mid, (C.early ?? 0.35) * w);
      const u = smooth((t - (P.release + (C.b0 ?? 0.1))) / ((C.b1 ?? 0.8) - (C.b0 ?? 0.1)));
      if (u <= 0) return base;
      const S = rep.frame('you', P.release).p, away = V(S.x - RIM.x, 0, S.z - RIM.z).normalize();
      // on the side the duel camera is already on
      if (rep._shotSide === undefined) { const o = this.ideal(rep, 'duel', P.release).pos.clone().sub(S).setY(0), r = V(away.z, 0, -away.x); rep._shotSide = Math.sign(o.dot(r)) || 1; }
      const a = -(C.az ?? 0.3) * rep._shotSide, dir = V(away.x * Math.cos(a) - away.z * Math.sin(a), 0, away.x * Math.sin(a) + away.z * Math.cos(a)).normalize();
      const end = S.clone().addScaledVector(dir, C.back ?? 4.6); end.y = C.h ?? 3.1;
      const look = S.clone().lerp(V(RIM.x, 0, RIM.z), C.lookRim ?? 0.36); look.y = C.lookY ?? 2.15;
      if (w > 0) look.lerp(mid, (C.follow ?? 0.3) * w);
      // round him: angle, distance and height about the shooter, eased from the duel view's to these
      const p0 = base.pos.clone().sub(S), p1 = end.clone().sub(S);
      const th0 = Math.atan2(p0.z, p0.x); let dth = Math.atan2(p1.z, p1.x) - th0; while (dth > Math.PI) dth -= 2 * Math.PI; while (dth < -Math.PI) dth += 2 * Math.PI;
      const th = th0 + dth * u, rr = Math.hypot(p0.x, p0.z) + (Math.hypot(p1.x, p1.z) - Math.hypot(p0.x, p0.z)) * u;
      const pos = V(S.x + Math.cos(th) * rr, base.pos.y + (end.y - base.pos.y) * u, S.z + Math.sin(th) * rr);
      return { pos, look: base.look.clone().lerp(look, u), fov: base.fov + ((C.fov ?? 62) - base.fov) * u };
    }
    if (mode === 'duel') {
      // three-quarter view from one side (camAngle swings it round behind the shooter), just under head height,
      // pulled back to keep both of them in the narrow frame, tilted so their feet sit at the same place on screen
      // whatever the distance (above the timing strip, with the floor meter in view). The side is fixed per rep
      // from the line between them at camRef, so the camera never swings across them when the defender slides.
      const A = rep.plan.camAngle ?? 0.6, HC = rep.plan.camH ?? 1.75, FEET = 14.3 * Math.PI / 180;
      if (!rep._camDir) {
        const tr = rep.plan.camRef ?? rep.plan.release, y0 = rep.frame('you', tr).p, d0 = rep.frame('d1', tr).p, l0 = d0.clone().sub(y0).normalize();
        let n = V(-l0.z, 0, l0.x); if (n.x < 0) n.negate(); if (rep.plan.camSide) n.multiplyScalar(rep.plan.camSide);
        rep._camDir = n.multiplyScalar(Math.cos(A)).addScaledVector(l0.clone().negate(), Math.sin(A)).normalize();
      }
      const dir = rep._camDir, mid = y.clone().lerp(d, 0.5), across = Math.abs(d.clone().sub(y).dot(V(-dir.z, 0, dir.x)));
      const dist = Math.max(4.1, (across + 1.5) / 0.573);
      const pos = mid.clone().addScaledVector(dir, dist); pos.y = HC;
      const look = mid.clone(); look.y = HC - dist * Math.tan(Math.atan(HC / dist) - FEET);
      // through the shot it tilts up so the set, the release and the follow-through stay in the picture
      const P = rep.plan;
      // and pushes in a little toward the shooter, so the form is big enough to read
      let fov = 54;
      if (P.setAt !== undefined && !P.contact) {
        const up = smooth((t - (P.setAt - 0.55)) / 0.4) * (1 - smooth((t - (P.land + 0.15)) / 0.4));
        const k = P.camPush ?? 1; // less where the defender is further off and has to stay in the picture
        look.y += 0.8 * up; pos.y += 0.25 * up; fov -= 9 * up * k;
        const yy = y.clone().setY(look.y); look.lerp(yy, 0.3 * up * k);
      }
      return { pos, look, fov };
    }
    if (mode === 'rim') {
      // off to the side of the rim on the shooter's half, a little under it: the ball crosses the frame and drops in
      const r0 = rep.frame('you', rep.plan.release).p, s = V(r0.x, 0, r0.z).normalize();
      const n = V(-s.z, 0, s.x); if (n.x < 0) n.negate();
      const pos = s.clone().multiplyScalar(1.3).addScaledVector(n, 2.4); pos.y = 1.85;
      const look = RIM.clone().add(V(0, -0.3, 0)).addScaledVector(s, 0.25);
      return { pos, look, fov: 54 };
    }
    // finish: from the baseline, low, just right of the stanchion and facing up the lane: he drives at the camera, the help
    // defender slides in from the side and takes the shoulder side-on; after the contact it tilts up to the glass.
    // Tight on the setup while they're far away, widening as the drive comes in.
    const c = rep.plan.contact, pos = V(1.25, 1.45, -3.05);
    const mid = y.clone().lerp(d, 0.5); mid.y = 1.2;
    const u = smooth((t - (c.t + 0.05)) / (rep.plan.release + 0.15 - c.t));
    return { pos, look: mid.lerp(V(0.5, 2.3, 0.35), u), fov: 48 + 10 * smooth((t - 0.3) / (c.t - 0.3)) + 4 * u };
  }
  bake(rep, mode) {
    const dt = 1 / 240, lead = mode === 'duel' || mode === 'shot' ? 0.3 : mode === 'take' ? 0.25 : 0.2, track = [], end = rep.plan.simEnd, wp = mode === 'duel' || mode === 'shot' ? 3.2 : mode === 'take' ? 3.0 : 2.2, wl = { duel: 4.2, shot: 4.2, rim: 3.4, finish: 5.5, team: 3.0, take: 4.5 }[mode];
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
    return { pos: a.pos.clone().lerp(b.pos, u), look: a.look.clone().lerp(b.look, u), fov: a.fov };
  }
}
