// v16 "No Open Looks": team defence in the practice gym - three on three in team kits (white offence, red defence),
// every possession from real takes, a coach's telestrator on the floor (rings, who's-got-who lines that swap on a
// switch, arrows for the action), call-outs over the players, the shot clock, freezes and slow motion, and every
// possession ending in a contested miss. 1080x1920 at 30 fps with motion blur.
import * as THREE from 'three';
import { buildGym, gymEnvironment } from './gym.js';
import { loadTemplates, makePlayerMesh, Rig } from './player.js';
import { loadClip } from './mocap.js';
import { CLIPS16, CAST, REPS, buildRep } from './play16.js';
import { Rep, RIM } from './rep5.js';
import { footLock } from './game2.js';
import { buildTimeMap, FPS, SEQ } from './timeline16.js';
import { makeBall } from './ball.js';
import { Cam16 } from './cam16.js';
import { Floor16, COLORS } from './floor16.js';
import { Hud16 } from './hud16.js';
import { loadBones, makeBoneSkeleton, makeShoes } from './boneskel.js';
import { FloorMeter } from './meter5.js';
import { smooth } from './motion.js';

const W = 1080, H = 1920, HZ = 240;
const q = new URLSearchParams(location.search);
const SUB = q.has('sub') ? +q.get('sub') : 2;
const texLoads = { done: 0, total: 0 };
THREE.DefaultLoadingManager.onProgress = (u, done, total) => { texLoads.done = done; texLoads.total = total; };

// an extra player's feet held where they plant (v5's foot lock, on his own track)
function lockFor(track, rig, end) {
  const n = Math.ceil(end * HZ) + 1, feet = { L: [], R: [] };
  for (let i = 0; i < n; i++) {
    const P = track.at(i / HZ);
    for (const s of ['L', 'R']) { const k = s.toLowerCase(); feet[s].push({ a: P.pos[k + 'tibia'].clone(), h: P.pos[k + 'hipjoint'].clone(), w: P.planted ? P.planted[s] : 0 }); }
  }
  const leg = rig.len.thigh + rig.len.calf;
  return { n, L: footLock(feet.L, leg), R: footLock(feet.R, leg) };
}
function locked(track, lock, t) {
  const T = track.at(t), f = Math.min(lock.n - 1, Math.max(0, t * HZ)), i = Math.floor(f), j = Math.min(i + 1, lock.n - 1), u = f - i;
  for (const s of ['L', 'R']) { const o = lock[s][i].clone().lerp(lock[s][j], u), k = s.toLowerCase(); for (const p of ['tibia', 'foot', 'toes']) T.pos[k + p].add(o); }
  return T;
}

