// v14 street court: the people round the court, as in the clip - standing along the fence behind the basket and
// down the sides, watching the play. Each is one of the three Rocketbox bodies in everyday clothes (prep_street.py),
// posed with the rig's IK in a way people stand and watch (arms folded, hands in pockets or on the hips, filming on a
// phone, arms hanging), breathing and shifting their weight, heads and shoulders turning after the ball handler.
import * as THREE from 'three';
import { makePlayerMesh, Rig } from './player.js';
import { rng } from './arena.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const POSES = ['folded', 'pockets', 'hang', 'hips', 'phone', 'folded', 'hang', 'pockets', 'phone', 'hips'];

// where they stand: in twos, threes and fours along the baseline fence and down both sides (people come with
// friends), a few on their own, a couple of the next five up nearer the corners
function spots() {
  const R = rng(57), out = [];
  const line = (a, b, depth, nrm) => {
    // walk the line from a to b dropping groups; nrm points away from the court (depth jitter goes along it)
    const L = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
    for (let s = R() * 1.2; s < L;) {
      const n = R() < 0.25 ? 1 : R() < 0.55 ? 2 : R() < 0.75 ? 3 : 4, back = depth * R();
      for (let i = 0; i < n && s < L; i++, s += 0.55 + R() * 0.25)
        out.push({ x: a.x + ux * s + nrm.x * (back + (R() - 0.5) * 0.3), z: a.z + uz * s + nrm.z * (back + (R() - 0.5) * 0.3), g: out.length });
      s += 0.8 + R() * 2.2;
    }
  };
  line({ x: -10.4, z: -4.2 }, { x: -1.4, z: -4.2 }, 0.8, { x: 0, z: -1 });
  line({ x: 1.4, z: -4.2 }, { x: 10.4, z: -4.2 }, 0.8, { x: 0, z: -1 });
  line({ x: -9.6, z: -3.0 }, { x: -9.6, z: 14 }, 1.0, { x: -1, z: 0 });
  line({ x: 9.6, z: -3.0 }, { x: 9.6, z: 14 }, 1.0, { x: 1, z: 0 });
  for (const [x, z] of [[-8.4, -1.9], [-8.0, -2.5], [8.3, -2.2]]) out.push({ x: x + (R() - 0.5) * 0.3, z: z + (R() - 0.5) * 0.3 });
  return out;
}
const SETS = [['c01', '03'], ['c02', '04'], ['c03', '02'], ['c04', '03'], ['c05', '04'], ['c06', '02'], ['c07', '04'], ['c08', '03'], ['c09', '02'], ['c10', '04'], ['c11', '03'], ['c12', '02']];

