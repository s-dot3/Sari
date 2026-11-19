// v15 "Snatch crossover": a glowing X-ray skeleton with faint blue muscle on an arena floor at night, a crowd in
// the dark beyond - right-hand pound dribbles, the snatch back left in a low crossover, a dead 1-2 stop, straight up,
// the jumper at the top, a high arc and a swish. One take: the camera holds a three-quarter front view through the
// dribbles and swings round behind him as he rises (the clip easing into slow motion), riding the ball to the net.
// 720x1280 at 30 fps, motion blur and bloom.
import * as THREE from 'three';
import { buildArena, arenaEnvironment } from './arena.js';
import { loadTemplates, makePlayerMesh, Rig } from './player.js';
import { loadClip } from './mocap.js';
import { CLIPS15, REPS, buildRep } from './play15.js';
import { Rep, RIM } from './rep5.js';
import { buildTimeMap, FPS } from './timeline15.js';
import { makeBall } from './ball.js';
import { loadBones, makeBoneSkeleton } from './boneskel.js';

const W = 720, H = 1280;
const q = new URLSearchParams(location.search);
const SUB = q.has('sub') ? +q.get('sub') : 2;
const SPECS = { you: { model: '04', tex: 'you', height: 2.125 }, d1: { model: '03', tex: 'd1', height: 2.0 } };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

const texLoads = { done: 0, total: 0 };
THREE.DefaultLoadingManager.onProgress = (u, done, total) => { texLoads.done = done; texLoads.total = total; };