async function init() {
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(q.has('half') ? 0.5 : 1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(gymEnvironment(), 0.02).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xdfe4f2, 0x7a5a3a, 0.55));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.5);
  key.position.set(3.2, 14, 11); key.target.position.set(0.5, 0, 5.0); key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
  const sc = key.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 10; sc.bottom = -9; sc.near = 2; sc.far = 34;
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015; key.shadow.radius = 4;
  scene.add(key, key.target);
  for (const [x, z, i] of [[-5, 3, 0.55], [6, -2, 0.45]]) { const l = new THREE.DirectionalLight(0xf2f4ff, i); l.position.set(x, 12, z); scene.add(l); }
  const gym = buildGym(renderer, scene, { scoreboard: false, reflect: 0.16, reflectClamp: 0.8 });
  const T = await loadTemplates(['04', '03', '02']);
  const players = {};
  for (const [name, s] of Object.entries(CAST)) { const { root, k } = makePlayerMesh(T, s); scene.add(root); players[name] = { root, rig: new Rig(root, k), spec: s }; }
  // the film-room skeletons (v4-v11): anatomical bones on each rig, the players' own shoes - white for the offence,
  // red for the defence - and nothing else of the model
  const bones = await loadBones('../assets/bones');
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xe4d8c2, roughness: 0.52, metalness: 0, envMapIntensity: 0.8 });
  for (const [name, p] of Object.entries(players)) {
    const meshes = []; p.root.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
    const m = meshes.reduce((a, b) => (b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a));
    p.bones = makeBoneSkeleton(bones, m, { feet: false, material: boneMat }); p.shoes = makeShoes(m);
    for (const o of meshes) o.visible = false;
    const tint = new THREE.Color(CAST[name].team === 'X' ? 0xd8262f : 0xf2f2f0);
    p.shoes.material = [].concat(p.shoes.material).map(mm => { const c = mm.clone(); c.map = null; c.color = tint; c.roughness = 0.6; return c; });
  }
  const clips = {}; for (const c of CLIPS16) clips[c] = await loadClip(c);
  const legs = {}; for (const [n, p] of Object.entries(players)) legs[n] = p.rig.len.thigh + p.rig.len.calf;
  window.__legs = legs;
  const reps = {};
  for (const name of Object.keys(REPS)) {
    const B = buildRep(name, clips, legs), plan = { ...REPS[name].plan, simEnd: REPS[name].simEnd };
    const rigs = { you: players[B.cast.you].rig, d1: players[B.cast.d1].rig };
    // a possession with a pass is two reps on one defender's track: the passer's ball until the pass, then the
    // catcher's from his hands
    let A = null;
    if (B.partA) {
      A = new Rep(name + 'A', B.partA.tracks, { you: players[B.cast.A].rig, d1: rigs.d1 }, clips, { ...B.partA.plan, simEnd: plan.simEnd });
      const b = A.handsAndBall(B.partA.plan.release - 1e-3).B; plan.pass = { ...plan.pass, from: { x: b.x, y: b.y, z: b.z } };
    }
    const rep = reps[name] = new Rep(name, { you: B.you, d1: B.d1 }, rigs, clips, plan);
    rep.partA = A; rep.cast = B.cast; rep.extra = B.extra || {};
    rep.locks = {}; for (const [k, tr] of Object.entries(rep.extra)) rep.locks[k] = lockFor(tr, players[k].rig, plan.simEnd);
    rep.names = [B.cast.you, B.cast.d1].concat(B.cast.A ? [B.cast.A] : [], Object.keys(rep.extra));
  }
  const ball = makeBall(scene);
  const floor = new Floor16(scene);
  const meter = new FloorMeter(scene, { invert: true });
  const trackOf = (rep, who) => who === rep.cast.you ? rep.tracks.you : who === rep.cast.d1 ? rep.tracks.d1 : (rep.partA && who === rep.cast.A) ? rep.partA.tracks.you : rep.extra[who];
  const ballAt = (rep, t) => ((rep.partA && t < rep.plan.pass.t0) ? rep.partA : rep).ball(t).pos;
  const where = (name, who, t) => { const rep = reps[name]; if (who === 'ball') { const b = ballAt(rep, t); return { x: b.x, z: b.z }; } const h = trackOf(rep, who).hip(t); return { x: h.x, z: h.z }; };
  const cam = new Cam16(reps, where);
  const camera = new THREE.PerspectiveCamera(52, W / H, 0.05, 140);
  const frames = buildTimeMap(reps, FPS);
  for (const rep of Object.values(reps)) {
    // closest defender at the release, in feet
    const P = rep.plan, a = rep.frame('you', P.release).p, d = rep.frame('d1', P.release).p;
    P.vals = { ...(P.vals || {}), sep: (a.distanceTo(d) / 0.3048).toFixed(1) };
  }
  const hud = new Hud16(document.getElementById('hud'), reps, frames, FPS);
  const pw = Math.round(W * renderer.getPixelRatio()), ph = Math.round(H * renderer.getPixelRatio());
  const rtScene = new THREE.WebGLRenderTarget(pw, ph, { type: THREE.HalfFloatType, samples: q.has('nomsaa') ? 0 : 4 });
  const rtAccum = new THREE.WebGLRenderTarget(pw, ph, { type: THREE.HalfFloatType });
  window.__frames = frames.length; window.__fps = FPS;
  await document.fonts.ready;
  while (texLoads.done < texLoads.total) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 1500));
  return { renderer, scene, camera, gym, players, reps, ball, floor, meter, cam, frames, hud, rtScene, rtAccum, trackOf, ballAt };
}

