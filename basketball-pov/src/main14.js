// v14 "Under the El": a brand-new street-ball clip in the style of the user's own (a skeleton cooking people at a
// park court, a crowd round it, shot on a phone) - a different court, different people, different plays: a city
// court on a sunny afternoon beside an elevated subway line, the skeleton against a man in a royal-blue tank and a
// man in a gold tee, every handle a real one from motion capture at the speed it was played, filmed from behind his
// shoulder, and no talking on the soundtrack. 1080x1920 at 30 fps with motion blur.
import * as THREE from 'three';
import { buildElCourt, elEnvironment, SUN } from './elcourt.js';
import { loadTemplates, makePlayerMesh, Rig } from './player.js';
import { loadClip } from './mocap.js';
import { CLIPS14, REPS, buildRep } from './play14.js';
import { Rep, RIM } from './rep5.js';
import { buildTimeMap, FPS, SEQ } from './timeline14.js';
import { makeBall } from './ball.js';
import { Cam5 } from './camera5.js';
import { loadBones, makeBoneSkeleton, makeShoes } from './boneskel.js';
import { Crowd } from './crowd14.js';

const W = 1080, H = 1920;
const q = new URLSearchParams(location.search);
const SUB = q.has('sub') ? +q.get('sub') : 2;
// the skeleton built taller than he reads (about 6'5" to the top of the skull in his stance); the two defenders
// are people, about 6'3" and 6'1"
const SPECS = { you: { model: '04', tex: 'you', height: 2.125 }, d_blue: { model: '04', tex: 'd_blue', height: 1.92 }, d_gold: { model: '02', tex: 'd_gold', height: 1.86 } };
const DEFS = ['d_blue', 'd_gold'];

// every texture the players and the crowd load, counted, so no frame is drawn before they're in
const texLoads = { done: 0, total: 0 };
THREE.DefaultLoadingManager.onProgress = (u, done, total) => { texLoads.done = done; texLoads.total = total; };

async function init() {
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(q.has('half') ? 0.5 : 1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  // light: the afternoon sun (hard shadows on the court), the sky as an environment and a little bounce from the ground
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(elEnvironment(), 0.04, 0.1, 1000).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xc2d6f2, 0x6b6052, 0.35));
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.1);
  sun.target.position.set(0, 0, 4.5); sun.position.copy(sun.target.position).addScaledVector(SUN, 45); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 95;
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.025; sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);
  const street = buildElCourt(renderer, scene);
  const T = await loadTemplates(['04', '03', '02']);
  const players = {};
  for (const [name, s] of Object.entries(SPECS)) { const { root, k } = makePlayerMesh(T, s); scene.add(root); players[name] = { root, rig: new Rig(root, k), spec: s }; }
  // the ball handler: the bones, in black sneakers
  const bones = await loadBones('../assets/bones');
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 0.5, metalness: 0, envMapIntensity: 0.9 });
  { const p = players.you; let m = null; p.root.traverse(o => { if (o.isSkinnedMesh && !m) m = o; });
    p.bones = makeBoneSkeleton(bones, m, { feet: false, material: boneMat }); p.shoes = makeShoes(m); m.visible = false;
    for (const mt of p.shoes.material) { mt.color.setRGB(0.07, 0.07, 0.075); mt.roughness = 0.75; } }
  const clips = {}; for (const c of CLIPS14) clips[c] = await loadClip(c);
  const legOf = (r) => r.len.thigh + r.len.calf;
  const reps = {};
  for (const name of Object.keys(REPS)) {
    const dn = REPS[name].d, rigs = { you: players.you.rig, d1: players[dn].rig }, legs = { you: legOf(rigs.you), d1: legOf(rigs.d1) };
    reps[name] = new Rep(name, buildRep(name, clips, legs), rigs, clips, { ...REPS[name].plan, simEnd: REPS[name].simEnd });
    reps[name].d = dn;
    if (REPS[name].log) console.log(name, 'his man:', REPS[name].log.join(' | '));
  }
  const cam = new Cam5(reps);
  // the crowd, leaving room round wherever the camera goes (it is somebody on the court filming, not behind a head)
  const camAt = []; for (const name of Object.keys(reps)) for (let t = 0; t <= reps[name].plan.simEnd; t += 0.2) camAt.push(cam.at(name, 'take', t).pos);
  const crowd = q.has('nocrowd') ? null : new Crowd(T, scene, { benches: street.benches, skip: (x, z) => camAt.some(p => Math.hypot(p.x - x, p.z - z) < 1.6) });
  const ball = makeBall(scene);
  const camera = new THREE.PerspectiveCamera(54, W / H, 0.1, 2600);
  const frames = buildTimeMap(reps, FPS);
  const pw = Math.round(W * renderer.getPixelRatio()), ph = Math.round(H * renderer.getPixelRatio());
  const rtScene = new THREE.WebGLRenderTarget(pw, ph, { type: THREE.HalfFloatType, samples: q.has('nomsaa') ? 0 : 4 });
  const rtAccum = new THREE.WebGLRenderTarget(pw, ph, { type: THREE.HalfFloatType });
  window.__frames = frames.length; window.__fps = FPS;
  while (texLoads.done < texLoads.total) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 1500));
  return { renderer, scene, camera, street, players, reps, ball, cam, frames, crowd, rtScene, rtAccum };
}

