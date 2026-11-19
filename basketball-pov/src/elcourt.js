// v14 "Under the El": a city park court on a sunny afternoon, hard by an elevated subway line. Green court with a
// brick-red key and border painted over old asphalt, black chain-link round it, a parks-department hoop (white steel
// board, double rim, chain net) on a straight pole; past the baseline fence the sidewalk, the street with cars parked
// under the el's riveted steel - a train goes by up there - and across it five-storey walk-ups with fire escapes,
// plane trees in leaf, towers further off. The sun is out: real shadows on the court and the people on it.
// Everything past the fence is lit once, here (baked into its colours); the court, the hoop, the fence, the trees
// and the people near them get the real sun.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COURT, rng, makeTextTexture, Net } from './arena.js';

// the court canvas covers x in [-AX, AX], z in [AZ0, AZ0 + 2 AX]
const AX = 14, AZ0 = -6, ASIZE = 28, ATEX = 4096, PX = ATEX / ASIZE;
const toPx = (x, z) => [(x + AX) * PX, (z - AZ0) * PX];
export const EL = { fenceX: 11.0, fenceZ0: -5.2, fenceZ1: 31.0, sideH: 3.0, endH: 4.6,
  curb: -7.6, colA: -9.4, colB: -15.2, deck: 5.8, farCurb: -18.8, front: -22.0 };
// the sun: mid-afternoon, from over the right shoulder of a camera looking at the hoop (x+, z+), ~36 degrees up
export const SUN = new THREE.Vector3(0.62, 0.6, 0.5).normalize();
const HAZE = new THREE.Color(0.74, 0.8, 0.88);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const texOf = (c, srgb = true, rep = null) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
};
// baked light for things past the fence: skylight, plus the sun on faces that turn to it
const baked = (n, k = 1) => {
  const s = Math.max(0, n.dot(SUN));
  return new THREE.Color(0.42, 0.46, 0.54).multiplyScalar(0.8 + 0.35 * Math.max(0, n.y)).add(new THREE.Color(1.15, 1.02, 0.86).multiplyScalar(s * 1.05 * k));
};
function bake(geo, k = 1, fn = null) {
  const nrm = geo.attributes.normal, pos = geo.attributes.position, col = [];
  for (let i = 0; i < nrm.count; i++) { const c = baked(V(nrm.getX(i), nrm.getY(i), nrm.getZ(i)), k); if (fn) fn(c, pos.getX(i), pos.getY(i), pos.getZ(i)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };

// ---------- the court ----------
function paintCourt(g) {
  const C = COURT, R = rng(43), W = ATEX;
  // old asphalt everywhere, then the paint: green in bounds, brick red outside the lines and in the key and circle
  g.fillStyle = '#5f5f5e'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 160000; i++) { g.fillStyle = R() < 0.5 ? `rgba(30,30,32,${0.05 + R() * 0.1})` : `rgba(190,190,188,${0.04 + R() * 0.07})`; g.fillRect(R() * W, R() * W, 1 + R() * 2.5, 1 + R() * 2.5); }
  const rect = (x0, z0, x1, z1, col) => { const [a, b] = toPx(x0, z0), [c, d] = toPx(x1, z1); g.fillStyle = col; g.fillRect(Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b)); };
  rect(-C.sideX - 1.6, C.baselineZ - 1.5, C.sideX + 1.6, 22.5, '#8a3c31');
  rect(-C.sideX, C.baselineZ, C.sideX, 22.5, '#2c6447');
  rect(-C.laneHalfW, C.baselineZ, C.laneHalfW, C.ftZ, '#8e3d32');
  { const [cx, cy] = toPx(0, C.halfZ); g.fillStyle = '#8e3d32'; g.beginPath(); g.arc(cx, cy, 1.83 * PX, 0, 7); g.fill(); }
  { const [cx, cy] = toPx(0, C.ftZ); g.fillStyle = '#8e3d32'; g.beginPath(); g.arc(cx, cy, C.ftR * PX, 0, Math.PI); g.fill(); }
  // the paint's own wear: lighter where it's chalked and thin, darker where it's been patched, the asphalt showing
  // through in the lane and at the top of the key
  g.save(); g.filter = 'blur(22px)';
  for (let i = 0; i < 90; i++) { const [cx, cy] = toPx((R() * 2 - 1) * 11, -3 + R() * 25); const r = (0.4 + R() * 1.8) * PX; g.fillStyle = R() < 0.6 ? `rgba(255,255,255,${0.04 + R() * 0.07})` : `rgba(0,0,0,${0.05 + R() * 0.08})`; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
  g.restore();
  g.save(); g.globalCompositeOperation = 'source-atop';
  for (const [zx, zz, rr] of [[0, 2.2, 2.4], [0, 7.2, 2.0], [-2.6, 0.6, 1.2], [2.6, 0.6, 1.2], [0, 12.7, 1.6]]) {
    for (let i = 0; i < 2600; i++) { const a = R() * 7, d = Math.sqrt(R()) * rr; const [cx, cy] = toPx(zx + Math.cos(a) * d, zz + Math.sin(a) * d); g.fillStyle = `rgba(96,96,94,${0.25 + R() * 0.5})`; g.beginPath(); g.arc(cx, cy, 1 + R() * 5, 0, 7); g.fill(); }
  }
  g.restore();
  // cracks right through the paint, a few sealed with tar
  const crack = (x, y, a, len, w, depth) => {
    g.strokeStyle = `rgba(28,28,30,${0.55 + R() * 0.3})`; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < len; s += 6) {
      a += (R() - 0.5) * 0.7; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y);
      if (depth < 2 && R() < 0.012) { g.stroke(); crack(x, y, a + (R() < 0.5 ? 1 : -1) * (0.6 + R()), len * 0.4, w * 0.7, depth + 1); g.beginPath(); g.moveTo(x, y); g.strokeStyle = `rgba(28,28,30,${0.55 + R() * 0.3})`; g.lineWidth = w; }
    }
    g.stroke();
  };
  for (let i = 0; i < 40; i++) crack(R() * W, R() * W, R() * Math.PI * 2, (1 + R() * 5) * PX, 1.2 + R() * 2, 0);
  for (let i = 0; i < 8; i++) { g.save(); g.globalAlpha = 0.6; crack(R() * W, R() * W, R() * Math.PI * 2, (2 + R() * 4) * PX, 10 + R() * 8, 2); g.restore(); }
  // gum, bottle caps, sneaker scuffs
  for (let i = 0; i < 700; i++) { g.fillStyle = R() < 0.7 ? `rgba(30,30,32,${0.2 + R() * 0.3})` : `rgba(200,200,196,${0.3 + R() * 0.3})`; g.beginPath(); g.ellipse(R() * W, R() * W, 2 + R() * 7, 2 + R() * 5, R() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 1400; i++) {
    const [px, pz] = toPx((R() * 2 - 1) * 8, -1 + R() * 16), a = R() * Math.PI * 2, l = (0.05 + R() * 0.3) * PX;
    g.strokeStyle = `rgba(20,20,22,${0.04 + R() * 0.08})`; g.lineWidth = 1 + R() * 3; g.beginPath(); g.moveTo(px, pz); g.lineTo(px + Math.cos(a) * l, pz + Math.sin(a) * l); g.stroke();
  }
}

