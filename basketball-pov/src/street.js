// v14 street court, after the user's own clip: an outdoor court in a city park at the end of an autumn afternoon.
// Blue-grey asphalt with worn white lines and a second set of light-blue ones, a black chain-link fence on posts, an
// outdoor hoop (painted steel board, orange rim, white net) on a gooseneck pole, a brick building with a mural, bare
// trees, a city skyline in the last of the sun and a clear sky. The court is in the shade of the buildings behind
// the camera (soft skylight, no hard sun), the tops of the towers still catch the low sun - as in the clip.
// Everything past the fence is lit once, here (baked into its colours), so only the court, the hoop, the fence and
// the people near it cost real-time lighting.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COURT, rng, makeTextTexture, Net } from './arena.js';

// the asphalt canvas covers x in [-AX, AX], z in [AZ0, AZ0 + 2 AX]
const AX = 14, AZ0 = -6, ASIZE = 28, ATEX = 4096, PX = ATEX / ASIZE;
const toPx = (x, z) => [(x + AX) * PX, (z - AZ0) * PX];
export const STREET = { fenceX: 11.2, fenceZ0: -5.4, fenceZ1: 31.5, fenceH: 3.7 };
// the low sun (from behind the court's far end, a little to the right of it): lights the skyline and the treetops
export const SUN = new THREE.Vector3(0.42, 0.11, 0.9).normalize();
const HAZE = new THREE.Color(0.78, 0.8, 0.84);

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const texOf = (c, srgb = true, rep = null) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
};

