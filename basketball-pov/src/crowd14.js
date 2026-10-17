// v14: the people round the court - along the sidelines inside the fence, on the benches, and out on the sidewalk
// watching through the baseline fence. Each is one of the three Rocketbox bodies in summer clothes (prep_street.py),
// posed with the rig's IK the way people stand and sit and watch (arms folded, hands in pockets or on the hips,
// filming on a phone, arms hanging; elbows on knees on the benches), breathing and shifting their weight, heads and
// shoulders turning after the ball handler.
import * as THREE from 'three';
import { makePlayerMesh, Rig } from './player.js';
import { rng } from './arena.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const POSES = ['folded', 'pockets', 'hang', 'hips', 'phone', 'folded', 'hang', 'pockets', 'phone', 'hips'];

// where they stand: in twos, threes and fours (people come with friends), a few on their own
function spots(benches) {
  const R = rng(57), out = [];
  const line = (a, b, depth, nrm, face) => {
    const L = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
    for (let s = R() * 1.2; s < L;) {
      const n = R() < 0.25 ? 1 : R() < 0.55 ? 2 : R() < 0.75 ? 3 : 4, back = depth * R();
      for (let i = 0; i < n && s < L; i++, s += 0.55 + R() * 0.25)
        out.push({ x: a.x + ux * s + nrm.x * (back + (R() - 0.5) * 0.3), z: a.z + uz * s + nrm.z * (back + (R() - 0.5) * 0.3), face });
      s += 0.9 + R() * 2.4;
    }
  };
  // out on the sidewalk behind the baseline fence, looking in through it
  line({ x: -10.5, z: -5.9 }, { x: 10.5, z: -5.9 }, 0.9, { x: 0, z: -1 });
  // inside, down both sides, and a few in the baseline corners
  line({ x: -9.9, z: -2.4 }, { x: -9.9, z: 13 }, 0.7, { x: -1, z: 0 });
  line({ x: 9.9, z: -2.4 }, { x: 9.9, z: 13 }, 0.7, { x: 1, z: 0 });
  for (const [x, z] of [[-8.6, -3.9], [-7.9, -4.4], [8.4, -4.0], [9.2, -3.6]]) out.push({ x: x + (R() - 0.5) * 0.3, z: z + (R() - 0.5) * 0.3 });
  // two or three to a bench
  for (const b of benches || []) {
    const n = 2 + (R() < 0.5 ? 1 : 0), ax = Math.cos(b.yaw), az = -Math.sin(b.yaw), fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 0.7 + (R() - 0.5) * 0.1; out.push({ x: b.x + ax * o - fx * 0.02, z: b.z + az * o - fz * 0.02, sit: true, face: b.yaw }); }
  }
  return out.filter(p => !(p.sit === undefined && Math.abs(p.x) > 9 && p.z > -2.6 && (benches || []).some(b => Math.abs(b.x - p.x) < 1 && Math.abs(b.z - p.z) < 1.5)));
}
const SETS = [['c01', '03'], ['c02', '04'], ['c03', '02'], ['c04', '03'], ['c05', '04'], ['c06', '02'], ['c07', '04'], ['c08', '03'], ['c09', '02'], ['c10', '04'], ['c11', '03'], ['c12', '02']];