function courtLines(x) {
  const C = COURT;
  const seg = (x0, z0, x1, z1) => { const a = toPx(x0, z0), b = toPx(x1, z1); x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); };
  const arc = (cx, cz, r, a0, a1) => { const c = toPx(cx, cz); x.beginPath(); x.arc(c[0], c[1], r * PX, a0, a1); x.stroke(); };
  seg(-C.sideX, C.baselineZ, C.sideX, C.baselineZ); seg(-C.sideX, C.baselineZ, -C.sideX, 22.5); seg(C.sideX, C.baselineZ, C.sideX, 22.5);
  seg(-C.sideX, C.halfZ, C.sideX, C.halfZ);
  seg(-C.laneHalfW, C.baselineZ, -C.laneHalfW, C.ftZ); seg(C.laneHalfW, C.baselineZ, C.laneHalfW, C.ftZ); seg(-C.laneHalfW, C.ftZ, C.laneHalfW, C.ftZ);
  for (const s of [-1, 1]) for (const d of [2.13, 3.05, 3.96]) seg(s * C.laneHalfW, C.baselineZ + d, s * (C.laneHalfW + 0.15), C.baselineZ + d);
  arc(0, C.ftZ, C.ftR, 0, 2 * Math.PI);
  const zc = Math.sqrt(C.threeR ** 2 - C.cornerX ** 2);
  seg(-C.cornerX, C.baselineZ, -C.cornerX, zc); seg(C.cornerX, C.baselineZ, C.cornerX, zc);
  const a0 = Math.atan2(zc, C.cornerX); arc(0, 0, C.threeR, a0, Math.PI - a0);
  arc(0, C.halfZ, 1.83, 0, 2 * Math.PI);
  const fz = 2 * C.halfZ;
  seg(-C.laneHalfW, fz - C.baselineZ, -C.laneHalfW, fz - C.ftZ); seg(C.laneHalfW, fz - C.baselineZ, C.laneHalfW, fz - C.ftZ); seg(-C.laneHalfW, fz - C.ftZ, C.laneHalfW, fz - C.ftZ);
  arc(0, fz - C.ftZ, C.ftR, Math.PI, 2 * Math.PI);
  arc(0, fz, C.threeR, Math.PI + a0, 2 * Math.PI - a0);
}

function paintLines(g, color, width, draw, seed) {
  const c = canvas(ATEX, ATEX), x = c.getContext('2d');
  x.strokeStyle = color; x.lineWidth = width * PX; x.lineCap = 'butt';
  draw(x);
  const R = rng(seed);
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 40000; i++) { x.fillStyle = `rgba(0,0,0,${0.35 + R() * 0.65})`; x.beginPath(); x.arc(R() * ATEX, R() * ATEX, 0.6 + R() * (R() < 0.08 ? 6 : 2), 0, 7); x.fill(); }
  x.globalCompositeOperation = 'source-over';
  g.drawImage(c, 0, 0);
}