const ctx = await init().catch(e => { window.__error = String(e.stack || e); throw e; });
const { renderer, scene, camera, street, players, reps, ball, cam, frames, crowd, rtScene, rtAccum } = ctx;

const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const accMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, w: { value: 1 } }, vertexShader: VS,
  fragmentShader: 'uniform sampler2D t; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * w, 1.0); }',
  blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
// phone look: a touch of contrast, vignette and sensor grain; `fade` takes it to black at the very start and end
const outMat = new THREE.ShaderMaterial({ uniforms: { t: { value: rtAccum.texture }, seed: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, fade: { value: 1 } }, vertexShader: VS,
  fragmentShader: `uniform sampler2D t; uniform float seed; uniform vec2 res; uniform float fade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main(){
      vec3 c = texture2D(t, vUv).rgb * 1.04 + 0.003;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, 1.08);
      vec2 d = vUv - 0.5; d.x *= res.x / res.y; c *= 1.0 - 0.26 * smoothstep(0.38, 1.05, length(d) * 1.35);
      float g = (h(vUv * res) + h(vUv * res + 17.3) - 1.0) * 0.02; c += g * (0.35 + c);
      gl_FragColor = vec4(max(c, 0.0) * fade, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`, depthTest: false, depthWrite: false });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat);
const quadScene = new THREE.Scene(); quadScene.add(quad);

// what the crowd follows: the ball handler's chest, and the ball once it's in the air
function watcher(rep) {
  const P = rep.plan;
  return (t) => {
    const tt = Math.max(0, Math.min(P.simEnd, t)), h = rep.frame('you', tt).p.clone().setY(1.25);
    if (P.release !== undefined && tt > P.release) { const u = Math.min(1, (tt - P.release) / 0.4); return h.lerp(rep.ball(tt).pos, u * 0.8); }
    return h;
  };
}
function poseAll(rep, st) {
  const Y = rep.youPose(st); players.you.rig.applyMocap(Y.T, Y.T.src, Y.opt);
  // the man guarding him this possession; the other one is off the floor
  for (const n of DEFS) players[n].root.visible = n === rep.d;
  // the train goes by up on the el during the first possession
  const tr = REPS[rep.name].train;
  street.train.visible = !!tr; if (tr) street.train.position.x = tr.x0 + tr.v * st;
  const D = rep.d1Pose(st); players[rep.d].rig.applyMocap(D.T, D.T.src, D.opt);
  const b = rep.ball(st);
  ball.position.copy(b.pos); ball.quaternion.copy(b.q);
  street.net.update(b.state === 'net' ? b.netU : (b.state === 'drop' ? 1.2 : 0), b.state === 'net' ? 1 : 0);
  if (crowd) crowd.update(st, watcher(rep));
}
// handheld: a slow drift and a little shake on top of the camera's path (smooth noise of the clip's own time)
const nz = (t, s) => Math.sin(t * 1.31 + s) * 0.5 + Math.sin(t * 2.17 + s * 2.3) * 0.3 + Math.sin(t * 4.73 + s * 0.7) * 0.2;
function place(c, vt, jx, jy) {
  const sh = 0.012, rot = 0.0035;
  const p = new THREE.Vector3(c.pos.x + nz(vt, 1) * sh, c.pos.y + nz(vt, 2) * sh, c.pos.z + nz(vt, 3) * sh);
  camera.position.copy(p); camera.up.set(0, 1, 0); camera.lookAt(c.look.x, c.look.y, c.look.z);
  camera.rotateX(nz(vt, 4) * rot); camera.rotateY(nz(vt, 5) * rot); camera.rotateZ(nz(vt, 6) * rot * 1.6);
  camera.fov = c.fov; camera.setViewOffset(W, H, jx, jy, W, H); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  street.sky.position.copy(camera.position);
}
const JIT = [[-0.25, -0.25], [0.25, 0.25], [0.25, -0.25], [-0.25, 0.25], [0, 0], [0.125, -0.375], [-0.375, 0.125], [0.375, 0.375]];
function renderSub(rep, mode, st, vt, k) {
  poseAll(rep, st);
  // (window.camOverride = {pos, look, fov} pins the camera, for trying angles in stills)
  place(window.camOverride || cam.at(rep.name, mode, st), vt, JIT[k % JIT.length][0], JIT[k % JIT.length][1]);
  scene.updateMatrixWorld(true);
  renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
  accMat.uniforms.t.value = rtScene.texture; accMat.uniforms.w.value = 1 / SUB; quad.material = accMat;
  renderer.setRenderTarget(rtAccum); renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = true;
}
function present(seed, fade) {
  renderer.setRenderTarget(null); quad.material = outMat; outMat.uniforms.seed.value = seed; outMat.uniforms.fade.value = fade; renderer.render(quadScene, quadCam);
  const gl = renderer.getContext(); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
}