export class Crowd {
  // T: templates by model id; opts.benches: where the benches are; opts.skip(x, z): spots to leave empty
  constructor(T, scene, opts = {}) {
    const R = rng(71);
    this.people = [];
    for (const [i, sp] of spots(opts.benches).entries()) {
      if (opts.skip && opts.skip(sp.x, sp.z)) continue;
      const [tex, model] = SETS[(i * 7 + 3) % SETS.length];
      const height = 1.7 + R() * 0.22;
      const { root, k } = makePlayerMesh(T, { model, tex, height });
      root.traverse(o => { if (o.isSkinnedMesh) { o.frustumCulled = true; o.castShadow = true; o.receiveShadow = true; o.material.forEach?.(m => { m.envMapIntensity = 0.7; }); } });
      scene.add(root);
      const rig = new Rig(root, k);
      const face = sp.face !== undefined && sp.sit ? sp.face : Math.atan2(0 - sp.x, 4.5 - sp.z) + (R() - 0.5) * 0.4;
      const p = { root, rig, x: sp.x, z: sp.z, face, sit: !!sp.sit, pose: sp.sit ? (R() < 0.6 ? 'elbows' : 'lap') : POSES[(i * 3 + Math.floor(R() * 3)) % POSES.length],
        ph: R() * 10, wide: 0.1 + R() * 0.06, lag: 0.25 + R() * 0.35, lean: (R() - 0.5) * 0.06, weight: R() < 0.5 ? -1 : 1, k: height / 1.81 };
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
      const yaw = p.face + (p.sit ? 0 : THREE.MathUtils.clamp(d * 0.35, -0.45, 0.45));
      const f = V(Math.sin(yaw), 0, Math.cos(yaw)), l = V(Math.cos(yaw), 0, -Math.sin(yaw));
      const br = Math.sin((t + p.ph) * 2 * Math.PI / 4.2), sw = Math.sin((t + p.ph) * 2 * Math.PI / 9.5);
      const base = V(p.x, 0, p.z), down = V(0, -1, 0), back = f.clone().negate();
      if (p.sit) {
        // on the bench: hips on the seat, feet out in front, leaning in with elbows on knees or hands in the lap
        const hipY = 0.56 * s / 0.97, at = (side, up, fw) => base.clone().addScaledVector(l, side * s).addScaledVector(f, fw * s).setY(hipY + up * s);
        const feet = { L: { pos: base.clone().addScaledVector(l, 0.16 * s).addScaledVector(f, 0.5 * s).setY(0.1), yaw: yaw + 0.12, kneePole: f.clone() },
          R: { pos: base.clone().addScaledVector(l, -0.16 * s).addScaledVector(f, 0.47 * s).setY(0.1), yaw: yaw - 0.12, kneePole: f.clone() } };
        const hands = p.pose === 'elbows'
          ? { L: { pos: at(0.04, 0.05, 0.42), pole: down.clone().addScaledVector(l, 0.4), palm: l.clone().negate(), dir: f.clone(), curl: 0.6 }, R: { pos: at(-0.04, 0.05, 0.42), pole: down.clone().addScaledVector(l, -0.4), palm: l.clone(), dir: f.clone(), curl: 0.6 } }
          : { L: { pos: at(0.13, 0.06, 0.3), pole: back.clone().addScaledVector(l, 0.4), palm: down.clone(), dir: f.clone(), curl: 0.3 }, R: { pos: at(-0.13, 0.06, 0.3), pole: back.clone().addScaledVector(l, -0.4), palm: down.clone(), dir: f.clone(), curl: 0.3 } };
        rig.apply({ pos: base, yaw, hipY, chestLean: (p.pose === 'elbows' ? 0.5 : 0.18) + 0.01 * br, chestTwist: THREE.MathUtils.clamp(d * 0.3, -0.35, 0.35), lookAt: look.clone().setY(Math.max(1.0, look.y)), feet, hands });
        continue;
      }
      const hipY = rig.restPelvisY * 0.975 + 0.004 * br;
      // weight on one leg: the hip drifts over it, the other knee eases
      const shift = (0.035 + 0.015 * sw) * p.weight;
      const at = (side, up, fw) => base.clone().addScaledVector(l, side * s).addScaledVector(f, fw * s).setY(hipY + up * s);
      const feet = {
        L: { pos: base.clone().addScaledVector(l, p.wide * s).addScaledVector(f, 0.02).setY(0.1), yaw: yaw + 0.18 },
        R: { pos: base.clone().addScaledVector(l, -p.wide * s).addScaledVector(f, -0.01).setY(0.1), yaw: yaw - 0.18 },
      };
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