// tiled close-up grain (the asphalt's stones under the paint), used at ~1.5 mm a pixel through a world-space lookup
function grainTextures() {
  const N = 512, c = canvas(N, N), g = c.getContext('2d'), R = rng(9);
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 2600; i++) {
    const x = R() * N, y = R() * N, r = 1.5 + R() * R() * 7, l = R() < 0.55 ? 80 + R() * 45 : 140 + R() * 60;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { g.fillStyle = `rgb(${l},${l},${l})`; g.beginPath(); g.ellipse(x + ox, y + oy, r, r * (0.6 + R() * 0.4), R() * 3, 0, 7); g.fill(); }
  }
  const img = g.getImageData(0, 0, N, N).data, h = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) h[i] = img[i * 4] / 255;
  const nc = canvas(N, N), ng = nc.getContext('2d'), out = ng.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const hx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], hy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    const nx = -hx * 2.0, ny = -hy * 2.0, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
    out.data[i] = (nx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (-ny / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  ng.putImageData(out, 0, 0);
  const grain = texOf(c, false); grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  return { grain, normal: texOf(nc, false, [ASIZE / 0.6, ASIZE / 0.6]) };
}

function courtMaterial(tex, grain, normal) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.86, metalness: 0, normalMap: normal, normalScale: new THREE.Vector2(0.45, 0.45), envMapIntensity: 0.8 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.grain = { value: grain };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D grain;\nvarying vec2 vWxz;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float gr = texture2D(grain, vWxz / 0.6).r * 0.6 + texture2D(grain, vWxz / 2.3 + 0.37).r * 0.4;
        diffuseColor.rgb *= 0.78 + 0.44 * gr;`);
  };
  return mat;
}

// ---------- the hoop: parks-department style ----------
function buildHoop(scene) {
  const C = COURT, g = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: 0xd8501f, roughness: 0.45, metalness: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x223026, roughness: 0.5, metalness: 0.55 });
  const rimPivot = new THREE.Group(); rimPivot.position.set(0, C.rimY, C.boardZ + 0.01); g.add(rimPivot);
  for (const [dy, r, t] of [[0, C.rimR + 0.009, 0.0105], [-0.04, C.rimR + 0.011, 0.008]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 12, 64), orange); ring.rotation.x = Math.PI / 2; ring.position.set(0, dy, -(C.boardZ + 0.01)); ring.castShadow = true; rimPivot.add(ring);
  }
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.17), orange); bracket.position.set(0, -0.035, 0.08); rimPivot.add(bracket);
  // white steel board: orange border and shooter's square, scuffed where the ball hits, a stencilled number
  const bw = 1.83, bh = 1.07, by = 2.9 + bh / 2;
  const tex = makeTextTexture(1024, 600, (x, w, h) => {
    const R = rng(29), s = w / bw;
    x.fillStyle = '#eceae4'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) { x.fillStyle = `rgba(90,90,90,${R() * 0.05})`; x.fillRect(R() * w, R() * h, 2 + R() * 3, 2 + R() * 3); }
    x.strokeStyle = '#d4521e'; x.lineWidth = 0.05 * s; x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, w - x.lineWidth, h - x.lineWidth);
    const iw = 0.61 * s, ih = 0.457 * s; x.strokeRect(w / 2 - iw / 2, h - (0.15 * s) - ih, iw, ih);
    for (let i = 0; i < 60; i++) { const cx = w / 2 + (R() - 0.5) * 0.9 * s, cy = h * 0.45 + (R() - 0.5) * 0.45 * s; x.fillStyle = `rgba(70,60,50,${0.04 + R() * 0.07})`; x.beginPath(); x.arc(cx, cy, 0.06 * s * (0.6 + R()), 0, 7); x.fill(); }
    for (let i = 0; i < 9; i++) { const rx = R() * w, gr = x.createLinearGradient(rx, 0, rx, h); gr.addColorStop(0, 'rgba(120,80,40,0.25)'); gr.addColorStop(1, 'rgba(120,80,40,0)'); x.fillStyle = gr; x.fillRect(rx, 0, 3 + R() * 3, h * (0.3 + R() * 0.5)); }
    x.fillStyle = 'rgba(40,40,40,0.55)'; x.font = '700 34px Arial'; x.fillText('B-07', 26, h - 24);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.035), [steel, steel, steel, steel, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.2 }), steel]);
  board.position.set(0, by, C.boardZ - 0.0175); board.castShadow = true; g.add(board);
  // straight square pole a metre behind the baseline, an arm out to a plate on the back of the board, a brace
  const pz = C.baselineZ - 0.95;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.65, 0.15), steel).translateY(3.65 / 2).translateZ(pz));
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, Math.abs(C.boardZ - pz)), steel); arm.position.set(0, 3.45, (C.boardZ + pz) / 2); g.add(arm);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.25), steel); brace.position.set(0, 2.95, pz + 0.5); brace.rotation.x = -0.62; g.add(brace);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), steel); plate.position.set(0, by, C.boardZ - 0.06); g.add(plate);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x8c8b87, roughness: 0.9 })).translateY(0.025).translateZ(pz));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
  return { board: g, rimPivot };
}

// ---------- chain-link ----------
function chainLinkTexture() {
  const N = 128, c = canvas(N, N), g = c.getContext('2d');
  g.clearRect(0, 0, N, N); g.strokeStyle = 'rgba(28,30,30,1)'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, N / 2); g.lineTo(N / 2, 0); g.lineTo(N, N / 2); g.lineTo(N / 2, N); g.closePath(); g.stroke();
  const t = texOf(c, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  return t;
}

function buildFence(scene) {
  const F = EL, link = chainLinkTexture();
  const mat = (len, H) => { const t = link.clone(); t.needsUpdate = true; t.repeat.set(len / 0.05, H / 0.05); return new THREE.MeshStandardMaterial({ map: t, color: 0x2a2c2c, roughness: 0.55, metalness: 0.45, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide, envMapIntensity: 0.6 }); };
  const steel = new THREE.MeshStandardMaterial({ color: 0x1d1f20, roughness: 0.5, metalness: 0.55 });
  // the baseline run is the tall one (balls stay off the street); the sides are lower
  const runs = [[-F.fenceX, F.fenceZ0, F.fenceX, F.fenceZ0, F.endH], [-F.fenceX, F.fenceZ0, -F.fenceX, F.fenceZ1, F.sideH], [F.fenceX, F.fenceZ0, F.fenceX, F.fenceZ1, F.sideH]];
  const geos = [];
  for (const [x0, z0, x1, z1, H] of runs) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 3.05), dx = (x1 - x0) / n, dz = (z1 - z0) / n, yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) {
      const seg = len / n, m = new THREE.Mesh(new THREE.PlaneGeometry(seg, H - 0.06), mat(seg, H));
      m.position.set(x0 + dx * (i + 0.5), (H - 0.06) / 2 + 0.03, z0 + dz * (i + 0.5)); m.rotation.y = yaw + Math.PI / 2; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    }
    for (let i = 0; i <= n; i++) { const p = new THREE.CylinderGeometry(0.045, 0.045, H + 0.08, 10); p.translate(x0 + dx * i, (H + 0.08) / 2, z0 + dz * i); geos.push(p); }
    for (const y of [H + 0.02, 0.06]) { const r = new THREE.CylinderGeometry(0.025, 0.025, len, 8); r.rotateX(Math.PI / 2); r.rotateY(yaw); r.translate((x0 + x1) / 2, y, (z0 + z1) / 2); geos.push(r); }
  }
  const posts = new THREE.Mesh(mergeGeometries(geos), steel); posts.castShadow = true; posts.receiveShadow = true; scene.add(posts);
  // benches along the sides, inside: green slats on iron legs (people sit on them)
  const slat = new THREE.MeshStandardMaterial({ color: 0x3a5a3f, roughness: 0.75 }), iron = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4 });
  const benches = [];
  for (const [x, z, yaw] of [[-10.3, 1.5, Math.PI / 2], [-10.3, 7.0, Math.PI / 2], [10.3, 3.0, -Math.PI / 2], [10.3, 9.5, -Math.PI / 2]]) {
    const b = new THREE.Group();
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.035, 0.1), slat); s.position.set(0, 0.45, -0.12 + i * 0.12); b.add(s); }
    for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.03), slat); s.position.set(0, 0.62 + i * 0.13, -0.21); s.rotation.x = -0.15; b.add(s); }
    for (const lx of [-0.95, 0.95]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.42), iron); l.position.set(lx, 0.225, 0); b.add(l); }
    b.position.set(x, 0, z); b.rotation.y = yaw; b.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(b);
    benches.push({ x, z, yaw });
  }
  return benches;
}

// ---------- the street, the el and the train ----------
// riveted plate: the girders' web with a row of rivets top and bottom and stiffeners every 1.5 m; weathered paint
function girderTexture() {
  return makeTextTexture(512, 256, (x, w, h) => {
    const R = rng(81);
    x.fillStyle = '#3d4a40'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { x.fillStyle = R() < 0.5 ? `rgba(20,25,22,${R() * 0.12})` : `rgba(150,140,120,${R() * 0.07})`; x.fillRect(R() * w, R() * h, 2 + R() * 6, 2 + R() * 6); }
    for (let i = 0; i < 18; i++) { const rx = R() * w, gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(110,70,40,0.35)'); gr.addColorStop(1, 'rgba(110,70,40,0)'); x.fillStyle = gr; x.fillRect(rx, 0, 2 + R() * 4, h * (0.4 + R() * 0.6)); }
    x.fillStyle = 'rgba(15,18,16,0.6)'; for (let k = 0; k < 4; k++) x.fillRect(k * w / 4, 0, 10, h);
    x.fillStyle = 'rgba(200,200,190,0.18)'; for (let k = 0; k < 4; k++) x.fillRect(k * w / 4 + 10, 0, 3, h);
    for (const y of [14, h - 14]) for (let xx = 6; xx < w; xx += 12) { x.fillStyle = 'rgba(20,24,20,0.7)'; x.beginPath(); x.arc(xx, y, 3, 0, 7); x.fill(); x.fillStyle = 'rgba(180,180,170,0.25)'; x.beginPath(); x.arc(xx - 1, y - 1, 1.5, 0, 7); x.fill(); }
  });
}

function trainTexture() {
  // one car's side: brushed stainless, a black window band, three door pairs, a thin coloured line, a number
  return makeTextTexture(2048, 512, (x, w, h) => {
    const R = rng(55);
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bfc4c8'); gr.addColorStop(0.5, '#d6dadc'); gr.addColorStop(1, '#9ea3a6'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    for (let xx = 0; xx < w; xx += 6) { x.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '60,64,68'},${0.04 + R() * 0.05})`; x.fillRect(xx, 0, 2, h); }
    for (let k = 0; k < 3; k++) {
      const dx = w * (0.16 + k * 0.34);
      x.fillStyle = '#8f9497'; x.fillRect(dx - 6, h * 0.12, 132, h * 0.82);
      x.fillStyle = '#1b2026'; x.fillRect(dx + 8, h * 0.18, 44, h * 0.34); x.fillRect(dx + 68, h * 0.18, 44, h * 0.34);
    }
    // windows between the doors: two panes each with a rubber surround, the sky and the far side's windows in them
    for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) {
      const wx = w * (0.02 + k * 0.34) + (k ? 150 : 40) + j * w * 0.105, ww = w * 0.09, wy = h * 0.2, wh = h * 0.28;
      if (wx + ww > w - 10) continue;
      x.fillStyle = '#2b3035'; x.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
      const gl = x.createLinearGradient(0, wy, 0, wy + wh); gl.addColorStop(0, '#9fb6c9'); gl.addColorStop(0.5, '#56626e'); gl.addColorStop(1, '#3a424a'); x.fillStyle = gl; x.fillRect(wx, wy, ww, wh);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + ww * 0.4, wy); x.lineTo(wx, wy + wh * 0.7); x.fill();
    }
    x.fillStyle = '#2f6db5'; x.fillRect(0, h * 0.6, w, 10);
    x.fillStyle = '#222'; x.font = '700 40px Arial'; x.fillText('7712', w * 0.92, h * 0.78);
  });
}