export class Crowd {
  // T: templates by model id; skip(x, z): spots to leave empty (where the play goes, or the camera stands)
  constructor(T, scene, opts = {}) {
    const R = rng(71);
    this.people = [];
    for (const [i, sp] of spots().entries()) {
      if (opts.skip && opts.skip(sp.x, sp.z)) continue;
      const [tex, model] = SETS[(i * 7 + 3) % SETS.length];
      const height = 1.7 + R() * 0.22;
      const { root, k } = makePlayerMesh(T, { model, tex, height });
      root.traverse(o => { if (o.isSkinnedMesh) { o.frustumCulled = true; o.castShadow = true; o.receiveShadow = true; o.material.forEach?.(m => { m.envMapIntensity = 0.7; }); } });
      scene.add(root);
      const rig = new Rig(root, k);
      const face = Math.atan2(0 - sp.x, 4.5 - sp.z) + (R() - 0.5) * 0.4;
      const p = { root, rig, x: sp.x, z: sp.z, face, pose: POSES[(i * 3 + Math.floor(R() * 3)) % POSES.length], ph: R() * 10, wide: 0.1 + R() * 0.06, lag: 0.25 + R() * 0.35, lean: (R() - 0.5) * 0.06, weight: R() < 0.5 ? -1 : 1, k: height / 1.81 };
      if (p.pose === 'phone') p.phone = this.phoneFor(rig);
      this.people.push(p);
    }
    this._sphereDone = false;
  }
  // a phone in the right hand (the hand bone's frame: x along the fingers, the palm facing -y; units are the model's cm)
  phoneFor(rig) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(15, 0.9, 7.2), new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.35, metalness: 0.6 }));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.6, 0.66) }));
    screen.rotation.x = Math.PI / 2; screen.position.y = 0.46; g.add(body, screen);
    g.position.set(8.5, -3.2, 1.0); rig.b.R_Hand.add(g);
    return g;
  }
  // pose everyone for time t; watch(t) gives the point they follow (the ball handler, the ball in the air)
  update(t, watch) {
    for (const p of this.people) {
      const s = p.k, rig = p.rig;
      // what they look at: where the play was a moment ago (each reacts a little late), averaged so a dribble
      // doesn't jerk their heads
      const look = V(); for (let j = 0; j < 6; j++) look.add(watch(t - p.lag - j * 0.06)); look.multiplyScalar(1 / 6);
      const toLook = Math.atan2(look.x - p.x, look.z - p.z);
      let d = toLook - p.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const yaw = p.face + THREE.MathUtils.clamp(d * 0.35, -0.45, 0.45);
      const f = V(Math.sin(yaw), 0, Math.cos(yaw)), l = V(Math.cos(yaw), 0, -Math.sin(yaw));
      const br = Math.sin((t + p.ph) * 2 * Math.PI / 4.2), sw = Math.sin((t + p.ph) * 2 * Math.PI / 9.5);
      const hipY = rig.restPelvisY * 0.975 + 0.004 * br;
      const base = V(p.x, 0, p.z);
      // weight on one leg: the hip drifts over it, the other knee eases
      const shift = (0.035 + 0.015 * sw) * p.weight;
      const at = (side, up, fw) => base.clone().addScaledVector(l, side * s).addScaledVector(f, fw * s).setY(hipY + up * s);
      const feet = {
        L: { pos: base.clone().addScaledVector(l, p.wide * s).addScaledVector(f, 0.02).setY(0.1), yaw: yaw + 0.18 },
        R: { pos: base.clone().addScaledVector(l, -p.wide * s).addScaledVector(f, -0.01).setY(0.1), yaw: yaw - 0.18 },
      };
      const down = V(0, -1, 0), back = f.clone().negate();
      let hands;
      if (p.pose === 'folded') hands = {
        L: { pos: at(-0.09, 0.36, 0.2), pole: down.clone().addScaledVector(l, 0.6), palm: f.clone().negate(), dir: l.clone().negate(), curl: 0.5 },
        R: { pos: at(0.1, 0.33, 0.24), pole: down.clone().addScaledVector(l, -0.6), palm: f.clone().negate(), dir: l.clone(), curl: 0.5 } };
      else if (p.pose === 'pockets') hands = {
        L: { pos: at(0.17, -0.06, 0.07), pole: back.clone().addScaledVector(l, 0.5), palm: l.clone().negate(), dir: down.clone().addScaledVector(f, 0.3), curl: 0.7 },
        R: { pos: at(-0.17, -0.06, 0.07), pole: back.clone().addScaledVector(l, -0.5), palm: l.clone(), dir: down.clone().addScaledVector(f, 0.3), curl: 0.7 } };
      else if (p.pose === 'hips') hands = {
        L: { pos: at(0.2, 0.06, 0.0), pole: l.clone().addScaledVector(back, 0.4), palm: l.clone().negate(), dir: f.clone().addScaledVector(down, 0.5), curl: 0.3 },
        R: { pos: at(-0.2, 0.06, 0.0), pole: l.clone().negate().addScaledVector(back, 0.4), palm: l.clone(), dir: f.clone().addScaledVector(down, 0.5), curl: 0.3 } };
      else if (p.pose === 'phone') {
        // filming: phone up at arm's length in front of the face, held toward the play
        const tgt = look.clone().sub(at(0, 0.55, 0)).setY(0).normalize();
        const hp = at(-0.04, 0.5, 0).addScaledVector(tgt, 0.36 * s);
        hands = {
          L: { pos: at(0.21, -0.12, 0.05), pole: back.clone(), curl: 0.35 },
          R: { pos: hp, pole: down.clone().addScaledVector(l, -0.7), palm: tgt.clone().negate(), dir: V(0, 1, 0).addScaledVector(l, 0.3), curl: 0.55 } };
      } else hands = {
        L: { pos: at(0.23, -0.14 + 0.004 * br, 0.04), pole: back.clone(), curl: 0.35 },
        R: { pos: at(-0.23, -0.14 + 0.004 * br, 0.04), pole: back.clone(), curl: 0.35 } };
      rig.apply({ pos: base, yaw, hipY, hipOffset: l.clone().multiplyScalar(shift * s), chestLean: 0.05 + p.lean + 0.006 * br, chestTwist: THREE.MathUtils.clamp(d * 0.25, -0.3, 0.3), chestSide: -shift * 0.8,
        pelvisRoll: -shift * 0.9, lookAt: look.clone().setY(Math.max(1.0, look.y)), feet, hands });
    }
    if (!this._sphereDone) { for (const p of this.people) p.root.traverse(o => { if (o.isSkinnedMesh) o.computeBoundingSphere(); }); this._sphereDone = true; }
  }
}