// ---------- asphalt ----------
function paintAsphalt(g) {
  const R = rng(41), W = ATEX;
  g.fillStyle = '#7e7d7b'; g.fillRect(0, 0, W, W);
  // sealcoat patches and repairs: big soft blotches a shade off the base
  g.save(); g.filter = 'blur(28px)';
  for (let i = 0; i < 70; i++) {
    const v = R(), c = v < 0.5 ? `rgba(96,98,102,${0.25 + R() * 0.3})` : `rgba(146,147,148,${0.12 + R() * 0.2})`;
    g.fillStyle = c; g.beginPath();
    const cx = R() * W, cy = R() * W, r = (0.6 + R() * 2.6) * PX;
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = r * (0.6 + R() * 0.6); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.fill();
  }
  g.restore();
  // fine mottling
  for (let i = 0; i < 260000; i++) {
    const x = R() * W, y = R() * W, l = R();
    g.fillStyle = l < 0.5 ? `rgba(40,44,50,${0.05 + R() * 0.1})` : `rgba(200,204,208,${0.04 + R() * 0.08})`;
    g.fillRect(x, y, 1 + R() * 2.5, 1 + R() * 2.5);
  }
  // cracks: wandering dark lines that branch, and a few sealed ones (wider, glossy-dark)
  const crack = (x, y, a, len, w, depth) => {
    g.strokeStyle = `rgba(34,36,40,${0.55 + R() * 0.3})`; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < len; s += 6) {
      a += (R() - 0.5) * 0.7; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y);
      if (depth < 2 && R() < 0.012) { g.stroke(); crack(x, y, a + (R() < 0.5 ? 1 : -1) * (0.6 + R()), len * 0.4, w * 0.7, depth + 1); g.beginPath(); g.moveTo(x, y); g.strokeStyle = `rgba(34,36,40,${0.55 + R() * 0.3})`; g.lineWidth = w; }
    }
    g.stroke();
  };
  for (let i = 0; i < 46; i++) crack(R() * W, R() * W, R() * Math.PI * 2, (1 + R() * 5) * PX, 1.2 + R() * 2.2, 0);
  for (let i = 0; i < 10; i++) { g.save(); g.globalAlpha = 0.5; crack(R() * W, R() * W, R() * Math.PI * 2, (2 + R() * 4) * PX, 9 + R() * 8, 2); g.restore(); }
  // gum and stains
  for (let i = 0; i < 900; i++) {
    const x = R() * W, y = R() * W, r = 2 + R() * 9;
    g.fillStyle = R() < 0.7 ? `rgba(40,42,46,${0.2 + R() * 0.3})` : `rgba(170,172,170,${0.25 + R() * 0.3})`;
    g.beginPath(); g.ellipse(x, y, r, r * (0.6 + R() * 0.4), R() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 26; i++) {
    const x = R() * W, y = R() * W, r = (0.2 + R() * 0.6) * PX, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(30,32,36,0.28)'); gr.addColorStop(1, 'rgba(30,32,36,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

// paint a line set; wear: the paint is chipped along its length and thinner where the play is
function paintLines(g, color, width, draw, seed, wearK = 1) {
  const c = canvas(ATEX, ATEX), x = c.getContext('2d');
  x.strokeStyle = color; x.lineWidth = width * PX; x.lineCap = 'butt';
  draw(x);
  // chip it: knock random flecks and runs out of the paint
  const R = rng(seed);
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 52000 * wearK; i++) {
    const px = R() * ATEX, py = R() * ATEX, r = 0.6 + R() * (R() < 0.08 ? 7 : 2.2);
    x.fillStyle = `rgba(0,0,0,${0.35 + R() * 0.65})`; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  // worn thin through the lane and at the top of the key, where the feet go
  for (const [zx, zz, rr, a] of [[0, 2.4, 2.6, 0.45], [0, 7.4, 2.2, 0.35], [-2.4, 1.0, 1.4, 0.3], [2.4, 1.0, 1.4, 0.3]]) {
    const [cx, cy] = toPx(zx, zz), gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr * PX);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(cx - rr * PX, cy - rr * PX, 2 * rr * PX, 2 * rr * PX);
  }
  x.globalCompositeOperation = 'source-over';
  g.drawImage(c, 0, 0);
}

function courtLines(x) {
  const C = COURT;
  const seg = (x0, z0, x1, z1) => { const a = toPx(x0, z0), b = toPx(x1, z1); x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); };
  const arc = (cx, cz, r, a0, a1) => { const c = toPx(cx, cz); x.beginPath(); x.arc(c[0], c[1], r * PX, a0, a1); x.stroke(); };
  // this end, the half-court line and the near part of the far end (the canvas stops at z = 22)
  seg(-C.sideX, C.baselineZ, C.sideX, C.baselineZ); seg(-C.sideX, C.baselineZ, -C.sideX, 22.5); seg(C.sideX, C.baselineZ, C.sideX, 22.5);
  seg(-C.sideX, C.halfZ, C.sideX, C.halfZ);
  seg(-C.laneHalfW, C.baselineZ, -C.laneHalfW, C.ftZ); seg(C.laneHalfW, C.baselineZ, C.laneHalfW, C.ftZ); seg(-C.laneHalfW, C.ftZ, C.laneHalfW, C.ftZ);
  for (const s of [-1, 1]) for (const d of [2.13, 3.05, 3.96]) seg(s * C.laneHalfW, C.baselineZ + d, s * (C.laneHalfW + 0.15), C.baselineZ + d);
  arc(0, C.ftZ, C.ftR, 0, Math.PI); arc(0, C.ftZ, C.ftR, Math.PI, 2 * Math.PI);
  const zc = Math.sqrt(C.threeR ** 2 - C.cornerX ** 2);
  seg(-C.cornerX, C.baselineZ, -C.cornerX, zc); seg(C.cornerX, C.baselineZ, C.cornerX, zc);
  const a0 = Math.atan2(zc, C.cornerX); arc(0, 0, C.threeR, a0, Math.PI - a0);
  arc(0, C.halfZ, 1.83, 0, 2 * Math.PI);
  // the far end's key, upside down, where the canvas reaches it
  const fz = 2 * C.halfZ;
  seg(-C.laneHalfW, fz - C.baselineZ, -C.laneHalfW, fz - C.ftZ); seg(C.laneHalfW, fz - C.baselineZ, C.laneHalfW, fz - C.ftZ); seg(-C.laneHalfW, fz - C.ftZ, C.laneHalfW, fz - C.ftZ);
  arc(0, fz - C.ftZ, C.ftR, Math.PI, 2 * Math.PI);
  arc(0, fz, C.threeR, Math.PI + a0, 2 * Math.PI - a0);
}

// the light-blue set: a smaller cross court (a kids' court across this half, older paint) - the crossing blue curves
function blueLines(x) {
  const seg = (x0, z0, x1, z1) => { const a = toPx(x0, z0), b = toPx(x1, z1); x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); };
  const arc = (cx, cz, r, a0, a1) => { const c = toPx(cx, cz); x.beginPath(); x.arc(c[0], c[1], r * PX, a0, a1); x.stroke(); };
  // its sidelines run across the court at z = 3.2 and z = 16.2, its ends near our sidelines
  seg(-10.6, 3.2, 10.6, 3.2); seg(-10.6, 16.2, 10.6, 16.2); seg(-10.6, 3.2, -10.6, 16.2); seg(10.6, 3.2, 10.6, 16.2); seg(0, 3.2, 0, 16.2);
  for (const s of [-1, 1]) {
    const bx = s * 10.6;
    seg(bx, 7.9, bx - s * 4.6, 7.9); seg(bx, 11.5, bx - s * 4.6, 11.5); seg(bx - s * 4.6, 7.9, bx - s * 4.6, 11.5);
    const c = toPx(bx - s * 4.6, 9.7); x.beginPath(); x.arc(c[0], c[1], 1.5 * PX, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : Math.PI / 2); x.stroke();
    const c2 = toPx(bx, 9.7); x.beginPath(); x.arc(c2[0], c2[1], 6.0 * PX, s > 0 ? Math.PI * 0.62 : -Math.PI * 0.38, s > 0 ? Math.PI * 1.38 : Math.PI * 0.38); x.stroke();
  }
  arc(0, 9.7, 1.5, 0, 2 * Math.PI);
}

function paintLeaves(g) {
  // dry leaves blown into the edges and the corners, a few out on the court
  const R = rng(77), cols = ['#8a5a2b', '#a8682c', '#6e4a28', '#b98a3e', '#5b4630', '#9c4f22'];
  const leaf = (x, y) => { const s = (0.035 + R() * 0.05) * PX; g.save(); g.translate(x, y); g.rotate(R() * 7); g.fillStyle = cols[Math.floor(R() * cols.length)];
    g.globalAlpha = 0.75 + R() * 0.25; g.beginPath(); g.ellipse(0, 0, s, s * (0.4 + R() * 0.3), 0, 0, 7); g.fill(); g.restore(); };
  for (let i = 0; i < 2600; i++) {
    const side = R();
    let x, z;
    if (side < 0.35) { x = (R() < 0.5 ? -1 : 1) * (STREET.fenceX - R() * R() * 2.2); z = AZ0 + R() * ASIZE; }
    else if (side < 0.6) { x = (R() * 2 - 1) * AX; z = STREET.fenceZ0 + R() * R() * 2.0; }
    else if (side < 0.8) { const cx = (R() < 0.5 ? -1 : 1) * (STREET.fenceX - 0.3), cz = STREET.fenceZ0 + 0.3; x = cx - Math.sign(cx) * R() * R() * 3; z = cz + R() * R() * 3; }
    else { x = (R() * 2 - 1) * AX; z = AZ0 + R() * ASIZE; if (R() < 0.7) continue; }
    leaf(...toPx(x, z));
  }
}