function buildEl(scene) {
  const F = EL, L = 220, x0 = -L / 2;
  const gt = girderTexture(); gt.wrapS = THREE.RepeatWrapping;
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x485a4c, roughness: 0.7, metalness: 0.35 });
  const geos = [];
  // columns every 12 m on both lines, with their flanges, under each a cross girder
  for (let x = x0; x <= -x0; x += 12) for (const z of [F.colA, F.colB]) {
    geos.push(box(0.42, F.deck - 1.6, 0.14, x, (F.deck - 1.6) / 2, z), box(0.14, F.deck - 1.6, 0.42, x, (F.deck - 1.6) / 2, z), box(0.7, 0.12, 0.7, x, 0.06, z));
    geos.push(box(0.6, 0.5, 0.6, x, F.deck - 1.85, z));
  }
  for (let x = x0; x <= -x0; x += 12) geos.push(box(0.5, 1.0, F.colA - F.colB + 0.6, x, F.deck - 1.0, (F.colA + F.colB) / 2));
  // ties and four rails for two tracks
  for (let x = x0; x <= -x0; x += 0.6) geos.push(box(0.24, 0.18, F.colA - F.colB + 0.4, x, F.deck + 0.09, (F.colA + F.colB) / 2));
  for (const z of [F.colA - 1.5 - 0.72, F.colA - 1.5 + 0.72, F.colB + 1.5 - 0.72, F.colB + 1.5 + 0.72]) geos.push(box(L, 0.15, 0.08, 0, F.deck + 0.25, z));
  // the walkway railing along the outer edges
  for (const z of [F.colA + 0.15, F.colB - 0.15]) { geos.push(box(L, 0.06, 0.06, 0, F.deck + 1.05, z)); for (let x = x0; x <= -x0; x += 1.5) geos.push(box(0.05, 1.0, 0.05, x, F.deck + 0.55, z)); }
  const steel = new THREE.Mesh(mergeGeometries(geos), steelMat); steel.receiveShadow = true; scene.add(steel);
  // the deep riveted plate girders along each column line
  for (const z of [F.colA, F.colB]) {
    const t = gt.clone(); t.needsUpdate = true; t.repeat.set(L / 6, 1);
    const g = new THREE.Mesh(new THREE.BoxGeometry(L, 1.6, 0.4), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, metalness: 0.3 }));
    g.position.set(0, F.deck - 0.8, z); g.receiveShadow = true; scene.add(g);
  }
  // the train: five cars on the near track
  const tt = trainTexture(), carMat = new THREE.MeshStandardMaterial({ map: tt, roughness: 0.35, metalness: 0.75, envMapIntensity: 1.1 });
  const plain = new THREE.MeshStandardMaterial({ color: 0xa9adb0, roughness: 0.4, metalness: 0.7 }), under = new THREE.MeshStandardMaterial({ color: 0x1c1d1e, roughness: 0.8 });
  const train = new THREE.Group(), tz = F.colA - 1.5;
  for (let k = 0; k < 5; k++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(15.2, 3.2, 3.0), [plain, plain, plain, under, carMat, carMat]);
    car.position.set(k * 15.6, F.deck + 0.55 + 1.6, 0); train.add(car);
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.5, 2.2), under); bogie.position.set(k * 15.6, F.deck + 0.55, 0); train.add(bogie);
  }
  train.position.set(-200, 0, tz); scene.add(train);
  return { train };
}