const ctx = await init().catch(e => { window.__error = String(e.stack || e); throw e; });
const { renderer, scene, camera, gym, players, reps, ball, floor, meter, cam, frames, hud, rtScene, rtAccum, trackOf, ballAt } = ctx;

const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const accMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, w: { value: 1 } }, vertexShader: VS,
  fragmentShader: 'uniform sampler2D t; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * w, 1.0); }',
  blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
// phone look plus a freeze grade: a freeze drops the saturation and brightness a little so the drawing reads
const outMat = new THREE.ShaderMaterial({ uniforms: { t: { value: rtAccum.texture }, seed: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, fz: { value: 0 } }, vertexShader: VS,
  fragmentShader: `uniform sampler2D t; uniform float seed; uniform vec2 res; uniform float fz; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main(){
      vec3 c = texture2D(t, vUv).rgb * 1.06 + 0.004;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(c, vec3(l), 0.3 * fz) * (1.0 - 0.12 * fz);
      vec2 d = vUv - 0.5; d.x *= res.x / res.y; c *= 1.0 - 0.32 * smoothstep(0.35, 1.05, length(d) * 1.35);
      float g = (h(vUv * res) + h(vUv * res + 17.3) - 1.0) * 0.022; c += g * (0.35 + c);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`, depthTest: false, depthWrite: false });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat);
const quadScene = new THREE.Scene(); quadScene.add(quad);