// tiled close-up grain for the asphalt (stones in the binder), used at ~1.5 mm a pixel through a world-space lookup
function grainTextures() {
  const N = 512, c = canvas(N, N), g = c.getContext('2d'), R = rng(9);
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, N, N);
  const h = new Float32Array(N * N);
  for (let i = 0; i < 2600; i++) {
    const x = R() * N, y = R() * N, r = 1.5 + R() * R() * 7, v = R();
    const l = v < 0.55 ? 70 + R() * 50 : 150 + R() * 70;
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { g.fillStyle = `rgb(${l},${l},${l + 4})`; g.beginPath(); g.ellipse(x + ox, y + oy, r, r * (0.6 + R() * 0.4), R() * 3, 0, 7); g.fill(); }
  }
  const img = g.getImageData(0, 0, N, N).data;
  for (let i = 0; i < N * N; i++) h[i] = img[i * 4] / 255;
  // normals from the stones' height
  const nc = canvas(N, N), ng = nc.getContext('2d'), out = ng.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const hx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], hy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    const nx = -hx * 2.2, ny = -hy * 2.2, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * N + x) * 4;
    out.data[i] = (nx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (-ny / l * 0.5 + 0.5) * 255; out.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  ng.putImageData(out, 0, 0);
  const grain = texOf(c, false); grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  return { grain, normal: texOf(nc, false, [ASIZE / 0.6, ASIZE / 0.6]) };
}