// the street under the el: asphalt with its lines, both kerbs and sidewalks, cars parked along the near kerb
function buildStreet(scene) {
  const F = EL;
  const road = makeTextTexture(2048, 512, (x, w, h) => {
    const R = rng(18);
    x.fillStyle = '#3e3f41'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40000; i++) { x.fillStyle = R() < 0.5 ? `rgba(20,20,22,${R() * 0.15})` : `rgba(140,140,140,${R() * 0.08})`; x.fillRect(R() * w, R() * h, 2, 2); }
    x.fillStyle = '#c9a53a'; x.fillRect(0, h * 0.49, w, 5); x.fillRect(0, h * 0.53, w, 5);
    x.fillStyle = 'rgba(230,230,225,0.8)'; for (let xx = 0; xx < w; xx += 160) { x.fillRect(xx, h * 0.27, 70, 4); x.fillRect(xx + 80, h * 0.76, 70, 4); }
    for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(15,15,16,${0.2 + R() * 0.3})`; x.beginPath(); x.ellipse(R() * w, R() * h, 20 + R() * 60, 6 + R() * 18, 0, 0, 7); x.fill(); }
  });
  road.wrapS = THREE.RepeatWrapping; road.repeat.set(6, 1);
  const rw = F.curb - F.farCurb, rm = new THREE.Mesh(new THREE.PlaneGeometry(400, rw), new THREE.MeshStandardMaterial({ map: road, roughness: 0.9 }));
  rm.rotation.x = -Math.PI / 2; rm.position.set(0, -0.12, (F.curb + F.farCurb) / 2); rm.receiveShadow = true; scene.add(rm);
  const walk = makeTextTexture(512, 512, (x, w, h) => {
    const R = rng(19); x.fillStyle = '#a8a59e'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 12000; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '60,60,58' : '220,218,212'},${R() * 0.1})`; x.fillRect(R() * w, R() * h, 2, 2); }
    x.strokeStyle = 'rgba(70,68,64,0.6)'; x.lineWidth = 3; for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(k * w / 4, 0); x.lineTo(k * w / 4, h); x.stroke(); x.beginPath(); x.moveTo(0, k * h / 4); x.lineTo(w, k * h / 4); x.stroke(); }
    for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(40,40,40,${0.15 + R() * 0.2})`; x.beginPath(); x.arc(R() * w, R() * h, 3 + R() * 8, 0, 7); x.fill(); }
  });
  walk.wrapS = walk.wrapT = THREE.RepeatWrapping;
  const sw = (z0, z1) => { const t = walk.clone(); t.needsUpdate = true; t.repeat.set(400 / 6, (z0 - z1) / 6); const m = new THREE.Mesh(new THREE.PlaneGeometry(400, z0 - z1), new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 })); m.rotation.x = -Math.PI / 2; m.position.set(0, -0.004, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); };
  sw(F.fenceZ0 - 0.02, F.curb); sw(F.farCurb, F.front - 0.05);
  // around the court (inside the park): the same concrete out to the side fences and past them
  const park = walk.clone(); park.needsUpdate = true; park.repeat.set(60 / 6, 50 / 6);
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(60, 50), new THREE.MeshStandardMaterial({ map: park, roughness: 0.92 })); pm.rotation.x = -Math.PI / 2; pm.position.set(0, -0.008, F.fenceZ0 + 25); pm.receiveShadow = true; scene.add(pm);
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x9c9a94, roughness: 0.85 });
  for (const z of [F.curb, F.farCurb]) { const k = new THREE.Mesh(new THREE.BoxGeometry(400, 0.14, 0.2), kerbMat); k.position.set(0, -0.07, z); k.receiveShadow = true; scene.add(k); }
  // parked cars: body, cabin, glass, wheels - simple, but the right sizes and paint
  const R = rng(66), cols = [0xf1f1ef, 0x16171a, 0x8c9196, 0x23324f, 0x7a1f22, 0xc9c6bd, 0x31463a];
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2228, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.2 }), tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  for (let x = -40 + R() * 4; x < 42; x += 5.4 + R() * 2.5) {
    // (between the el's columns, which stand in the parking lane every 12 m)
    const m = ((x + 110) % 12 + 12) % 12;
    if (R() < 0.25 || m < 3.0 || m > 9.0) continue;
    const car = new THREE.Group(), paint = new THREE.MeshStandardMaterial({ color: cols[Math.floor(R() * cols.length)], roughness: 0.3, metalness: 0.55, envMapIntensity: 1.0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.7, 1.8), paint); body.position.y = 0.62; car.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 1.62), glass); cab.position.set(-0.2, 1.24, 0); car.add(cab);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 1.58), paint); roof.position.set(-0.25, 1.53, 0); car.add(roof);
    for (const [wx, wz] of [[1.4, 0.82], [1.4, -0.82], [-1.4, 0.82], [-1.4, -0.82]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16), tyre); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.33, wz); car.add(w); }
    car.position.set(x, -0.12, F.curb - 1.25); car.rotation.y = (R() - 0.5) * 0.04; car.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } }); scene.add(car);
  }
}

// ---------- the walk-ups across the street ----------
// a facade for one building: five floors of windows in stone or brick, lintels and sills, a cornice, a shop below with
// its awning colour and a roll-down gate tagged up; fire-escape shadows striped down the middle bays when it has one
function facadeTexture(seed, style, fire) {
  const W = 512, H = 1024, c = canvas(W, H), g = c.getContext('2d'), R = rng(seed);
  const wall = { tan: '#b89a76', cream: '#cdbf9f', grey: '#9b9a95', brown: '#7d5a45' }[style];
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  if (style !== 'cream') for (let y = 0; y < H; y += 6) for (let x = (y / 6) % 2 ? -9 : 0; x < W; x += 18) { const v = (R() - 0.5) * 18; g.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v) / 255})`; g.fillRect(x, y, 17, 5); }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.05})`; g.fillRect(R() * W, R() * H, 3, 3); }
  // cornice
  g.fillStyle = 'rgba(40,36,30,0.35)'; g.fillRect(0, 0, W, 34); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 34, W, 6);
  const fh = (H - 230) / 5, bays = 4, bw = W / bays;
  for (let f = 0; f < 5; f++) for (let b = 0; b < bays; b++) {
    const x = b * bw + bw * 0.22, y = 60 + f * fh + fh * 0.18, w = bw * 0.56, h = fh * 0.6;
    g.fillStyle = 'rgba(60,50,40,0.45)'; g.fillRect(x - 6, y - 12, w + 12, 10); g.fillRect(x - 6, y + h, w + 12, 8);
    const gl = g.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, '#93a6ba'); gl.addColorStop(0.45, '#4a5562'); gl.addColorStop(1, '#2a3038'); g.fillStyle = gl; g.fillRect(x, y, w, h);
    if (R() < 0.4) { g.fillStyle = `rgba(${210 + R() * 40},${200 + R() * 40},${180 + R() * 40},0.9)`; g.fillRect(x, y, w, h * (0.2 + R() * 0.5)); }
    if (R() < 0.12) { g.fillStyle = '#d8d8d4'; g.fillRect(x + w * 0.1, y + h * 0.62, w * 0.8, h * 0.36); } // an air conditioner
    g.fillStyle = '#e6e2d8'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h / 2 - 2, w, 4);
  }
  // the shop: window, door, awning, a roll-down gate with tags
  const sy = H - 170;
  g.fillStyle = '#2a2d30'; g.fillRect(0, sy, W, 170);
  const aw = ['#2a5a3a', '#8a2a2a', '#1f3f7a', '#5b3b1d'][Math.floor(R() * 4)];
  g.fillStyle = aw; g.fillRect(14, sy + 6, W - 28, 34); for (let x = 14; x < W - 14; x += 26) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, sy + 6, 12, 34); }
  if (R() < 0.5) {
    g.fillStyle = '#7d8084'; g.fillRect(20, sy + 48, W - 40, 118); for (let y = sy + 50; y < sy + 166; y += 6) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(20, y, W - 40, 2); }
    const cols = ['#e8e8e8', '#d23a3a', '#2f6fd6', '#f2c230', '#141414'];
    for (let k = 0; k < 6; k++) { g.save(); g.translate(40 + R() * (W - 120), sy + 70 + R() * 70); g.rotate((R() - 0.5) * 0.3); g.strokeStyle = cols[Math.floor(R() * cols.length)]; g.lineWidth = 5 + R() * 5; g.lineCap = 'round'; g.beginPath(); for (let j = 0; j < 6; j++) g.lineTo(j * 18 + (R() - 0.5) * 10, (R() - 0.5) * 34); g.stroke(); g.restore(); }
  } else {
    g.fillStyle = '#495866'; g.fillRect(20, sy + 48, W - 120, 112); g.fillStyle = 'rgba(200,220,240,0.25)'; g.fillRect(20, sy + 48, W - 120, 24);
    g.fillStyle = '#3a2a1e'; g.fillRect(W - 92, sy + 48, 70, 118);
  }
  if (fire) { // the fire escape's shadow on the wall, down the middle two bays under each landing
    for (let f = 0; f < 5; f++) { const y = 60 + f * fh + fh * 0.98; g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(bw * 0.95, y, bw * 2.1, 18); for (let k = 0; k < 14; k++) g.fillRect(bw * 0.95 + k * bw * 0.15, y - fh * 0.32, 3, fh * 0.32); }
  }
  return texOf(c);
}

function fireEscape(x, z, w, floors, fh, y0) {
  // landings at each floor across the middle bays with railings, a ladder-stair between them
  const geos = [];
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * fh;
    geos.push(box(w, 0.05, 1.0, x, y, z + 0.5));
    geos.push(box(w, 0.04, 0.04, x, y + 0.95, z + 1.0), box(0.04, 0.95, 1.0, x - w / 2, y + 0.47, z + 0.5), box(0.04, 0.95, 1.0, x + w / 2, y + 0.47, z + 0.5));
    for (let k = 0; k <= w / 0.12; k++) geos.push(box(0.018, 0.95, 0.018, x - w / 2 + k * 0.12, y + 0.47, z + 1.0));
    if (f < floors - 1) { const s = box(0.65, 0.05, Math.hypot(fh, w * 0.55), 0, 0, 0); s.rotateX(Math.atan2(fh, w * 0.55)); s.rotateY(Math.PI / 2); s.translate(x + (f % 2 ? -0.1 : 0.1), y + fh / 2, z + 0.6); geos.push(s); }
  }
  return geos;
}

function buildTenements(scene) {
  const F = EL, R = rng(37), styles = ['tan', 'cream', 'grey', 'brown'], fe = [], mats = new Map(), byMat = new Map();
  for (let x = -56; x < 56;) {
    const w = 9 + R() * 4, floors = 5, fh = 3.25, h = 1.0 + floors * fh + 1.2 + 4.0, style = styles[Math.floor(R() * styles.length)], fire = R() < 0.6, d = 14;
    const key = `${style}:${fire}:${Math.floor(R() * 3)}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ map: facadeTexture(100 + mats.size, style, fire), vertexColors: true, fog: true }));
    const geo = new THREE.BoxGeometry(w, h, d); geo.translate(x + w / 2, h / 2, F.front - d / 2 - R() * 0.3);
    bake(geo, 1.0);
    // (only the street face carries the facade; the rest is its wall colour)
    if (!byMat.has(key)) byMat.set(key, []);
    byMat.get(key).push(geo);
    if (fire) fe.push(...fireEscape(x + w / 2, F.front, w * 0.48, floors, fh, 4.0 + 0.1));
    // a cornice and a roof parapet
    fe.push(box(w + 0.3, 0.45, 0.5, x + w / 2, h - 0.6, F.front + 0.1));
    x += w + 0.02;
  }
  for (const [key, geos] of byMat) {
    const g = mergeGeometries(geos), side = new THREE.MeshBasicMaterial({ color: 0x8f8574, vertexColors: true, fog: true });
    // box face order: +x, -x, +y, -y, +z, -z; the street face is +z
    g.clearGroups(); const per = 6, idx = g.index.count / geos.length;
    for (let i = 0; i < geos.length; i++) for (let f = 0; f < per; f++) g.addGroup(i * idx + f * idx / per, idx / per, f === 4 ? 0 : 1);
    scene.add(new THREE.Mesh(g, [mats.get(key), side]));
  }
  const iron = bake(mergeGeometries(fe), 0.8);
  scene.add(new THREE.Mesh(iron, new THREE.MeshBasicMaterial({ color: 0x2a2a2a, vertexColors: true, fog: true })));
}