// the rep whose arrows are built into the floor right now
let arrowRep = null;
function overlays(rep, st, fe) {
  const P = rep.plan, where = {}, teams = {};
  for (const n of rep.names) { const h = trackOf(rep, n).hip(st); where[n] = { x: h.x, z: h.z }; teams[n] = n === rep.cast.d1 ? null : CAST[n].team; }
  // who's got who: lines from each defender to his man; a change swaps them (in the freeze, if there's one on it)
  const links = [];
  const A = P.assign || [];
  for (const dname of rep.names.filter(n => CAST[n].team === 'X')) {
    const hist = A.filter(e => e.map[dname] !== undefined).sort((p, q) => p.t - q.t);
    let k = -1; for (let i = 0; i < hist.length; i++) if (hist[i].t <= st + 1e-6) k = i;
    if (k < 0) continue;
    const cur = hist[k].map[dname], prev = k > 0 ? hist[k - 1].map[dname] : null, te = hist[k].t;
    // (a change is drawn in the freeze at its moment; one marked live is drawn as it plays)
    const el = fe !== null && Math.abs(st - te) < 1e-4 ? fe : hist[k].live ? (st - te) * 2.5 : 99;
    const bad = (P.bad || []).find(e => e.x === dname && st >= e.from && st < e.to);
    const color = bad ? COLORS.bad : COLORS.line;
    if (prev && prev !== cur && el < 1.6) {
      links.push({ from: dname, to: prev, u: 1 - smooth((el - 0.25) / 0.45) });
      links.push({ from: dname, to: cur, u: smooth((el - 0.75) / 0.6), color });
    } else links.push({ from: dname, to: cur, u: 1, color });
  }
  floor.update(where, teams, links, st, fe);
  // arrows: drawn in when the freeze they're introduced in plays (staggered), held through the slow motion after it,
  // gone by `until`
  if (arrowRep !== rep.name) { arrowRep = rep.name; floor.setArrows(P.arrows || [], (who, t) => trackOf(rep, who).hip(t)); }
  for (const a of floor.arrows) {
    let u = 0, alpha = 0;
    if (st > a.at + 1e-4) { u = 1; alpha = 1 - smooth((st - (a.until - 0.35)) / 0.35); }
    else if (Math.abs(st - a.at) < 1e-4 && fe !== null) { u = smooth((fe - (a.delay ?? 0.4)) / 0.7); alpha = 1; }
    floor.drawArrow(a, u, alpha);
  }
}
function tagsOn(rep, st, fe, mode = 'film') {
  const out = [], v = new THREE.Vector3();
  for (const t of rep.plan.tags || []) {
    if (mode !== 'film' && !t.shot) continue;
    let a = 0, pop = 1;
    if (fe !== null && Math.abs(st - t.from) < 1e-4) { a = smooth((fe - (t.delay ?? 0.2)) / 0.2); pop = (fe - (t.delay ?? 0.2)) / 0.25; }
    else if (st >= t.from && st <= t.to) { a = smooth((st - t.from) / 0.12) * (1 - smooth((st - (t.to - 0.15)) / 0.15)); pop = (st - t.from) / 0.2; }
    if (a <= 0.01) continue;
    const r = players[t.who].rig; v.copy(r.P.Head).add(new THREE.Vector3(0, t.up ?? 0.42, 0)).project(camera);
    if (v.z > 1) continue;
    out.push({ x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, text: t.text, kind: t.kind, a, pop, w: 30 + 24 * t.text.length });
  }
  // (call-outs over players standing together are stacked, not piled on each other)
  out.sort((p, q) => q.y - p.y);
  for (let i = 0; i < out.length; i++) for (let k = 0; k < 6; k++) {
    const hit = out.slice(0, i).some(o => Math.abs(o.x - out[i].x) < (o.w + out[i].w) / 2 + 8 && Math.abs(o.y - out[i].y) < 60);
    if (!hit) break; out[i].y -= 62;
  }
  return out;
}
// arms for the off-ball players: a screener's hands in, crossed low in front of him; a denying defender's lead hand
// out in the passing lane
const UPV = new THREE.Vector3(0, 1, 0);
function armsOf(rep, who, st, T, ball) {
  const a = (rep.plan.arms || []).find(e => e.who === who && st >= e.from - 0.25 && st <= e.to + 0.3);
  if (!a) return null;
  const w = smooth((st - (a.from - 0.25)) / 0.25) * (1 - smooth((st - a.to) / 0.3));
  const hip = T.pos.lhipjoint.clone().add(T.pos.rhipjoint).multiplyScalar(0.5), f = new THREE.Vector3(Math.sin(T.yaw), 0, Math.cos(T.yaw)), l = new THREE.Vector3(f.z, 0, -f.x);
  if (a.kind === 'screen') {
    const c = hip.clone().addScaledVector(f, 0.19).addScaledVector(UPV, 0.04), out = {};
    for (const [s, sg] of [['L', 1], ['R', -1]]) {
      out[s] = { pos: c.clone().addScaledVector(l, -0.04 * sg), palm: f.clone().negate().addScaledVector(l, -0.3 * sg).normalize(),
        dir: UPV.clone().negate().addScaledVector(l, -0.8 * sg).normalize(), pole: l.clone().multiplyScalar(sg).addScaledVector(UPV, -0.4).normalize(), curl: 0.55, w };
    }
    return out;
  }
  if (a.kind === 'deny') {
    // the hand nearer the ball, out at shoulder height toward it, palm to the ball
    const s = (ball.x - hip.x) * l.x + (ball.z - hip.z) * l.z > 0 ? 'L' : 'R', sg = s === 'L' ? 1 : -1;
    const sh = hip.clone().addScaledVector(UPV, 0.5).addScaledVector(l, 0.2 * sg), to = new THREE.Vector3(ball.x - sh.x, 0, ball.z - sh.z).normalize();
    const pos = sh.clone().addScaledVector(to, 0.62).addScaledVector(UPV, -0.05);
    return { [s]: { pos, palm: to.clone(), dir: to.clone().addScaledVector(UPV, 0.5).normalize(), pole: l.clone().multiplyScalar(sg).addScaledVector(UPV, -0.6).normalize(), curl: 0.15, w } };
  }
  return null;
}
function poseAll(rep, st, mode, fe = null) {
  const A = rep.partA, pre = A && st < rep.plan.pass.t0, b = ballAt(rep, st);
  for (const [n, p] of Object.entries(players)) p.root.visible = rep.names.includes(n);
  const Y = rep.youPose(st); players[rep.cast.you].rig.applyMocap(Y.T, Y.T.src, Y.opt);
  const D = (pre ? A : rep).d1Pose(st); players[rep.cast.d1].rig.applyMocap(D.T, D.T.src, D.opt);
  if (A) { const O = A.youPose(st); players[rep.cast.A].rig.applyMocap(O.T, O.T.src, O.opt); }
  for (const [k, tr] of Object.entries(rep.extra)) {
    const X = locked(tr, rep.locks[k], st), ov = armsOf(rep, k, st, X, b);
    players[k].rig.applyMocap(X, X.src, { look: b.clone(), lookW: 0.5, curl: 0.3, ...(ov ? { handOverride: ov } : {}) });
  }
  const B = (pre ? A : rep).ball(st);
  ball.position.copy(B.pos); ball.quaternion.copy(B.q);
  gym.net.update(B.state === 'net' ? B.netU : (B.state === 'drop' ? 1.2 : 0), B.state === 'net' ? 1 : 0);
  overlays(rep, st, fe);
  floor.group.visible = mode === 'film' || (rep.plan.floorInShot ?? false);
  // the balance meter under the man with the contest (v5-v10), through his contest
  meter.update(rep.balance(st), 1 - smooth((st - (rep.plan.release + 0.3)) / 0.3));
}
function place(c, jx, jy) {
  camera.position.set(c.pos.x, c.pos.y, c.pos.z); camera.up.set(0, 1, 0); camera.lookAt(c.look.x, c.look.y, c.look.z);
  camera.fov = c.fov; camera.setViewOffset(W, H, jx, jy, W, H); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
const JIT = [[-0.25, -0.25], [0.25, 0.25], [0.25, -0.25], [-0.25, 0.25], [0, 0], [0.125, -0.375], [-0.375, 0.125], [0.375, 0.375]];
function renderSub(rep, mode, st, k, first, fe, w = 1 / SUB) {
  poseAll(rep, st, mode, fe);
  place(window.camOverride || cam.at(rep.name, mode, st), JIT[k % JIT.length][0], JIT[k % JIT.length][1]);
  scene.updateMatrixWorld(true);
  if (first) { const v = floor.group.visible, mv = meter.group.visible; gym.floor.visible = false; floor.group.visible = false; meter.group.visible = false; gym.reflector.onBeforeRender(renderer, scene, camera); gym.floor.visible = true; floor.group.visible = v; meter.group.visible = mv; }
  renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
  accMat.uniforms.t.value = rtScene.texture; accMat.uniforms.w.value = w; quad.material = accMat;
  renderer.setRenderTarget(rtAccum); renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = true;
}
function present(seed, fz) {
  renderer.setRenderTarget(null); quad.material = outMat; outMat.uniforms.seed.value = seed; outMat.uniforms.fz.value = fz; renderer.render(quadScene, quadCam);
  const gl = renderer.getContext(); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
}

renderSub(Object.values(reps)[0], 'film', 0.5, 0, true, null); present(0, 0);

window.renderFrame = (i) => {
  const t0 = performance.now();
  const fr = frames[Math.min(i, frames.length - 1)], rep = reps[fr.rep], seg = SEQ[fr.seg];
  const fe = fr.freeze && !fr.card ? fr.fu * fr.fdur : null;
  renderer.setRenderTarget(rtAccum); renderer.setClearColor(0x000000, 1); renderer.clear();
  // (a freeze has nothing moving: one draw, not SUB of the same pose)
  const shutter = fr.freeze ? 0 : fr.rate / (2 * FPS), subs = fr.freeze ? 1 : SUB;
  for (let k = 0; k < subs; k++) {
    const st = fr.freeze ? fr.st : Math.min(seg.to, Math.max(seg.from, fr.st + ((k + 0.5) / subs - 0.5) * shutter));
    renderSub(rep, fr.cam, st, k, k === 0, fe, 1 / subs);
  }
  hud.update(fr, fr.st, fr.card ? [] : tagsOn(rep, fr.st, fe, fr.cam));
  const fz = fr.freeze && !fr.card ? smooth(fr.fu * 8) : (fr.card ? 0.6 : 0);
  present(i * 0.618, fz);
  return performance.now() - t0;
};
// stills for checks: renderSim(rep, st, mode, freezeElapsed)
window.renderSim = (name, st, mode = 'film', fe = null) => {
  const rep = reps[name];
  if (typeof st === 'string') { const P = rep.plan, m = st.replace('@', ''); st = { shot: P.release + 0.12, miss: P.rim + 0.16, pre: P.release - 0.75, release: P.release }[m] ?? P.marks[m]; }
  renderer.setRenderTarget(rtAccum); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < SUB; k++) renderSub(rep, mode, st, k, k === 0, fe);
  let best = null; for (const f of frames) if (f.rep === name && !f.card && (!best || Math.abs(f.st - st) < Math.abs(best.st - st))) best = f;
  hud.update({ ...best, st, cam: mode, freeze: fe !== null, fu: 0.5 }, st, tagsOn(rep, st, fe, mode));
  present(1.0, fe !== null ? 1 : 0);
};
window.events = () => {
  const ev = { duration: frames.length / FPS, bounces: [], catches: [], swish: [], releases: [], squeaks: [], cuts: [], board: [], thuds: [], whistles: [], freezes: [], rims: [] };
  let vt = 0, prev = null;
  SEQ.forEach((s) => {
    const live = s.freeze === undefined, n = live ? Math.round((s.to - s.from) / s.rate * FPS) : Math.round(s.dur * FPS), v0 = vt;
    if (prev && (prev.cam !== s.cam || prev.rep !== s.rep) && !s.card && !prev.card) ev.cuts.push({ t: v0 });
    if (!live && !s.card) ev.freezes.push({ t: v0 });
    if (live) {
      const rep = reps[s.rep], P = rep.plan;
      const push = (arr, st, extra = {}) => { if (st >= s.from && st < s.to) arr.push({ t: v0 + (st - s.from) / s.rate, rate: s.rate, ...extra }); };
      for (const f of rep.flights.concat(rep.partA ? rep.partA.flights : [])) push(ev.bounces, f.tb, { gain: 0.95 });
      if (rep.partA) { push(ev.catches, rep.partA.plan.gatherAt, { gain: 0.8 }); push(ev.releases, P.pass.t0, { gain: 0.9 }); }
      if (P.miss) {
        rep.ball(P.rim + 0.01); push(ev.rims, P.rim);
        for (const h of rep._miss.hits) push(ev.bounces, h.t, { gain: 0.85 * Math.min(1, h.v / 5) });
      }
      push(ev.catches, P.gatherAt, { gain: 0.8 });
      push(ev.releases, P.release, { gain: 0.7 });
      // sneakers: every change of move, anyone on the floor
      const trs = [rep.tracks.you, rep.tracks.d1].concat(rep.partA ? [rep.partA.tracks.you] : [], Object.values(rep.extra));
      for (const tr of trs) for (const sg of tr.segs.slice(1)) push(ev.squeaks, sg.at + 0.05, { gain: 0.6 });
      if (P.takeoff) push(ev.squeaks, P.takeoff - 0.04, { gain: 0.7 });
    }
    vt += n / FPS; prev = s;
  });
  return ev;
};
window.reps = reps; window.players = players; window.hud = hud; window.__cam = cam; window.camera = camera; window.scene = scene;
window.__ready = true;