function asphaltMaterial(tex, grain, normal) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.93, metalness: 0, normalMap: normal, normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 0.9 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.grain = { value: grain };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWxz;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWxz = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D grain;\nvarying vec2 vWxz;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float gr = texture2D(grain, vWxz / 0.6).r * 0.6 + texture2D(grain, vWxz / 2.3 + 0.37).r * 0.4;
        diffuseColor.rgb *= 0.62 + 0.76 * gr;`);
  };
  return mat;
}

// ---------- the hoop ----------
function buildStreetHoop(scene) {
  const C = COURT, g = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: 0xd2471c, roughness: 0.5, metalness: 0.45 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.55, metalness: 0.5 });
  const rimPivot = new THREE.Group(); rimPivot.position.set(0, C.rimY, C.boardZ + 0.01); g.add(rimPivot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(C.rimR + 0.009, 0.0105, 12, 64), orange);
  rim.rotation.x = Math.PI / 2; rim.position.set(0, 0, -(C.boardZ + 0.01)); rim.castShadow = true; rimPivot.add(rim);
  // (outdoor rims carry a second, lower ring under the first, and a heavier bracket)
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(C.rimR + 0.012, 0.008, 10, 64), orange);
  rim2.rotation.x = Math.PI / 2; rim2.position.set(0, -0.035, -(C.boardZ + 0.01)); rimPivot.add(rim2);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.17), orange); bracket.position.set(0, -0.03, 0.08); rimPivot.add(bracket);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.2), orange); b.rotation.x = 0.5; b.position.set(s * 0.06, -0.06, 0.1); rimPivot.add(b); }
  // painted steel board, weathered: tan-orange with a white border and square, rust runs and scuffs from the ball
  const bw = 1.83, bh = 1.07, by = 2.9 + bh / 2;
  const boardTex = makeTextTexture(1024, 600, (x, w, h) => {
    const R = rng(23), s = w / bw;
    x.fillStyle = '#d58a4c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { x.fillStyle = R() < 0.5 ? `rgba(120,60,20,${R() * 0.08})` : `rgba(255,220,180,${R() * 0.07})`; x.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 4); }
    x.strokeStyle = '#f2efe8'; x.lineWidth = 0.05 * s; x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, w - x.lineWidth, h - x.lineWidth);
    const iw = 0.61 * s, ih = 0.457 * s; x.strokeRect(w / 2 - iw / 2, h - (0.15 * s) - ih, iw, ih);
    for (let i = 0; i < 14; i++) { const rx = R() * w, ry = R() * h * 0.6, gr = x.createLinearGradient(rx, ry, rx, ry + 120); gr.addColorStop(0, 'rgba(110,50,20,0.35)'); gr.addColorStop(1, 'rgba(110,50,20,0)'); x.fillStyle = gr; x.fillRect(rx, ry, 3 + R() * 4, 120 + R() * 100); }
    for (let i = 0; i < 40; i++) { const cx = w / 2 + (R() - 0.5) * 0.9 * s, cy = h * 0.42 + (R() - 0.5) * 0.4 * s; x.fillStyle = `rgba(60,40,30,${0.05 + R() * 0.08})`; x.beginPath(); x.arc(cx, cy, 0.06 * s * (0.6 + R()), 0, 7); x.fill(); }
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.03), [steel, steel, steel, steel, new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.62, metalness: 0.15 }), steel]);
  board.position.set(0, by, C.boardZ - 0.015); board.castShadow = true; g.add(board);
  const frame = [[bw + 0.05, 0.04, 0, bh / 2 + 0.01], [bw + 0.05, 0.04, 0, -bh / 2 - 0.01], [0.04, bh, bw / 2 + 0.01, 0], [0.04, bh, -bw / 2 - 0.01, 0]];
  for (const [w, h, x, y] of frame) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), steel); m.position.set(x, by + y, C.boardZ - 0.03); g.add(m); }
  // gooseneck: a round pole half a metre behind the baseline curving up and over to the back of the board
  const pz = C.baselineZ - 0.55;
  const curve = new THREE.CatmullRomCurve3([V(0, 0, pz), V(0, 2.6, pz), V(0, 3.45, pz + 0.18), V(0, 3.75, pz + 0.65), V(0, 3.72, C.boardZ - 0.55), V(0, 3.62, C.boardZ - 0.12)]);
  const pole = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.075, 16, false), steel); pole.castShadow = true; g.add(pole);
  const strut = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 2.25, pz + 0.04), V(0, 2.7, (pz + C.boardZ) / 2), V(0, 3.0, C.boardZ - 0.12)]), 24, 0.035, 10, false), steel); g.add(strut);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), steel); plate.position.set(0, by, C.boardZ - 0.08); g.add(plate);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 20), new THREE.MeshStandardMaterial({ color: 0x8c8d8c, roughness: 0.9 })); foot.position.set(0, 0.03, pz); g.add(foot);
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  scene.add(g);
  return { board: g, rimPivot };
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- chain-link fence ----------
function chainLinkTexture() {
  // one 5 cm diamond per 128 px tile (its corners on the tile's edge midpoints, so tiles join into the lattice), wire
  // ~5 mm with its vinyl coat; the alpha mip-maps turn it into the grey haze it is at distance
  const N = 128, c = canvas(N, N), g = c.getContext('2d');
  g.clearRect(0, 0, N, N); g.strokeStyle = 'rgba(30,32,34,1)'; g.lineWidth = 11; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, N / 2); g.lineTo(N / 2, 0); g.lineTo(N, N / 2); g.lineTo(N / 2, N); g.closePath(); g.stroke();
  const t = texOf(c, true); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  return t;
}

function buildFence(scene) {
  const F = STREET, H = F.fenceH, R = rng(5);
  const link = chainLinkTexture();
  const meshMat = (len) => { const t = link.clone(); t.needsUpdate = true; t.repeat.set(len / 0.05, H / 0.05); return new THREE.MeshStandardMaterial({ map: t, color: 0x2a2c2f, roughness: 0.6, metalness: 0.4, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide, envMapIntensity: 0.6 }); };
  const post = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.5, metalness: 0.55 });
  const runs = [[-F.fenceX, F.fenceZ0, F.fenceX, F.fenceZ0], [-F.fenceX, F.fenceZ0, -F.fenceX, F.fenceZ1], [F.fenceX, F.fenceZ0, F.fenceX, F.fenceZ1]];
  const postGeos = [], railGeos = [];
  for (const [x0, z0, x1, z1] of runs) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 3.05), dx = (x1 - x0) / n, dz = (z1 - z0) / n, yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) {
      const cx = x0 + dx * (i + 0.5), cz = z0 + dz * (i + 0.5), seg = len / n;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(seg, H - 0.06), meshMat(seg)); m.position.set(cx, (H - 0.06) / 2 + 0.03, cz); m.rotation.y = yaw + Math.PI / 2; m.castShadow = true; m.receiveShadow = true; scene.add(m);
    }
    for (let i = 0; i <= n; i++) { const p = new THREE.CylinderGeometry(0.045, 0.045, H + 0.08, 10); p.translate(x0 + dx * i, (H + 0.08) / 2, z0 + dz * i); postGeos.push(p); }
    for (const y of [H + 0.02, 0.06]) { const r = new THREE.CylinderGeometry(0.025, 0.025, len, 8); r.rotateX(Math.PI / 2); r.rotateY(yaw); r.translate((x0 + x1) / 2, y, (z0 + z1) / 2); railGeos.push(r); }
  }
  const posts = new THREE.Mesh(mergeGeometries([...postGeos, ...railGeos]), post); posts.castShadow = true; posts.receiveShadow = true; scene.add(posts);
  // black windscreens on the sections either side of the hoop, part-way up (sprayed over, as in the clip)
  const screenTex = makeTextTexture(1024, 256, (x, w, h) => {
    x.fillStyle = '#121416'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(255,255,255,${R() * 0.035})`; x.fillRect(R() * w, R() * h, 2, 2); }
    const cols = ['#3d7bd8', '#d8d4cc', '#c04a3a', '#e0b23c', '#5fb7d6'];
    for (let k = 0; k < 7; k++) {
      x.save(); x.translate(80 + k * 140 + R() * 40, 120 + R() * 50); x.rotate((R() - 0.5) * 0.3);
      x.strokeStyle = cols[Math.floor(R() * cols.length)]; x.globalAlpha = 0.55 + R() * 0.3; x.lineWidth = 6 + R() * 6; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); for (let j = 0; j < 7; j++) x.lineTo((R() - 0.5) * 110, (R() - 0.5) * 120); x.stroke(); x.restore();
    }
  });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 1.9), new THREE.MeshStandardMaterial({ map: screenTex, roughness: 0.9, transparent: true, opacity: 0.93, side: THREE.DoubleSide }));
    m.position.set(s * 6.2, 0.95 + 0.1, F.fenceZ0 - 0.04); scene.add(m);
  }
}