// ---------- trees in leaf ----------
function leafTexture() {
  const N = 256, c = canvas(N, N), g = c.getContext('2d'), R = rng(21);
  g.clearRect(0, 0, N, N);
  g.strokeStyle = 'rgba(70,55,35,1)'; g.lineWidth = 3; g.beginPath(); g.moveTo(N * 0.5, N * 0.95); g.quadraticCurveTo(N * 0.45, N * 0.5, N * 0.55, N * 0.1); g.stroke();
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * N * 0.42, x = N / 2 + Math.cos(a) * d, y = N / 2 + Math.sin(a) * d * 0.95, s = 10 + R() * 12;
    const v = 70 + R() * 70; g.fillStyle = `rgb(${v * 0.55},${v},${v * 0.42})`;
    g.save(); g.translate(x, y); g.rotate(R() * 7); g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.8, -s * 0.2, 0, s); g.quadraticCurveTo(-s * 0.8, -s * 0.2, 0, -s); g.fill(); g.restore();
  }
  const t = texOf(c); t.anisotropy = 8;
  return t;
}

function leafyTree(R, x, z, h, cards, wood) {
  // trunk and limbs as tapered tubes; the crown as leaf cards scattered through an ellipsoid round the limbs
  const tube = (p, q, r0, r1) => { const d = q.clone().sub(p), L = d.length(), geo = new THREE.CylinderGeometry(r1, r0, L, 7, 1, true); geo.translate(0, L / 2, 0); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); geo.translate(p.x, p.y, p.z); wood.push(geo); };
  const base = V(x, 0, z), fork = V(x + (R() - 0.5) * 0.5, h * 0.38, z + (R() - 0.5) * 0.5); tube(base, fork, 0.24, 0.19);
  const cy = h * 0.66, rx = h * 0.34, ry = h * 0.3;
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + R(), q = V(x + Math.cos(a) * rx * 0.6, cy + (R() - 0.3) * ry * 0.6, z + Math.sin(a) * rx * 0.6); tube(fork, q, 0.15, 0.06); }
  for (let i = 0; i < 360; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, rr = Math.cbrt(0.35 + 0.65 * R());
    const n = V(Math.sqrt(1 - u * u) * Math.cos(a), u, Math.sqrt(1 - u * u) * Math.sin(a)), p = V(x + n.x * rx * rr, cy + n.y * ry * rr, z + n.z * rx * rr);
    const s = 1.1 + R() * 0.6, geo = new THREE.PlaneGeometry(s, s);
    geo.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6.3, R() * 6.3, R() * 6.3))); geo.translate(p.x, p.y, p.z);
    // normals point out of the crown (soft, volumetric shading) and the inside of the crown is darker
    const nn = []; for (let k = 0; k < 4; k++) nn.push(n.x, n.y, n.z); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
    const shade = 0.55 + 0.45 * rr, col = []; for (let k = 0; k < 4; k++) col.push(shade, shade, shade * 0.95); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    cards.push(geo);
  }
}

