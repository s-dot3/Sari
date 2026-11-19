// v18 rep engine: v5's (rep5.js) on takes that carry their own ball (SkillMimic's BallPlay-M: optical mocap of a
// player with the ball tracked). With plan.rec the ball is the performer's from the first dribble to the release -
// every bounce, the behind-the-back, the gather, the dip and the set - and so are both arms (no hand targets, no
// synthesized shooting arm): it rides in the track as a joint, so it's placed, turned, scaled and crossfaded with
// the body. Two fixes on top: while a hand has it, it goes where our rig's hand goes (our arms aren't the
// performer's length, so our hand lands a few cm off his), and a bounce touches the floor. From the release it flies
// to the rim as before.
import * as THREE from 'three';
import { Rep, RIM } from './rep5.js';
import { BALL_R, ballistic } from './game2.js';

const HZ = 240;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export class Rep18 extends Rep {
  buildTable() {
    super.buildTable();
    if (this.plan.rec) this.buildRecBall();
  }
  // the take's ball at every sample: moved with our hand while a hand has it, and down to the floor on a bounce
  buildRecBall() {
    const T = this.T, n = T.n, tr = this.tracks.you, rig = this.rigs.you;
    const B = [], held = [];
    for (let i = 0; i < n; i++) {
      const t = i / HZ, P = tr.at(t); this.contactOffset('you', P, t);
      rig.applyMocap(P, P.src, {});
      // (a stretch of a take without a ball - before a pass reaches him - just keeps it at his hips; unused)
      const b = P.pos.ball ? P.pos.ball.clone() : P.pos.lhipjoint.clone().add(P.pos.rhipjoint).multiplyScalar(0.5), corr = V();
      let ws = 0;
      for (const s of ['L', 'R']) {
        const k = s.toLowerCase(), palm = P.pos[k + 'radius'].clone().lerp(P.pos[k + 'hand'], 0.6);
        // (in the hand: its centre within a ball and a few cm of the palm)
        const w = smooth((0.27 - palm.distanceTo(b)) / 0.08);
        if (w > 0) { corr.addScaledVector(rig.P[s + '_Hand'].clone().sub(P.pos[k + 'radius']), w); ws += w; }
      }
      if (ws > 1) corr.multiplyScalar(1 / ws);
      B.push(b.add(corr)); held.push(Math.min(1, ws));
    }
    // bounces: the free ball's lowest points near the floor; each is let down (or lifted) onto the floor, the shift
    // fading out over the next half metre of height so the hand's part of the dribble isn't touched
    const bounces = [];
    for (let i = 1; i < n - 1; i++) if (B[i].y < 0.35 && held[i] < 0.5 && B[i].y <= B[i - 1].y && B[i].y < B[i + 1].y) bounces.push(i);
    if (bounces.length) for (let i = 0; i < n; i++) {
      let j = bounces[0]; for (const b of bounces) if (Math.abs(b - i) < Math.abs(j - i)) j = b;
      const yb = B[j].y, d = BALL_R - yb, w = clamp(1 - (B[i].y - yb) / 0.45, 0, 1);
      B[i].y = Math.max(BALL_R, B[i].y + d * w);
    }
    this.recB = B; this.recHeld = held; this.recBounces = bounces.map(i => i / HZ);
  }
  recBall(t) {
    const f = clamp(t * HZ, 0, this.T.n - 1), i = Math.floor(f), j = Math.min(i + 1, this.T.n - 1), u = f - i;
    return this.recB[i].clone().lerp(this.recB[j], u);
  }
  buildBall() {
    if (!this.plan.rec) return super.buildBall();
    // (only the bounce times are needed from here on: the sound of the dribble)
    this.flights = this.recBounces.filter(tb => this.plan.release === undefined || tb < this.plan.release).map(tb => ({ tb }));
  }
  // from the release it flies from where the take's hand let it go
  flightOut() {
    const P0 = this.plan;
    if (!P0.rec) return super.flightOut();
    if (!this._fo) {
      const p = this.recBall(P0.release), q = P0.miss ? this.missPoint() : V(RIM.x + 0.01, RIM.y + 0.1, RIM.z + 0.02), T = P0.rim - P0.release;
      const v = V((q.x - p.x) / T, (q.y - p.y + 0.5 * 9.81 * T * T) / T, (q.z - p.z) / T);
      this._fo = { p, v, dir: v.clone().normalize(), extra: 0 };
    }
    return this._fo;
  }
  // a pass to him (plan.pass) flies into where his take has the ball as he catches it
  catchPoint() {
    if (!this.plan.rec) return super.catchPoint();
    if (!this._catch) this._catch = this.recBall(this.plan.pass.t1);
    return this._catch;
  }
  // plan.formShot: { up, fwd } m/s - a soft one shot up in the air off the release (to himself, no rim): up and down
  // in front of him, then the floor; .hits are its bounces (for the sound)
  formBall(t) {
    const P0 = this.plan;
    if (!this._form) {
      const p = this.recBall(P0.release), f = this.fwd(P0.release), fs = P0.formShot, dt = 1 / HZ;
      const v = V(f.x * (fs.fwd ?? 0.4), fs.up ?? 3.3, f.z * (fs.fwd ?? 0.4)), pts = [], hits = [];
      const q = p.clone();
      for (let tt = P0.release; tt <= P0.simEnd + 1e-6; tt += dt) {
        pts.push(q.clone()); v.y -= 9.81 * dt; q.addScaledVector(v, dt);
        if (q.y < BALL_R && v.y < 0) { q.y = BALL_R; if (v.y < -0.5) hits.push({ t: tt, v: -v.y }); v.y = -v.y * 0.62; v.x *= 0.8; v.z *= 0.8; if (v.y < 0.3) v.y = 0; }
      }
      this._form = { pts, hits };
    }
    const F = this._form, i = clamp(Math.round((t - P0.release) * HZ), 0, F.pts.length - 1);
    return { B: F.pts[i].clone(), state: 'loose' };
  }
  // a layup (plan.layup) goes off the glass from where the take's hand let it go
  layupBall(t) {
    if (this.plan.rec && !this._rel) {
      this._rel = this.recBall(this.plan.release);
      this._board = V(Math.sign(this._rel.x || 1) * 0.17, 3.37, -0.38 + BALL_R + 0.005);
      this._rim = V(0.02, RIM.y + 0.08, 0.02);
    }
    return super.layupBall(t);
  }
  handsAndBall(t) {
    const P0 = this.plan;
    if (!P0.rec) return super.handsAndBall(t);
    if (P0.pass && t < P0.pass.t1) {
      const C = this.catchPoint(), from = V(P0.pass.from.x, P0.pass.from.y, P0.pass.from.z);
      return { B: t <= P0.pass.t0 ? from : ballistic(from, C, P0.pass.t0, P0.pass.t1, t), state: 'pass', ov: {} };
    }
    if (P0.release === undefined || t < P0.release) {
      const i = clamp(Math.round(t * HZ), 0, this.T.n - 1);
      return { B: this.recBall(t), state: this.recHeld[i] > 0.5 ? 'held' : 'dribble', ov: {} };
    }
    if (P0.formShot) return { ...this.formBall(t), ov: {} };
    // (a pass out: from the release the ball is the catcher's rep's)
    if (P0.passOut) return { B: this.recBall(P0.release), state: 'gone', ov: {} };
    if (P0.layup) return { ...this.layupBall(t), ov: {} };
    return { ...this.shotBall(t), ov: {} };
  }
  // plan.swipe: [{ from, to, side, gap }] - a reach at the ball (from behind, or in the passing lane) that comes up
  // short: the hand goes at the ball but stops `gap` m (wrist to ball centre) off it, because there's a body or
  // distance in the way
  d1Pose(t) {
    const R = super.d1Pose(t), sw = this.plan.swipe;
    if (!sw) return R;
    for (const k of [].concat(sw)) {
      const w = smooth((t - k.from) / (k.rise ?? 0.15)) * (1 - smooth((t - k.to) / (k.fall ?? 0.25)));
      if (w <= 0) continue;
      const sh = this.tab(k.side === 'L' ? 'd1shL' : 'd1shR', t), B = this.handsAndBall(t).B, to = B.clone().sub(sh), d = to.length();
      to.normalize();
      const reach = Math.min(this.armLen.d1 * 0.97, Math.max(0.3, d - (k.gap ?? 0.42)));
      const out = V(-to.z, 0, to.x).multiplyScalar(k.side === 'L' ? -1 : 1);
      R.opt.handOverride = { ...(R.opt.handOverride || {}), [k.side]: { pos: sh.clone().addScaledVector(to, reach), palm: to.clone(), dir: to.clone(), pole: V(0, -1, 0).addScaledVector(out, 0.5).normalize(), curl: 0.12, w } };
    }
    return R;
  }
  // eyes up: the performer dribbles looking at the ball (a drill habit); in a game it's on his man, then the rim.
  // plan.eyes: [{ from, to, w }] lowers that for a while (a spin: the head goes round with the body)
  youPose(t) {
    const Y = super.youPose(t), P0 = this.plan;
    if (!P0.rec) return Y;
    // the drill: nobody guards him - eyes on the tape on the wall, or on the rim
    if (P0.drill) {
      const h = this.tab('head', t), f = this.fwd(t);
      // (side-on to the wall for the off-hand drill: eyes straight ahead at rim height, where the shot would go)
      Y.opt.look = P0.drill === 'tap' ? (P0.offHand ? h.addScaledVector(f, 6).setY(3.05) : P0.tapAt ? V(P0.tapAt.x, P0.tapAt.y, P0.tapAt.z) : h.addScaledVector(f, 0.8).setY(h.y + 0.45)) : RIM.clone();
      Y.opt.lookW = 0.7;
      return Y;
    }
    let w = Math.max(Y.opt.lookW, P0.lookW ?? 0.8);
    for (const e of P0.eyes || []) { const k = smooth((t - e.from) / 0.12) * (1 - smooth((t - e.to) / 0.15)); w += (e.w - w) * k; }
    Y.opt.lookW = w;
    return Y;
  }
}