// ---------- past the fence (lit once, here) ----------
// facade textures: windows in a grid on a wall colour; glass towers get a bluish curtain wall with mullions
function facade(seed, kind) {
  const W = 256, Hh = 512, c = canvas(W, Hh), g = c.getContext('2d'), R = rng(seed);
  const walls = { stone: '#c2b29a', pale: '#cfc8bb', brick: '#93604c', grey: '#9a9da0', glass: '#7d8fa2' };
  g.fillStyle = walls[kind]; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.04})`; g.fillRect(R() * W, R() * Hh, 3, 3); }
  if (kind === 'glass') {
    // curtain wall: panes of sky reflection, darker where the glass is tinted, thin mullions
    for (let y = 0; y < Hh; y += 16) for (let x = 0; x < W; x += 32) { const v = 150 + R() * 50; g.fillStyle = `rgba(${v - 20},${v - 5},${v + 15},0.75)`; g.fillRect(x, y, 32, 16); }
    g.fillStyle = 'rgba(70,78,88,0.55)'; for (let x = 0; x < W; x += 16) g.fillRect(x, 0, 1.5, Hh); for (let y = 0; y < Hh; y += 16) g.fillRect(0, y, W, 2.5);
  } else {
    // punched windows in rows, glass a blue-grey a shade off the wall (sky in it), the odd lit one, floor bands
    const cw = kind === 'brick' ? 21 : 16, ch = 24, glass = () => { const v = 105 + R() * 45; return `rgba(${v - 12},${v - 2},${v + 12},0.85)`; };
    for (let y = 6; y < Hh - ch; y += ch) {
      g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, y - 2, W, 2);
      for (let x = 4; x < W - cw; x += cw) { g.fillStyle = R() < 0.03 ? 'rgba(220,190,140,0.7)' : glass(); g.fillRect(x + 3, y + 5, cw - 7, ch - 11); }
    }
  }
  const t = texOf(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// a box building with baked light: faces toward the sun warm and bright, the others in cool skylight; the windows
// tile at real size; vertex colours carry the light so one material serves every building of a kind
function bakedBox(w, h, d, x, z, yaw, light) {
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(0, h / 2, 0); geo.rotateY(yaw); geo.translate(x, 0, z);
  geo.deleteAttribute('uv');
  const pos = geo.attributes.position, nrm = geo.attributes.normal, col = [], uv = [];
  for (let i = 0; i < pos.count; i++) {
    const n = V(nrm.getX(i), nrm.getY(i), nrm.getZ(i)), y = pos.getY(i);
    const c = light(n, y, h);
    col.push(c.r, c.g, c.b);
    // world-size uv: 1 tile = 12 m across, 24 m up (the texture is 256 x 512)
    const along = Math.abs(n.x) > 0.5 ? pos.getZ(i) : pos.getX(i);
    uv.push(along / 12, y / 24);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}
const sunLight = (warm = 1) => (n, y, h) => {
  const s = Math.max(0, n.dot(SUN)), top = n.y > 0.5 ? 0.85 : 0;
  // the towers' lower floors are in the shade of the city; the light catches them from about 30 m up
  const lit = (s + top * 0.4) * THREE.MathUtils.smoothstep(y, 18, 40);
  const c = new THREE.Color(0.32, 0.36, 0.44).multiplyScalar(0.95 + 0.25 * Math.max(0, n.y));
  return c.add(new THREE.Color(1.0, 0.68, 0.42).multiplyScalar(1.15 * lit * warm));
};

function buildSkyline(scene) {
  const R = rng(17), kinds = ['stone', 'pale', 'brick', 'grey', 'glass'], groups = Object.fromEntries(kinds.map(k => [k, []]));
  // a ring of towers 160-650 m out, densest behind the hoop end, thinner to the sides and behind the camera
  for (let i = 0; i < 120; i++) {
    const az = -Math.PI / 2 + (R() * 2 - 1) * (R() < 0.75 ? 1.3 : 3.1), r = 160 + R() * R() * 500;
    const x = Math.cos(az) * r, z = Math.sin(az) * r;
    if (z > 60 && R() < 0.75) continue;
    const h = 22 + R() * R() * 150 + (R() < 0.12 ? 80 : 0), w = 14 + R() * 30, d = 14 + R() * 26, kind = kinds[Math.floor(R() * kinds.length)];
    groups[kind].push(bakedBox(w, h, d, x, z, R() * Math.PI, sunLight()));
    if (h > 90 && R() < 0.5) groups[kind].push(bakedBox(w * 0.6, h * 0.18, d * 0.6, x, z, R() * 0.2, (n, y) => sunLight()(n, y + h, h)).translate(0, h, 0));
  }
  for (const k of kinds) if (groups[k].length) {
    const m = new THREE.Mesh(mergeGeometries(groups[k]), new THREE.MeshBasicMaterial({ map: facade(31 + kinds.indexOf(k), k), vertexColors: true, fog: true }));
    scene.add(m);
  }
}

// the brick building behind the hoop end: six floors, white-framed windows, a mural down at the bottom
function buildBrick(scene) {
  const W = 30, H = 21, D = 16, x0 = -10, z0 = -27, MX = -9 - (x0 - W / 2);
  const c = canvas(2048, 1434), g = c.getContext('2d'), R = rng(63), ppm = c.width / W;
  // running bond, 21.5 x 7.5 cm courses, each brick its own shade of red-brown
  g.fillStyle = '#7b5546'; g.fillRect(0, 0, c.width, c.height);
  const bw = 0.215 * ppm, bh = 0.075 * ppm;
  for (let r = 0, y = 0; y < c.height; r++, y += bh) for (let x = -(r % 2) * bw / 2; x < c.width; x += bw) {
    const v = R(), tone = [[150, 74, 52], [138, 66, 48], [160, 84, 60], [124, 60, 46], [170, 96, 70]][Math.floor(v * 5)];
    g.fillStyle = `rgb(${tone[0] + (R() - 0.5) * 14},${tone[1] + (R() - 0.5) * 10},${tone[2] + (R() - 0.5) * 10})`; g.fillRect(x + 1, y + 1, bw - 1.5, bh - 1.5);
  }
  // soot and water stains down from the sills and the roof line
  for (let i = 0; i < 40; i++) { const x = R() * c.width, gr = g.createLinearGradient(0, 0, 0, c.height * 0.5); gr.addColorStop(0, 'rgba(30,25,22,0.25)'); gr.addColorStop(1, 'rgba(30,25,22,0)'); g.fillStyle = gr; g.fillRect(x, 0, 6 + R() * 40, c.height * (0.2 + R() * 0.4)); }
  // windows: 6 floors x 11 bays, white frames, dark glass with a bit of sky in it, some blinds down
  for (let f = 0; f < 6; f++) for (let b = 0; b < 11; b++) {
    if (f === 0 && Math.abs(1.2 + b * 2.62 + 0.58 - MX) < 4.6) continue;
    const wx = (1.2 + b * 2.62) * ppm, wy = c.height - (1.3 + f * 3.3 + 1.7) * ppm, ww = 1.15 * ppm, wh = 1.7 * ppm;
    g.fillStyle = '#e8e4da'; g.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
    const gr = g.createLinearGradient(0, wy, 0, wy + wh); gr.addColorStop(0, '#8ea4bc'); gr.addColorStop(0.5, '#3c4652'); gr.addColorStop(1, '#262c34'); g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
    if (R() < 0.35) { g.fillStyle = `rgba(${200 + R() * 40},${190 + R() * 40},${170 + R() * 40},0.92)`; g.fillRect(wx, wy, ww, wh * (0.2 + R() * 0.6)); }
    g.fillStyle = '#e8e4da'; g.fillRect(wx + ww / 2 - 3, wy, 6, wh); g.fillRect(wx, wy + wh * 0.5 - 3, ww, 6);
    g.fillStyle = '#b8b2a6'; g.fillRect(wx - 14, wy + wh + 6, ww + 28, 12);
  }
  // the mural on the ground floor's blank wall: a big blue figure in a burst of colour, outlined, tagged around
  g.save(); g.translate(MX * ppm, c.height - 2.2 * ppm); g.scale(0.74, 0.74);
  const blob = (cx, cy, r, col, n = 10, k = 0.35) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = r * (1 + (R() - 0.5) * k); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); g.lineWidth = 7; g.strokeStyle = '#151820'; g.stroke(); };
  blob(0, -20, 2.6 * ppm, '#2d6fd2', 14, 0.25);
  blob(-1.6 * ppm, -1.9 * ppm, 1.0 * ppm, '#7cc4ec'); blob(1.7 * ppm, -1.6 * ppm, 0.9 * ppm, '#f0c43c'); blob(-0.2 * ppm, -2.7 * ppm, 0.85 * ppm, '#e8edf2');
  blob(0.4 * ppm, 0.3 * ppm, 1.2 * ppm, '#1d4fa8'); blob(-1.0 * ppm, 1.2 * ppm, 0.6 * ppm, '#d8483a'); blob(1.4 * ppm, 1.0 * ppm, 0.7 * ppm, '#69c7a6');
  g.fillStyle = '#151820'; for (const [ex, ey] of [[-0.5, -2.8], [0.2, -2.75]]) { g.beginPath(); g.arc(ex * ppm, ey * ppm, 0.13 * ppm, 0, 7); g.fill(); }
  g.fillStyle = '#ffffff'; for (const [ex, ey] of [[-0.46, -2.84], [0.24, -2.79]]) { g.beginPath(); g.arc(ex * ppm, ey * ppm, 0.05 * ppm, 0, 7); g.fill(); }
  g.restore();
  for (let i = 0; i < 22; i++) { g.save(); g.translate((1 + R() * 14) * ppm, c.height - (0.4 + R() * 1.2) * ppm); g.rotate((R() - 0.5) * 0.4); g.strokeStyle = ['#e8e8e8', '#202020', '#3c7ad8', '#d04040'][Math.floor(R() * 4)]; g.lineWidth = 3 + R() * 4; g.globalAlpha = 0.6; g.beginPath(); for (let j = 0; j < 6; j++) g.lineTo(j * 14 + (R() - 0.5) * 8, (R() - 0.5) * 30); g.stroke(); g.restore(); }
  const tex = texOf(c);
  const geo = new THREE.BoxGeometry(W, H, D); geo.translate(x0, H / 2, z0 - D / 2);
  // baked: shaded but for the top two floors, which catch the low sun coming over the court
  const pos = geo.attributes.position, nrm = geo.attributes.normal, col = [];
  for (let i = 0; i < pos.count; i++) {
    const n = V(nrm.getX(i), nrm.getY(i), nrm.getZ(i)), y = pos.getY(i), s = Math.max(0, n.dot(SUN));
    const lit = THREE.MathUtils.smoothstep(y, 13.5, 15.5) * s;
    const cc = new THREE.Color(0.5, 0.52, 0.58).add(new THREE.Color(1.05, 0.7, 0.45).multiplyScalar(lit * 1.2));
    col.push(cc.r, cc.g, cc.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // (only the face toward the court gets the painted facade; the rest is plain brick)
  const front = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, fog: true }), plain = new THREE.MeshBasicMaterial({ color: 0x8a5a48, vertexColors: true, fog: true });
  const m = new THREE.Mesh(geo, [plain, plain, plain, plain, front, plain]); scene.add(m);
  // a lower neighbour to its right and a cornice line
  const n2 = new THREE.Mesh(bakedBox(14, 13, 14, x0 + 22, z0 - 10, 0, sunLight(0.6)), new THREE.MeshBasicMaterial({ map: facade(5, 'pale'), vertexColors: true, fog: true })); scene.add(n2);
  const corn = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.5, 0.6), new THREE.MeshBasicMaterial({ color: 0xb59e8a, fog: true })); corn.position.set(x0, H - 0.25, z0 + 0.1); scene.add(corn);
}

// bare trees: a trunk splitting into limbs and on down to fine twigs; the big wood as tapered tubes, the twigs as
// lines (a mass of hair-thin twigs is what a bare crown is, at this distance)
function bareTree(seed, x, z, h) {
  const R = rng(seed), tubes = [], twigs = [];
  const grow = (p, dir, len, r, depth) => {
    const end = p.clone().addScaledVector(dir, len);
    if (r > 0.012) {
      const geo = new THREE.CylinderGeometry(r * 0.7, r, len, depth < 2 ? 8 : 5, 1, true);
      geo.translate(0, len / 2, 0); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir)); geo.translate(p.x, p.y, p.z);
      tubes.push(geo);
    } else twigs.push(p.x, p.y, p.z, end.x, end.y, end.z);
    if (depth > 7 || len < 0.12) return;
    const n = depth < 1 ? 3 : 2 + (R() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(V((R() - 0.5) * 1.3, (R() - 0.2) * 0.8, (R() - 0.5) * 1.3)).normalize();
      if (d.y < 0.05) d.y = 0.05 + R() * 0.2;
      grow(end, d.normalize(), len * (0.68 + R() * 0.14), r * 0.62, depth + 1);
    }
  };
  grow(V(x, 0, z), V((R() - 0.5) * 0.15, 1, (R() - 0.5) * 0.15).normalize(), h * 0.32, 0.22 + R() * 0.08, 0);
  const geo = mergeGeometries(tubes), pos = geo.attributes.position, col = [];
  // baked: dark bark, the crown's top warming where the sun reaches it
  for (let i = 0; i < pos.count; i++) { const k = THREE.MathUtils.smoothstep(pos.getY(i), h * 0.55, h); col.push(0.11 + 0.2 * k, 0.1 + 0.12 * k, 0.09 + 0.06 * k); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const tw = new THREE.BufferGeometry(); tw.setAttribute('position', new THREE.Float32BufferAttribute(twigs, 3));
  const tcol = []; for (let i = 0; i < twigs.length; i += 3) { const k = THREE.MathUtils.smoothstep(twigs[i + 1], h * 0.55, h); tcol.push(0.16 + 0.22 * k, 0.14 + 0.13 * k, 0.12 + 0.07 * k); }
  tw.setAttribute('color', new THREE.Float32BufferAttribute(tcol, 3));
  return { wood: geo, twigs: tw };
}

function buildTrees(scene) {
  const R = rng(91), woods = [], twigs = [];
  // a row of big bare plane trees just past the fence, behind the hoop end and down the sides
  const spots = [[-9, -9.5, 15], [-2.5, -10.5, 13], [5, -9.0, 16], [12.5, -8.5, 14], [-15.5, -3, 13], [16, 1, 15], [-16, 8, 14], [16.5, 11, 12], [-16, 19, 15], [17, 22, 14]];
  spots.forEach(([x, z, h], i) => { const t = bareTree(100 + i, x + (R() - 0.5), z + (R() - 0.5), h); woods.push(t.wood); twigs.push(t.twigs); });
  scene.add(new THREE.Mesh(mergeGeometries(woods), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
  scene.add(new THREE.LineSegments(mergeGeometries(twigs), new THREE.LineBasicMaterial({ vertexColors: true, fog: true, transparent: true, opacity: 0.85 })));
  // a second row of bare trees further back, and far off the park's evergreens and the last autumn leaves: small
  // lumpy clusters, shaded below, warm where the sun is on them
  const woods2 = [], twigs2 = [];
  for (let i = 0; i < 16; i++) {
    const az = -Math.PI / 2 + (R() * 2 - 1) * 1.25, r = 24 + R() * 22, x = Math.cos(az) * r, z = Math.sin(az) * r;
    if (z > -6 && Math.abs(x) < 16) continue;
    const t = bareTree(300 + i, x, z, 11 + R() * 7); woods2.push(t.wood); twigs2.push(t.twigs);
  }
  if (woods2.length) { scene.add(new THREE.Mesh(mergeGeometries(woods2), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
    scene.add(new THREE.LineSegments(mergeGeometries(twigs2), new THREE.LineBasicMaterial({ vertexColors: true, fog: true, transparent: true, opacity: 0.7 }))); }
  const crowns = [];
  for (let i = 0; i < 90; i++) {
    const az = -Math.PI / 2 + (R() * 2 - 1) * 1.5, r = 70 + R() * 150, x = Math.cos(az) * r, z = Math.sin(az) * r;
    const autumn = R() < 0.3, base = autumn ? new THREE.Color(0.3, 0.2, 0.1) : new THREE.Color(0.1, 0.13, 0.09), h = 5 + R() * 6;
    for (let j = 0; j < 6; j++) {
      const s = (1.4 + R() * 1.6) * h / 8, geo = new THREE.IcosahedronGeometry(s, 1), pos = geo.attributes.position, col = [];
      const ox = (R() - 0.5) * h * 0.5, oy = h * (0.55 + R() * 0.35), oz = (R() - 0.5) * h * 0.5;
      for (let k = 0; k < pos.count; k++) {
        const p = V(pos.getX(k), pos.getY(k), pos.getZ(k)), n = p.clone().normalize();
        const lit = Math.max(0, n.dot(SUN)) * THREE.MathUtils.smoothstep(oy + p.y, h * 0.5, h);
        const c = base.clone().multiplyScalar(0.6 + 0.35 * n.y).add(new THREE.Color(0.5, 0.34, 0.18).multiplyScalar(lit * 0.45));
        col.push(c.r, c.g, c.b);
      }
      geo.translate(x + ox, oy, z + oz); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.deleteAttribute('uv'); geo.deleteAttribute('normal');
      crowns.push(geo);
    }
  }
  scene.add(new THREE.Mesh(mergeGeometries(crowns), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));
}

// park lights, a bench or two, and the sidewalk/grass outside the fence
function buildPark(scene) {
  const dark = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.5, metalness: 0.5 });
  const geos = [];
  for (const [x, z] of [[-12.4, -3], [12.4, 6], [-12.4, 15], [12.4, 24]]) {
    const p = new THREE.CylinderGeometry(0.07, 0.1, 9, 10); p.translate(x, 4.5, z); geos.push(p);
    const arm = new THREE.BoxGeometry(1.2, 0.12, 0.3); arm.translate(x + Math.sign(-x) * 0.5, 9, z); geos.push(arm);
  }
  scene.add(new THREE.Mesh(mergeGeometries(geos), dark));
  // benches along the side fences, inside: green slats on iron legs
  const slat = new THREE.MeshStandardMaterial({ color: 0x2f4a36, roughness: 0.75 }), iron = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4 });
  for (const [x, z, yaw] of [[-10.4, 3.5, Math.PI / 2], [10.4, 2.0, -Math.PI / 2], [-10.4, 9.5, Math.PI / 2]]) {
    const b = new THREE.Group();
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.1), slat); s.position.set(0, 0.45, -0.12 + i * 0.12); b.add(s); }
    for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.03), slat); s.position.set(0, 0.62 + i * 0.13, -0.2); s.rotation.x = -0.15; b.add(s); }
    for (const lx of [-0.75, 0.75]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.4), iron); l.position.set(lx, 0.225, 0); b.add(l); }
    b.position.set(x, 0, z); b.rotation.y = yaw; b.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(b);
  }
  // the ground outside: a concrete walk round the fence, then grass and leaf litter out to the trees and streets
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(36, 50), new THREE.MeshStandardMaterial({ color: 0x8a8984, roughness: 0.95 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, -0.006, 12); walk.receiveShadow = true; scene.add(walk);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.15, 0.1), fog: true }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.03; scene.add(grass);
  // the street behind the brick block's corner, with its kerb
  const road = new THREE.Mesh(new THREE.PlaneGeometry(900, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.17, 0.17, 0.18), fog: true }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, -0.02, -16); scene.add(road);
}

// ---------- sky ----------
// clear late-afternoon sky: deep blue overhead, pale toward the horizon, warm toward the sun and a faint pink band
// opposite it; linear values (the frame is graded and tone mapped at the end)
export function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: SUN.clone() }, grey: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 sun; uniform float grey; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD); float h = max(d.y, 0.0), s = max(dot(d, sun), 0.0), a = max(dot(d, -sun), 0.0);
        vec3 zen = vec3(0.13, 0.27, 0.62), hor = vec3(0.72, 0.8, 0.9);
        vec3 c = mix(hor, zen, pow(h, 0.5));
        c += vec3(1.0, 0.62, 0.32) * (pow(s, 6.0) * 0.55 + pow(s, 60.0) * 1.2) * (1.0 - 0.7 * h);
        c += vec3(0.45, 0.25, 0.3) * pow(a, 3.0) * exp(-h * 9.0) * 0.35;
        c = mix(c, vec3(0.6, 0.62, 0.66), smoothstep(0.0, -0.08, d.y));
        c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), grey);
        gl_FragColor = vec4(c * 1.35, 1.0);
      }`,
  });
}