function buildTrees(scene) {
  const R = rng(73), cards = [], wood = [];
  for (const [x, z, h] of [[-13.6, -3.0, 12], [-13.8, 5.5, 13], [-13.5, 14, 11.5], [13.8, -1.5, 12.5], [13.6, 7.5, 13], [14.0, 16, 12], [-20, -6.5, 11], [21, -6.8, 12]]) leafyTree(R, x + (R() - 0.5) * 0.6, z + (R() - 0.5) * 0.6, h, cards, wood);
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 });
  // (both sides of a card keep the crown's outward normal, so the crown shades as one soft volume)
  leafMat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);'); };
  const leaves = new THREE.Mesh(mergeGeometries(cards), leafMat);
  leaves.castShadow = true; leaves.receiveShadow = true; scene.add(leaves);
  const trunks = new THREE.Mesh(mergeGeometries(wood), new THREE.MeshStandardMaterial({ color: 0x5b5246, roughness: 0.9 }));
  trunks.castShadow = true; trunks.receiveShadow = true; scene.add(trunks);
}

// ---------- the skyline past the walk-ups ----------
function towerFacade(seed, kind) {
  const W = 256, Hh = 512, c = canvas(W, Hh), g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = { stone: '#c4b49a', pale: '#d2ccc0', grey: '#9da1a4', glass: '#7f93a8', dark: '#4e5560' }[kind]; g.fillRect(0, 0, W, Hh);
  if (kind === 'glass' || kind === 'dark') {
    for (let y = 0; y < Hh; y += 16) for (let x = 0; x < W; x += 32) { const v = 140 + R() * 60; g.fillStyle = `rgba(${v - 25},${v - 5},${v + 20},0.7)`; g.fillRect(x, y, 32, 16); }
    g.fillStyle = 'rgba(60,66,74,0.55)'; for (let x = 0; x < W; x += 16) g.fillRect(x, 0, 1.5, Hh); for (let y = 0; y < Hh; y += 16) g.fillRect(0, y, W, 2.5);
  } else {
    for (let y = 6; y < Hh - 24; y += 24) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, y - 2, W, 2); for (let x = 4; x < W - 16; x += 16) { const v = 105 + R() * 45; g.fillStyle = `rgba(${v - 12},${v - 2},${v + 12},0.85)`; g.fillRect(x + 3, y + 5, 9, 13); } }
  }
  const t = texOf(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function buildSkyline(scene) {
  const R = rng(19), kinds = ['stone', 'pale', 'grey', 'glass', 'dark'], groups = Object.fromEntries(kinds.map(k => [k, []]));
  for (let i = 0; i < 110; i++) {
    const az = -Math.PI / 2 + (R() * 2 - 1) * (R() < 0.8 ? 1.2 : 3.0), r = 140 + R() * R() * 520, x = Math.cos(az) * r, z = Math.sin(az) * r;
    if (z > 40 && R() < 0.8) continue;
    const h = 30 + R() * R() * 170 + (R() < 0.1 ? 90 : 0), w = 16 + R() * 30, d = 16 + R() * 26, kind = kinds[Math.floor(R() * kinds.length)], yaw = R() * Math.PI;
    const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0); geo.rotateY(yaw); geo.translate(x, 0, z); geo.deleteAttribute('uv');
    const pos = geo.attributes.position, nrm = geo.attributes.normal, uv = [];
    for (let k = 0; k < pos.count; k++) uv.push((Math.abs(nrm.getX(k)) > 0.5 ? pos.getZ(k) : pos.getX(k)) / 12, pos.getY(k) / 24);
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); bake(geo, 0.9);
    groups[kind].push(geo);
  }
  for (const k of kinds) if (groups[k].length) scene.add(new THREE.Mesh(mergeGeometries(groups[k]), new THREE.MeshBasicMaterial({ map: towerFacade(41 + kinds.indexOf(k), k), vertexColors: true, fog: true })));
  // ground out to the horizon: the city's grey
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.24, 0.24, 0.24), fog: true }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2; scene.add(ground);
}