// glow that is brighter where a surface turns away from the camera (the rim of an X-ray): the emissive term scaled
// by a fresnel factor
function fresnelGlow(mat, base, edge, pow) {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float fres = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), ${pow.toFixed(2)});
      totalEmissiveRadiance *= ${base.toFixed(3)} + ${edge.toFixed(3)} * fres;`);
  };
  return mat;
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
  // night: the bowl dark, one big pool of light on the floor, cool rims from the corners
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(arenaEnvironment(), 0.02).texture;
  scene.environmentIntensity = 0.35;
  scene.add(new THREE.HemisphereLight(0xb8c6e6, 0x2a2018, 0.22));
  const spot = new THREE.SpotLight(0xfff1df, 300, 40, 0.42, 0.85, 1.6);
  spot.position.set(1.5, 15, 8); spot.target.position.set(0.4, 0, 4.2); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0002; spot.shadow.normalBias = 0.02; spot.shadow.radius = 3;
  scene.add(spot, spot.target);
  for (const [x, z, c, i] of [[-9, -4, 0x9fc4ff, 0.9], [9, 14, 0x9fc4ff, 0.7]]) { const l = new THREE.DirectionalLight(c, i); l.position.set(x, 8, z); scene.add(l); }
  const arena = buildArena(renderer, scene, { baselineText: '', baseText: '', ledWords: ['NIGHT RUN', 'SHOT CLOCK', 'FOURTH QUARTER', 'HOOPS', 'GAME NIGHT'] });
  const T = await loadTemplates(['04', '03']);
  const players = {};
  for (const [name, s] of Object.entries(SPECS)) { const { root, k } = makePlayerMesh(T, s); scene.add(root); players[name] = { root, rig: new Rig(root, k), spec: s }; }
  players.d1.root.visible = false;
  // the X-ray: bones glowing white-blue (brighter at their edges), the body round them a faint blue shell that only
  // shows at its silhouette and along the muscles' relief (the body's own normal map), added on top
  const bones = await loadBones('../assets/bones');
  const boneMat = fresnelGlow(new THREE.MeshStandardMaterial({ color: 0xdce6f2, emissive: 0xc4dcff, emissiveIntensity: 0.9, roughness: 0.38, metalness: 0, envMapIntensity: 0.8 }), 0.45, 1.6, 2.0);
  let body = null; players.you.root.traverse(o => { if (o.isSkinnedMesh && !body) body = o; });
  players.you.bones = makeBoneSkeleton(bones, body, { feet: true, material: boneMat });
  // (the body only: the head's shell, with its hair, would sit round the skull like a helmet)
  body.material = body.material.map(m => /head/i.test(m.name) ? new THREE.MeshBasicMaterial({ visible: false }) : fresnelGlow(new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x2f7dff,
    emissiveIntensity: 1.0, normalMap: m.normalMap, roughness: 1, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 0 }), 0.004, 0.32, 3.2));
  body.castShadow = false; body.renderOrder = 2;
  const clips = {}; for (const c of CLIPS15) clips[c] = await loadClip(c);
  const legOf = (r) => r.len.thigh + r.len.calf;
  const rigs = { you: players.you.rig, d1: players.d1.rig }, legs = { you: legOf(rigs.you), d1: legOf(rigs.d1) };
  const rep = new Rep('snatch', buildRep('snatch', clips, legs), rigs, clips, { ...REPS.snatch.plan, simEnd: REPS.snatch.simEnd });
  const ball = makeBall(scene);
  const camera = new THREE.PerspectiveCamera(52, W / H, 0.05, 160);
  const frames = buildTimeMap({ snatch: rep }, FPS);
  const path = bakeCamera(rep);
  const pw = Math.round(W * renderer.getPixelRatio()), ph = Math.round(H * renderer.getPixelRatio());
  const rt = (w, h, s = 0) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: s });
  const targets = { scene: rt(pw, ph, q.has('nomsaa') ? 0 : 4), accum: rt(pw, ph), b1: rt(pw >> 1, ph >> 1), b2: rt(pw >> 1, ph >> 1), c1: rt(pw >> 2, ph >> 2), c2: rt(pw >> 2, ph >> 2) };
  window.__frames = frames.length; window.__fps = FPS;
  while (texLoads.done < texLoads.total) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 1200));
  return { renderer, scene, camera, arena, players, rep, ball, frames, path, targets };
}

// The camera, one take: three-quarter in front of him (off his right side) through the dribbles, low, tight; from the
// stop it swings round behind him and rises as he goes up, and after the release it rides the ball to the net.
// Positions are orbits about the spot he shoots from, smoothed by critically damped springs with a little look-ahead.
function bakeCamera(rep) {
  const P = rep.plan, S = rep.frame('you', P.release).p, toRim = V(RIM.x - S.x, 0, RIM.z - S.z).normalize();
  const ideal = (t) => {
    const y = rep.frame('you', t).p, u = smooth((t - (P.gatherAt - 0.2)) / (P.release + 0.45 - (P.gatherAt - 0.2)));
    // (it ends straight behind him and up: in the tall frame he's below and the rim above, the arc between)
    const az = (62 + (174 - 62) * u) * Math.PI / 180, dist = 3.3 + 2.0 * u, h = 1.25 + 1.2 * u;
    // az: 0 = between him and the rim, 180 = straight behind him; the orbit is about where he is, then where he shoots
    const c = y.clone().lerp(S, smooth((t - (P.gatherAt - 0.6)) / 0.6));
    const dir = toRim.clone().applyAxisAngle(V(0, 1, 0), -az);
    const pos = c.clone().addScaledVector(dir, dist); pos.y = h;
    // on him - rising with him as he goes up - until the ball leaves his hand, then out along its arc to the rim
    const look = y.clone().setY(1.05 + 0.5 * smooth((t - (P.takeoff - 0.2)) / 0.5));
    const shot = S.clone().lerp(V(RIM.x, 0, RIM.z), 0.5); shot.y = 2.3;
    const w0 = smooth((t - P.release) / 0.6) * u * u; look.lerp(shot, w0);
    const w = smooth((t - P.release) / 0.3) * (1 - smooth((t - (P.rim + 0.6)) / 0.7));
    if (w > 0) { const b = rep.ball(t).pos, m = b.clone().lerp(RIM, 0.5); look.lerp(m, 0.5 * w); }
    return { pos, look, fov: 52 + 8 * u };
  };
  const dt = 1 / 240, lead = 0.15, track = [], end = P.simEnd, wp = 3.4, wl = 5.0;
  let pos = null, look = null; const vp = V(), vl = V();
  const step = (x, v, target, om) => { const f = 1 + 2 * dt * om, oo = om * om, hoo = dt * oo, hhoo = dt * hoo, det = 1 / (f + hhoo); return [(f * x + dt * v + hhoo * target) * det, (v + hoo * (target - x)) * det]; };
  for (let t = 0; t <= end + 1e-6; t += dt) {
    const want = ideal(Math.min(t + lead, end));
    if (!pos) { pos = want.pos.clone(); look = want.look.clone(); }
    for (const a of ['x', 'y', 'z']) { [pos[a], vp[a]] = step(pos[a], vp[a], want.pos[a], wp); [look[a], vl[a]] = step(look[a], vl[a], want.look[a], wl); }
    track.push({ pos: pos.clone(), look: look.clone(), fov: want.fov });
  }
  return (st) => { const f = Math.min(Math.max(st / dt, 0), track.length - 1), i = Math.floor(f), j = Math.min(i + 1, track.length - 1), u = f - i;
    return { pos: track[i].pos.clone().lerp(track[j].pos, u), look: track[i].look.clone().lerp(track[j].look, u), fov: track[i].fov + (track[j].fov - track[i].fov) * u }; };
}

const ctx = await init().catch(e => { window.__error = String(e.stack || e); throw e; });
const { renderer, scene, camera, arena, players, rep, ball, frames, path, targets } = ctx;

const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const accMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, w: { value: 1 } }, vertexShader: VS,
  fragmentShader: 'uniform sampler2D t; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * w, 1.0); }',
  blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
// bloom: the bright parts, blurred at half and quarter size, added back
const brightMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: VS, toneMapped: false, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D t; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.55, 1.4, l), 1.0); }` });
const blurMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new THREE.Vector2() } }, vertexShader: VS, toneMapped: false, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D t; uniform vec2 d; varying vec2 vUv;
    void main(){ vec3 s = texture2D(t, vUv).rgb * 0.227;
      s += (texture2D(t, vUv + d).rgb + texture2D(t, vUv - d).rgb) * 0.1946;
      s += (texture2D(t, vUv + 2.0 * d).rgb + texture2D(t, vUv - 2.0 * d).rgb) * 0.1216;
      s += (texture2D(t, vUv + 3.0 * d).rgb + texture2D(t, vUv - 3.0 * d).rgb) * 0.054;
      s += (texture2D(t, vUv + 4.0 * d).rgb + texture2D(t, vUv - 4.0 * d).rgb) * 0.0162;
      gl_FragColor = vec4(s, 1.0); }` });
const copyMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: VS, toneMapped: false, depthTest: false, depthWrite: false,
  fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.0); }' });
// the grade: bloom in, a cool cast in the shadows, vignette and grain; `fade` takes it to black at the ends
const outMat = new THREE.ShaderMaterial({ uniforms: { t: { value: targets.accum.texture }, b1: { value: targets.b1.texture }, b2: { value: targets.c1.texture }, seed: { value: 0 }, res: { value: new THREE.Vector2(W, H) }, fade: { value: 1 } }, vertexShader: VS,
  fragmentShader: `uniform sampler2D t; uniform sampler2D b1; uniform sampler2D b2; uniform float seed; uniform vec2 res; uniform float fade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
    void main(){
      vec3 c = texture2D(t, vUv).rgb + texture2D(b1, vUv).rgb * 0.55 + texture2D(b2, vUv).rgb * 0.7;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(c, c * vec3(0.9, 0.97, 1.12), (1.0 - smoothstep(0.0, 0.35, l)) * 0.6);
      vec2 d = vUv - 0.5; d.x *= res.x / res.y; c *= 1.0 - 0.38 * smoothstep(0.35, 1.0, length(d) * 1.35);
      float g = (h(vUv * res) + h(vUv * res + 17.3) - 1.0) * 0.018; c += g * (0.3 + c);
      gl_FragColor = vec4(max(c, 0.0) * fade, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`, depthTest: false, depthWrite: false });
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accMat);
const quadScene = new THREE.Scene(); quadScene.add(quad);
const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };

function poseAll(st) {
  const Y = rep.youPose(st); players.you.rig.applyMocap(Y.T, Y.T.src, Y.opt);
  const D = rep.d1Pose(st); players.d1.rig.applyMocap(D.T, D.T.src, D.opt);
  const b = rep.ball(st);
  ball.position.copy(b.pos); ball.quaternion.copy(b.q);
  arena.net.update(b.state === 'net' ? b.netU : (b.state === 'drop' ? 1.2 : 0), b.state === 'net' ? 1 : 0);
}
function place(c, jx, jy) {
  camera.position.copy(c.pos); camera.up.set(0, 1, 0); camera.lookAt(c.look);
  camera.fov = c.fov; camera.setViewOffset(W, H, jx, jy, W, H); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
const JIT = [[-0.25, -0.25], [0.25, 0.25], [0.25, -0.25], [-0.25, 0.25]];
function renderSub(st, k, first) {
  poseAll(st);
  place(window.camOverride || path(st), JIT[k % 4][0], JIT[k % 4][1]);
  scene.updateMatrixWorld(true);
  if (first) { arena.floor.visible = false; arena.reflector.onBeforeRender(renderer, scene, camera); arena.floor.visible = true; }
  renderer.setRenderTarget(targets.scene); renderer.render(scene, camera);
  accMat.uniforms.t.value = targets.scene.texture; accMat.uniforms.w.value = 1 / SUB; quad.material = accMat;
  renderer.setRenderTarget(targets.accum); renderer.autoClear = false; renderer.render(quadScene, quadCam); renderer.autoClear = true;
}
function present(seed, fade) {
  brightMat.uniforms.t.value = targets.accum.texture; pass(brightMat, targets.b1);
  const blur = (a, b, w, h, s) => { blurMat.uniforms.t.value = a.texture; blurMat.uniforms.d.value.set(s / w, 0); pass(blurMat, b); blurMat.uniforms.t.value = b.texture; blurMat.uniforms.d.value.set(0, s / h); pass(blurMat, a); };
  const w1 = targets.b1.width, h1 = targets.b1.height, w2 = targets.c1.width, h2 = targets.c1.height;
  blur(targets.b1, targets.b2, w1, h1, 1.6);
  copyMat.uniforms.t.value = targets.b1.texture; pass(copyMat, targets.c1);
  blur(targets.c1, targets.c2, w2, h2, 2.2); blur(targets.c1, targets.c2, w2, h2, 2.2);
  renderer.setRenderTarget(null); outMat.uniforms.seed.value = seed; outMat.uniforms.fade.value = fade; pass(outMat, null);
  const gl = renderer.getContext(); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
}

renderSub(0.5, 0, true); present(0, 1);

const DUR = frames.length / FPS;
window.renderFrame = (i) => {
  const t0 = performance.now();
  const fr = frames[Math.min(i, frames.length - 1)];
  renderer.setRenderTarget(targets.accum); renderer.setClearColor(0x000000, 1); renderer.clear();
  const shutter = fr.rate / (2 * FPS);
  for (let k = 0; k < SUB; k++) renderSub(Math.max(0, fr.st + ((k + 0.5) / SUB - 0.5) * shutter), k, k === 0);
  present(i * 0.618, Math.max(0, Math.min(1, fr.vt / 0.3, (DUR - fr.vt) / 0.45)));
  return performance.now() - t0;
};
window.renderSim = (name, st) => {
  renderer.setRenderTarget(targets.accum); renderer.setClearColor(0x000000, 1); renderer.clear();
  for (let k = 0; k < SUB; k++) renderSub(st, k, k === 0);
  present(1.0, 1);
};
// sound events in video time (the slow-motion part carries its playback rate, so the sound is slowed with it)
window.events = () => {
  const ev = { duration: DUR, bounces: [], catches: [], swish: [], releases: [], squeaks: [], cuts: [], board: [], thuds: [], whistles: [], freezes: [], rims: [] };
  const P = rep.plan, vtOf = (st) => { let best = frames[0]; for (const f of frames) if (Math.abs(f.st - st) < Math.abs(best.st - st)) best = f; return best; };
  const push = (arr, st, extra = {}) => { if (st > frames[frames.length - 1].st) return; const f = vtOf(st); arr.push({ t: f.vt + (st - f.st) / f.rate, rate: f.rate, ...extra }); };
  for (const f of rep.flights) push(ev.bounces, f.tb, { gain: 0.95 });
  let py = RIM.y - 0.54, vy = -1.9, t = P.netEnd; const G = 9.81, R = 0.12;
  for (let j = 0; j < 6; j++) { const tHit = (vy + Math.sqrt(vy * vy + 2 * G * (py - R))) / G; t += tHit; const vHit = vy - G * tHit; vy = -vHit * 0.62; py = R; if (vy < 0.35) break; push(ev.bounces, t, { gain: 0.85 * Math.min(1, Math.abs(vHit) / 6) }); }
  push(ev.swish, P.rim + 0.03); push(ev.catches, P.gatherAt, { gain: 0.8 }); push(ev.releases, P.release, { gain: 0.7 });
  // bare bones on hardwood: soft taps for the plant steps of the stop and the landing
  if (P.takeoff) push(ev.squeaks, P.takeoff - 0.04, { gain: 0.35 });
  return ev;
};
window.rep = rep; window.players = players;
window.__ready = true;