export function buildStreet(renderer, scene) {
  scene.background = null;
  scene.fog = new THREE.FogExp2(HAZE, 0.0021);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), skyMaterial()); sky.renderOrder = -1; scene.add(sky);
  const c = canvas(ATEX, ATEX), g = c.getContext('2d');
  paintAsphalt(g);
  paintLines(g, 'rgba(176,214,236,0.82)', 0.06, blueLines, 12, 1.6);
  paintLines(g, 'rgba(236,236,230,0.94)', 0.055, courtLines, 13, 1.0);
  paintLeaves(g);
  const tex = texOf(c); tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const { grain, normal } = grainTextures();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ASIZE, ASIZE), asphaltMaterial(tex, grain, normal));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, AZ0 + ASIZE / 2); floor.receiveShadow = true; scene.add(floor);
  // plain asphalt out to the fence where the canvas stops (the far end, behind the camera)
  const far = new THREE.Mesh(new THREE.PlaneGeometry(2 * STREET.fenceX + 0.4, 12), new THREE.MeshStandardMaterial({ color: 0x6e7072, roughness: 0.93 }));
  far.rotation.x = -Math.PI / 2; far.position.set(0, -0.002, AZ0 + ASIZE + 6 - 0.02); far.receiveShadow = true; scene.add(far);
  const hoop = buildStreetHoop(scene);
  const net = new Net(scene);
  buildFence(scene);
  buildPark(scene);
  buildTrees(scene);
  buildBrick(scene);
  buildSkyline(scene);
  return { floor, net, hoop, sky };
}

// Environment for the lighting: the same sky over a grey ground, the brick block and the towers as dark masses
export function streetEnvironment() {
  const env = new THREE.Scene();
  // (its sky a little greyer than the one in the picture - the haze over the city - so the court and the people on
  // it aren't washed blue)
  const sky = skyMaterial(); sky.uniforms.grey = { value: 0.4 };
  env.add(new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), sky));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(390, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.21, 0.22) }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.6; env.add(ground);
  const mass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.17, 0.15) });
  const b = new THREE.Mesh(new THREE.BoxGeometry(30, 21, 16), mass); b.position.set(-15, 10.5, -35); env.add(b);
  const R = rng(3);
  for (let i = 0; i < 40; i++) { const az = R() * Math.PI * 2, r = 120 + R() * 150, h = 20 + R() * 80; const m = new THREE.Mesh(new THREE.BoxGeometry(25, h, 25), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.32, 0.36) })); m.position.set(Math.cos(az) * r, h / 2, Math.sin(az) * r); env.add(m); }
  return env;
}