// first draws compile programs and allocate shadow maps: do that before any real frame
renderSub(Object.values(reps)[0], 'take', 0.5, 0, 0); present(0, 1);

const DUR = frames.length / FPS;
window.renderFrame = (i) => {
  const t0 = performance.now();
  const fr = frames[Math.min(i, frames.length - 1)], rep = reps[fr.rep], seg = SEQ[fr.seg];
  renderer.setRenderTarget(rtAccum); renderer.setClearColor(0x000000, 1); renderer.clear();
  const shutter = fr.rate / (2 * FPS);
  for (let k = 0; k < SUB; k++) {
    const st = Math.min(seg.to, Math.max(seg.from, fr.st + ((k + 0.5) / SUB - 0.5) * shutter));
    renderSub(rep, fr.cam, st, fr.vt + ((k + 0.5) / SUB - 0.5) / FPS / 2, k);
  }
  const fade = Math.min(1, fr.vt / 0.35, (DUR - fr.vt) / 0.5);
  present(i * 0.618, Math.max(0, fade));
  return performance.now() - t0;
};
// stills for checks: renderSim(rep, st, mode)
window.renderSim = (name, st, mode = 'take') => {
  const rep = reps[name];
  renderer.setRenderTarget(rtAccum); renderer.setClearColor(0x000000, 1); renderer.clear();
  let vt = 0; for (const f of frames) if (f.rep === name) { vt = f.vt + (st - f.st); break; }
  for (let k = 0; k < SUB; k++) renderSub(rep, mode, st, vt, k);
  present(1.0, 1);
};
window.events = () => {
  const ev = { duration: frames.length / FPS, bounces: [], catches: [], swish: [], releases: [], squeaks: [], steps: [], trains: [], cuts: [], board: [], thuds: [], whistles: [], freezes: [], rims: [] };
  let vt = 0, prev = null;
  SEQ.forEach((s) => {
    const n = Math.round((s.to - s.from) / s.rate * FPS), v0 = vt;
    if (prev) ev.cuts.push({ t: v0 });
    const rep = reps[s.rep], P = rep.plan;
    const push = (arr, st, extra = {}) => { if (st >= s.from && st < s.to) arr.push({ t: v0 + (st - s.from) / s.rate, rate: s.rate, ...extra }); };
    for (const f of rep.flights) push(ev.bounces, f.tb, { gain: 0.95 });
    let py = RIM.y - 0.54, vy = -1.9, t = P.netEnd; const G = 9.81, R = 0.12;
    for (let j = 0; j < 6; j++) { const tHit = (vy + Math.sqrt(vy * vy + 2 * G * (py - R))) / G; t += tHit; const vHit = vy - G * tHit; vy = -vHit * 0.62; py = R; if (vy < 0.35) break; push(ev.bounces, t, { gain: 0.85 * Math.min(1, Math.abs(vHit) / 6) }); }
    push(ev.swish, P.rim + 0.03);
    push(ev.catches, P.gatherAt, { gain: 0.8 });
    push(ev.releases, P.release, { gain: 0.7 });
    if (P.board) push(ev.board, P.board);
    // sneakers: every change of move on either side
    for (const tr of [rep.tracks.you, rep.tracks.d1]) for (const sg of tr.segs.slice(1)) push(ev.squeaks, sg.at + 0.05, { gain: 0.8 });
    if (P.takeoff) push(ev.squeaks, P.takeoff - 0.04, { gain: 0.7 });
    // the train on the el: when its middle is over the court (its sound is cut with the picture at the edit)
    const tr = REPS[s.rep].train;
    if (tr) { const mid = (-tr.x0 - 2 * 15.6) / tr.v; ev.trains.push({ t: v0 + (mid - s.from) / s.rate, t0: v0, t1: v0 + n / FPS, speed: tr.v }); }
    // every foot coming down on the asphalt, his and his man's (the ankle dropping back to the floor)
    const HZ = (rep.T.n - 1) / P.simEnd;
    for (const [arr, g] of [[rep.T.ankL, 1], [rep.T.ankR, 1], [rep.T.d1feet.map(f => f[0]), 0.8], [rep.T.d1feet.map(f => f[1]), 0.8]]) {
      const fl = Math.min(...arr.map(v => v.y)); let up = false, last = -1;
      for (let i = 1; i < arr.length; i++) {
        const y = arr[i].y;
        if (y > fl + 0.06) up = true;
        if (up && y < fl + 0.025 && i / HZ - last > 0.15) { const v = (arr[Math.max(0, i - 6)].y - y) * HZ / 6; push(ev.steps, i / HZ, { gain: g * Math.min(1, 0.4 + v / 1.5) }); up = false; last = i / HZ; }
      }
    }
    vt += n / FPS; prev = s;
  });
  return ev;
};
window.reps = reps; window.players = players; window.crowd = crowd; window.scene = scene; window.renderer = renderer; window.cam = cam;
window.__ready = true;