// ---------- sky ----------
// a summer afternoon: deep blue overhead, paler to the horizon, brighter toward the sun, a few soft clouds
export function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: SUN.clone() }, grey: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 sun; uniform float grey; varying vec3 vD;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vD); float h = max(d.y, 0.0), s = max(dot(d, sun), 0.0);
        vec3 zen = vec3(0.1, 0.25, 0.66), hor = vec3(0.6, 0.73, 0.9);
        vec3 c = mix(hor, zen, pow(h, 0.55));
        c += vec3(1.0, 0.9, 0.75) * (pow(s, 8.0) * 0.35 + pow(s, 400.0) * 6.0);
        // clouds on a plane overhead, thinning toward the horizon
        vec2 uv = d.xz / max(d.y, 0.06) * 0.6;
        float cl = smoothstep(0.52, 0.78, fbm(uv * 1.3 + vec2(3.1, 7.7))) * smoothstep(0.02, 0.2, d.y);
        c = mix(c, vec3(1.02, 1.0, 0.97) * (0.85 + 0.25 * s), cl * 0.75);
        c = mix(c, vec3(0.58, 0.6, 0.62), smoothstep(0.0, -0.08, d.y));
        c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), grey);
        gl_FragColor = vec4(c * 1.45, 1.0);
      }`,
  });
}

export function buildElCourt(renderer, scene) {
  scene.background = null;
  scene.fog = new THREE.FogExp2(HAZE, 0.0019);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMaterial()); sky.renderOrder = -1; sky.material.depthTest = false; scene.add(sky);
  const c = canvas(ATEX, ATEX), g = c.getContext('2d');
  paintCourt(g);
  paintLines(g, 'rgba(240,240,236,0.95)', 0.055, courtLines, 13);
  const tex = texOf(c); tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const { grain, normal } = grainTextures();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ASIZE, ASIZE), courtMaterial(tex, grain, normal));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, AZ0 + ASIZE / 2); floor.receiveShadow = true; scene.add(floor);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(2 * EL.fenceX + 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x5c5c5b, roughness: 0.9 }));
  far.rotation.x = -Math.PI / 2; far.position.set(0, -0.002, AZ0 + ASIZE + 6 - 0.02); far.receiveShadow = true; scene.add(far);
  const hoop = buildHoop(scene);
  // the chain net: galvanised steel links
  const net = new Net(scene); net.mat.color.set(0x9a9c9e); net.mat.metalness = 0.85; net.mat.roughness = 0.35;
  const benches = buildFence(scene);
  buildStreet(scene);
  const el = buildEl(scene);
  buildTenements(scene);
  buildTrees(scene);
  buildSkyline(scene);
  return { floor, net, hoop, sky, benches, train: el.train };
}

// Environment for the lighting: the same sky over a warm grey ground, the walk-ups and the el as dark masses
export function elEnvironment() {
  const env = new THREE.Scene();
  const sky = skyMaterial(); sky.uniforms.grey.value = 0.3;
  env.add(new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), sky));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(390, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.29, 0.27) }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.6; env.add(ground);
  const mass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.29, 0.25) });
  const b = new THREE.Mesh(new THREE.BoxGeometry(120, 20, 14), mass); b.position.set(0, 10, -29); env.add(b);
  const el = new THREE.Mesh(new THREE.BoxGeometry(200, 1.6, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.14, 0.12) })); el.position.set(0, 5.6, -12.3); env.add(el);
  return env;
}
