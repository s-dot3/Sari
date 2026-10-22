'use strict';
/* =========================================================
   Voice Unmasked — 9:16 motion piece, deterministic per frame
   ========================================================= */
const NS = 'http://www.w3.org/2000/svg';
const FPS = TL.fps, NF = TL.frames;
const root = document.getElementById('root');
function el(tag, a, p) { const e = document.createElementNS(NS, tag); if (a) for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
function set(e, a) { for (const k in a) e.setAttribute(k, a[k]); }
const r1 = v => Math.round(v * 10) / 10;
const r3 = v => Math.round(v * 1000) / 1000;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const eOut = t => 1 - Math.pow(1 - clamp(t), 3);
const eIn = t => Math.pow(clamp(t), 3);
const eIO = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const back = (t, s = 1.7) => { t = clamp(t); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
const elastic = t => { t = clamp(t); return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1; };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const noise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
const win = (t, t0, a, t1 = 1e9, d = .25) => Math.min(eOut(inv(t0, t0 + a, t)), 1 - eIO(inv(t1, t1 + d, t)));
const bump = (t, t0, a, d) => t < t0 ? 0 : t < t0 + a ? eOut((t - t0) / a) : 1 - eIO((t - t0 - a) / d);
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function WD(ci, w, n = 0) { let k = 0; for (const x of TL.clips[ci - 1].words) if (norm(x.w) === norm(w)) { if (k++ === n) return x; } throw new Error(`missing word ${ci}:${w}:${n}`); }
const envAt = fr => TL.mouth[clamp(Math.round(fr), 0, TL.mouth.length - 1)] || 0;
const talkOpen = (fr, g = 1) => clamp((envAt(fr) - .06) * .95 * g, 0, .95);

/* ---------------- defs ---------------- */
const defs = el('defs', null, root);
const U = { gradientUnits: 'userSpaceOnUse' };
function grad(kind, id, stops, a = {}) {
  const g = el(kind === 'r' ? 'radialGradient' : 'linearGradient', Object.assign({ id }, a), defs);
  g.stops = stops.map(s => el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] ?? 1 }, g));
  return g;
}
function filt(id, build, a = {}) { const f = el('filter', Object.assign({ id, x: '-60%', y: '-60%', width: '220%', height: '220%' }, a), defs); build(f); return f; }
for (const sd of [2, 3, 4, 6, 8, 12, 18, 26, 40]) filt('b' + sd, f => el('feGaussianBlur', { stdDeviation: sd }, f));
for (const sd of [5, 10, 18]) filt('gl' + sd, f => { el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: sd, result: 'b' }, f); const m = el('feMerge', null, f); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m); });
filt('tsh', f => el('feDropShadow', { dx: 0, dy: 5, stdDeviation: 7, 'flood-color': '#000', 'flood-opacity': .8 }, f), { x: '-15%', y: '-40%', width: '130%', height: '180%' });
filt('gray', f => el('feColorMatrix', { type: 'saturate', values: .1 }, f), { x: '-5%', y: '-5%', width: '110%', height: '110%' });
filt('xline', f => {
  el('feMorphology', { in: 'SourceAlpha', operator: 'dilate', radius: 3.5, result: 'd' }, f);
  el('feComposite', { in: 'd', in2: 'SourceAlpha', operator: 'out', result: 'o' }, f);
  el('feFlood', { 'flood-color': '#7febff' }, f);
  el('feComposite', { in2: 'o', operator: 'in', result: 'c' }, f);
  el('feGaussianBlur', { in: 'c', stdDeviation: 7, result: 'g' }, f);
  const m = el('feMerge', null, f); el('feMergeNode', { in: 'g' }, m); el('feMergeNode', { in: 'c' }, m);
});

// character
grad('r', 'gHead', [[0, '#ab6f45'], [.45, '#87532f'], [.82, '#663a21'], [1, '#56301c']], { ...U, cx: -60, cy: -70, r: 330, fx: -80, fy: -110 });
grad('l', 'gHeadRim', [[0, '#9cc3ff', 0], [.74, '#9cc3ff', 0], [1, '#b2d1ff', .55]], { ...U, x1: 40, y1: 0, x2: 178, y2: 30 });
grad('l', 'gJaw', [[0, '#2a1409', 0], [1, '#2a1409', .5]], { ...U, x1: 0, y1: 110, x2: 0, y2: 216 });
grad('r', 'gEar', [[0, '#93593a'], [1, '#5a321d']], { cx: .45, cy: .45, r: .6 });
grad('r', 'gEarIn', [[0, '#3a1f11'], [1, '#6b3f26']], { cx: .5, cy: .5, r: .6 });
grad('l', 'gNeck', [[0, '#331b0f'], [.5, '#5b331f'], [1, '#6f4127']], { ...U, x1: 0, y1: 140, x2: 0, y2: 280 });
grad('r', 'gEyeW', [[0, '#ffffff'], [.65, '#f2eae2'], [1, '#d3c3b5']], { cx: .45, cy: .4, r: .62 });
grad('r', 'gIris', [[0, '#a06a38'], [.55, '#5f381a'], [1, '#2a170a']], { cx: .5, cy: .65, r: .6 });
grad('l', 'gLid', [[0, '#55301c'], [1, '#7a482b']], { x1: 0, y1: 0, x2: 0, y2: 1 });
grad('r', 'gNose', [[0, '#a96d44'], [.7, '#7e492b'], [1, '#683b22']], { cx: .42, cy: .3, r: .7 });
grad('r', 'gAla', [[0, '#8c5433'], [1, '#5e3520']], { cx: .4, cy: .35, r: .7 });
grad('l', 'gLipU', [[0, '#3d2117'], [1, '#55301f']], { x1: 0, y1: 0, x2: 0, y2: 1 });
grad('l', 'gLipL', [[0, '#6c3b2b'], [.6, '#5e3223'], [1, '#4a2619']], { x1: 0, y1: 0, x2: 0, y2: 1 });
grad('r', 'gCheek', [[0, '#c47f53', .36], [1, '#c47f53', 0]], { cx: .5, cy: .5, r: .5 });
grad('r', 'gDurag', [[0, '#50505e'], [.33, '#24242c'], [.75, '#111115'], [1, '#09090b']], { ...U, cx: -70, cy: -200, r: 320, fx: -90, fy: -215 });
grad('r', 'gTee', [[0, '#ffffff'], [.5, '#eef0f4'], [1, '#c3c8d2']], { ...U, cx: -140, cy: 330, r: 800 });
grad('l', 'gTeeShade', [[0, '#3c465a', 0], [.5, '#3c465a', .04], [1, '#3c465a', .3]], { ...U, x1: 0, y1: 0, x2: 380, y2: 0 });
grad('l', 'gTeeRim', [[0, '#a9ccff', 0], [.82, '#a9ccff', 0], [1, '#bcd8ff', .55]], { ...U, x1: 200, y1: 0, x2: 380, y2: 0 });
grad('l', 'gArmL', [[0, '#8f5a37'], [1, '#6a3d23']], { x1: 0, y1: 0, x2: 1, y2: 0 });
grad('l', 'gArmR', [[0, '#5c341e'], [1, '#7a4a2c']], { x1: 0, y1: 0, x2: 1, y2: 0 });
grad('r', 'gFaceGlow', [[0, '#ffe3a1', .9], [.55, '#ffb347', .4], [1, '#ffb347', 0]], { ...U, cx: 0, cy: 10, r: 250 });
grad('r', 'gFist', [[0, '#a2683f'], [1, '#6b3c22']], { cx: .4, cy: .35, r: .7 });
grad('r', 'gFinger', [[0, '#ad6f45'], [1, '#6c3e23']], { cx: .38, cy: .36, r: .7 });
// scene art
grad('r', 'gBg', [[0, '#2c3244'], [.42, '#171a24'], [1, '#07080b']], { ...U, cx: 540, cy: 880, r: 1050 });
grad('r', 'gVig', [[0, '#000', 0], [.6, '#000', 0], [1, '#000', .65]], { ...U, cx: 540, cy: 960, r: 1150 });
const gTint = grad('r', 'gTint', [[0, '#3d5a8a', .7], [1, '#3d5a8a', 0]], { ...U, cx: 540, cy: 900, r: 1100 });
grad('l', 'gGlass', [[0, '#202a3e'], [.5, '#111622'], [1, '#1a2133']], { x1: 0, y1: 0, x2: 1, y2: 1 });
grad('l', 'gGold', [[0, '#fff0c0'], [.25, '#c8963e'], [.5, '#ffe9a8'], [.75, '#9c7027'], [1, '#e9c46a']], { x1: 0, y1: 0, x2: 1, y2: 1 });
grad('r', 'gHalo', [[0, '#ffe2a0', .75], [.45, '#ffb347', .28], [1, '#ffb347', 0]], { cx: .5, cy: .5, r: .5 });
grad('r', 'gMaskShade', [[0, '#ffffff', .22], [.5, '#000', 0], [1, '#000', .55]], { ...U, cx: -60, cy: -50, r: 320 });
grad('l', 'gMaskNose', [[0, '#a3a6ac'], [1, '#6a6d73']], { x1: 0, y1: 0, x2: 1, y2: 0 });
grad('l', 'gMeter', [[0, '#c27cff'], [.5, '#3be3ff'], [1, '#3b6fff']], { x1: 0, y1: 0, x2: 0, y2: 1 });
grad('l', 'gRainbow', [[0, '#ff4d6d'], [.33, '#ffd43b'], [.66, '#3be3ff'], [1, '#b56cff']], { ...U, x1: 316, y1: 0, x2: 920, y2: 0 });
grad('l', 'gGoldTeal', [[0, '#ffd43b'], [1, '#5ef0c8']], { ...U, x1: 316, y1: 0, x2: 920, y2: 0 });
grad('l', 'gBarGold', [[0, '#fff3b0'], [1, '#ffaa1c']], { x1: 0, y1: 0, x2: 0, y2: 1 });
grad('r', 'gOrb', [[0, '#ffffff'], [.35, '#fff1b0'], [.7, '#ffcc4d', .55], [1, '#ffaa00', 0]], { cx: .5, cy: .5, r: .5 });

/* ---------------- layers ---------------- */
const bg = el('g', null, root);
el('rect', { width: 1080, height: 1920, fill: '#07080b' }, bg);
el('rect', { width: 1080, height: 1920, fill: 'url(#gBg)' }, bg);
const bgTint = el('rect', { width: 1080, height: 1920, fill: 'url(#gTint)', opacity: 0 }, bg);
const motes = [...Array(24)].map((_, i) => ({ e: el('circle', { r: r1(2 + hash(i) * 6), fill: '#d5defc', opacity: 0, filter: i % 3 ? null : 'url(#b3)' }, bg), x: hash(i * 3.1) * 1080, y: hash(i * 7.7) * 1920, sp: 8 + hash(i * 5.3) * 22, ph: hash(i * 9.1) * 6.28, op: .04 + hash(i * 2.2) * .11 }));
const stage = el('g', null, root);
el('rect', { width: 1080, height: 1920, fill: 'url(#gVig)' }, root);
const ui = el('g', null, root);
const flashR = el('rect', { width: 1080, height: 1920, fill: '#fff4d6', opacity: 0 }, root);

/* ---------------- character ---------------- */
const HEAD = 'M0,-218 C100,-218 172,-152 174,-46 C176,30 166,96 136,146 C108,190 62,214 0,214 C-62,214 -108,190 -136,146 C-166,96 -176,30 -174,-46 C-172,-152 -100,-218 0,-218 Z';
const NECK = 'M -60,140 C -60,190 -64,232 -72,264 Q 0,294 72,264 C 64,232 60,190 60,140 Z';
const TORSO = 'M -72,258 Q 0,292 72,258 C 142,266 228,286 288,320 C 336,348 354,406 362,474 L 376,548 C 342,558 302,564 272,564 L 272,1180 L -272,1180 L -272,564 C -302,564 -342,558 -376,548 L -362,474 C -354,406 -336,348 -288,320 C -228,286 -142,266 -72,258 Z';
const ARM_L = 'M -378,540 C -388,690 -386,900 -374,1180 L -262,1180 C -264,900 -266,730 -270,560 Z';
const ARM_R = 'M 378,540 C 388,690 386,900 374,1180 L 262,1180 C 264,900 266,730 270,560 Z';
const DURAG = 'M -184,-70 C -190,-178 -104,-244 0,-246 C 104,-244 190,-178 184,-70 C 152,-100 82,-128 0,-131 C -82,-128 -152,-100 -184,-70 Z';
const DURAG_EDGE = 'M -184,-70 C -152,-100 -82,-128 0,-131 C 82,-128 152,-100 184,-70';
const TWISTS = [[150, -98, 200, 30, 19], [166, -68, 214, 86, 19], [160, -38, 206, 130, 18], [140, -8, 190, 168, 18], [118, 22, 166, 206, 17], [94, 44, 136, 238, 17], [70, 70, 104, 254, 16]];
let UID = 0;

function makeEye(p, cx, cy, id, side) {
  const E = { cx, cy };
  const g = el('g', null, p);
  el('ellipse', { cx, cy: cy + 3, rx: 50, ry: 56, fill: '#3a1f12', opacity: .38, filter: 'url(#b4)' }, g);
  const cid = `ec${id}${side}`; const cp = el('clipPath', { id: cid }, defs); el('ellipse', { cx, cy, rx: 40, ry: 47 }, cp);
  el('ellipse', { cx, cy, rx: 40, ry: 47, fill: 'url(#gEyeW)' }, g);
  const inner = el('g', { 'clip-path': `url(#${cid})` }, g);
  E.iris = el('g', null, inner);
  el('circle', { r: 29, fill: 'url(#gIris)' }, E.iris);
  el('circle', { r: 28, fill: 'none', stroke: '#180c04', 'stroke-width': 3, opacity: .7 }, E.iris);
  el('circle', { r: 14.5, fill: '#070302' }, E.iris);
  el('circle', { cx: -9, cy: -11, r: 7.5, fill: '#fff', opacity: .96 }, E.iris);
  el('circle', { cx: 9, cy: 8, r: 3.2, fill: '#fff', opacity: .8 }, E.iris);
  E.lidSh = el('path', { fill: '#2b160b', opacity: .38, filter: 'url(#b4)' }, inner);
  E.lidU = el('path', { fill: 'url(#gLid)' }, inner);
  E.lidL = el('path', { fill: '#74442a' }, inner);
  E.crease = el('path', { fill: 'none', stroke: '#3a1f12', 'stroke-width': 3, opacity: .45, 'stroke-linecap': 'round' }, g);
  E.lash = el('path', { fill: 'none', stroke: '#100804', 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
  return E;
}
function updEye(E, open, lx, ly, squint) {
  const { cx, cy } = E, ey = cy + 2;
  const C = cy + 26 - 116 * open;
  set(E.iris, { transform: `translate(${r1(cx + lx)},${r1(cy + 4 + ly)})` });
  set(E.lidU, { d: `M ${cx - 46},${ey} Q ${cx},${r1(C)} ${cx + 46},${ey} L ${cx + 46},${cy - 70} L ${cx - 46},${cy - 70} Z` });
  set(E.lidSh, { d: `M ${cx - 46},${ey + 7} Q ${cx},${r1(C + 16)} ${cx + 46},${ey + 7} L ${cx + 46},${cy - 70} L ${cx - 46},${cy - 70} Z` });
  const Lc = cy + 98 - 92 * squint;
  set(E.lidL, { d: `M ${cx - 46},${ey} Q ${cx},${r1(Lc)} ${cx + 46},${ey} L ${cx + 46},${cy + 70} L ${cx - 46},${cy + 70} Z` });
  set(E.lash, { d: `M ${cx - 45},${ey} Q ${cx},${r1(C)} ${cx + 45},${ey}` });
  set(E.crease, { d: `M ${cx - 35},${cy - 30} Q ${cx},${r1(cy + 8 - 92 * Math.min(open, 1.05))} ${cx + 37},${cy - 32}` });
}
function browPath(s, raise, tilt) {
  const iy = -80 - raise * 14 + tilt * 11, py = -100 - raise * 15 + tilt * 2, oy = -84 - raise * 12 - tilt * 5;
  return `M ${s * 26},${r1(iy)} Q ${s * 66},${r1(py)} ${s * 108},${r1(oy)}`;
}
function makeMouth(p, id) {
  const M = {};
  M.g = el('g', { transform: 'translate(0,128)' }, p);
  M.sh = el('path', { fill: '#2e160b', opacity: .32, filter: 'url(#b4)' }, M.g);
  const cid = 'mc' + id; const cp = el('clipPath', { id: cid }, defs); M.clip = el('path', null, cp);
  M.cav = el('path', { fill: '#290b09' }, M.g);
  const inner = el('g', { 'clip-path': `url(#${cid})` }, M.g);
  M.tongue = el('ellipse', { fill: '#a3404f' }, inner);
  M.teeth = el('rect', { fill: '#f4eee6', rx: 6 }, inner);
  M.teethLo = el('rect', { fill: '#e6ddd2', rx: 6 }, inner);
  M.gU = el('path', { fill: '#4a2a1e', opacity: 0 }, M.g);
  M.gL = el('path', { fill: '#6a3a2a', opacity: 0 }, M.g);
  M.upper = el('path', { fill: 'url(#gLipU)' }, M.g);
  M.lower = el('path', { fill: 'url(#gLipL)' }, M.g);
  M.hl = el('ellipse', { fill: '#fff', opacity: .16, filter: 'url(#b2)' }, M.g);
  M.line = el('path', { fill: 'none', stroke: '#21100a', 'stroke-width': 3.4, 'stroke-linecap': 'round' }, M.g);
  M.cL = el('path', { fill: 'none', stroke: '#3a1d10', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, M.g);
  M.cR = el('path', { fill: 'none', stroke: '#3a1d10', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, M.g);
  return M;
}
function mouthGeom(m, du = 0, dl = 0) {
  const pk = m.pucker || 0, op = clamp(m.open || 0, 0, 1.2);
  const w = 50 * (m.wide ?? 1) * (1 - .4 * pk);
  const sm = m.smile || 0, sk = m.smirk || 0;
  const yL = -sm * 11 - sk * 2, yR = -sm * 11 - sk * 14;
  const top = -1 - op * 15 + du, bot = 1 + op * 44 + dl;
  const ut = 13 + pk * 8, lt = 19 + pk * 8, k1 = .55, k2 = .6;
  const P = (x, y) => `${r1(x)},${r1(y)}`;
  const upEdge = `C ${P(-w * k1, top + yL * .3)} ${P(w * k1, top + yR * .3)} ${P(w, yR)}`;
  const cav = `M ${P(-w, yL)} ${upEdge} C ${P(w * k2, bot + yR * .2)} ${P(-w * k2, bot + yL * .2)} ${P(-w, yL)} Z`;
  const upper = `M ${P(-w - 5, yL + 1)} C ${P(-w * .62, top - ut + yL * .35)} ${P(-13, top - ut - 2)} ${P(0, top - ut + 4)} C ${P(13, top - ut - 2)} ${P(w * .62, top - ut + yR * .35)} ${P(w + 5, yR + 1)} C ${P(w * k1, top + yR * .3)} ${P(-w * k1, top + yL * .3)} ${P(-w - 5, yL + 1)} Z`;
  const lower = `M ${P(w + 4, yR + 1)} C ${P(w * k2, bot + yR * .2)} ${P(-w * k2, bot + yL * .2)} ${P(-w - 4, yL + 1)} C ${P(-w * .6, bot + lt + yL * .1)} ${P(w * .6, bot + lt + yR * .1)} ${P(w + 4, yR + 1)} Z`;
  const line = `M ${P(-w, yL)} ${upEdge}`;
  return { cav, upper, lower, line, w, top, bot, yL, yR, op, lt };
}
function updMouth(M, m, fr) {
  let du = 0, dl = 0; const tr = m.trill || 0;
  if (tr > 0) { const ph = (fr % 2 ? 1 : -1) * (.6 + .4 * hash(fr * 1.7)); du = -ph * 5 * tr; dl = ph * 7 * tr; }
  const G = mouthGeom(m, du, dl);
  set(M.cav, { d: G.cav }); set(M.clip, { d: G.cav });
  set(M.upper, { d: G.upper }); set(M.lower, { d: G.lower });
  set(M.line, { d: G.line, opacity: r3(clamp(1 - G.op * 4)) });
  set(M.sh, { d: G.lower, transform: 'translate(0,7)' });
  const show = clamp((G.op - .06) * 5) * (1 - (m.pucker || 0));
  set(M.teeth, { x: r1(-G.w * .78), y: r1(G.top - 4), width: r1(G.w * 1.56), height: r1(6 + G.op * 13), opacity: r3(show) });
  set(M.teethLo, { x: r1(-G.w * .6), y: r1(G.bot - 7 - G.op * 5), width: r1(G.w * 1.2), height: 14, opacity: r3(show * clamp((G.op - .5) * 3)) });
  set(M.tongue, { cx: 0, cy: r1(G.bot - 2), rx: r1(G.w * .55), ry: r1(4 + G.op * 13), opacity: r3(clamp(G.op * 3)) });
  set(M.hl, { cx: 0, cy: r1(G.bot + G.lt * .45), rx: r1(G.w * .32), ry: 4 });
  const co = r3(.55 * clamp(Math.abs(m.smile || 0) * 1.2 + Math.abs(m.smirk || 0) * .6));
  set(M.cL, { d: `M ${r1(-G.w - 2)},${r1(G.yL - 8)} Q ${r1(-G.w - 10)},${r1(G.yL)} ${r1(-G.w - 2)},${r1(G.yL + 7)}`, opacity: co });
  set(M.cR, { d: `M ${r1(G.w + 2)},${r1(G.yR - 8)} Q ${r1(G.w + 10)},${r1(G.yR)} ${r1(G.w + 2)},${r1(G.yR + 7)}`, opacity: co });
  if (tr > 0) { const G2 = mouthGeom(m, -du * 1.2, -dl * 1.2); set(M.gU, { d: G2.upper, opacity: r3(.4 * tr) }); set(M.gL, { d: G2.lower, opacity: r3(.4 * tr) }); }
  else { set(M.gU, { opacity: 0 }); set(M.gL, { opacity: 0 }); }
}
function makeLimb(p) {
  return {
    up: el('path', { fill: 'none', stroke: '#6c3f25', 'stroke-width': 82, 'stroke-linecap': 'round' }, p),
    fore: el('path', { fill: 'none', stroke: '#7c4a2c', 'stroke-width': 72, 'stroke-linecap': 'round' }, p),
    hl: el('path', { fill: 'none', stroke: '#a0663e', 'stroke-width': 20, 'stroke-linecap': 'round', opacity: .5, filter: 'url(#b4)' }, p),
    sleeve: el('path', { fill: 'none', stroke: 'url(#gTee)', 'stroke-width': 104, 'stroke-linecap': 'round' }, p),
    sleeveSh: el('path', { fill: 'none', stroke: '#9ea6b4', 'stroke-width': 26, 'stroke-linecap': 'round', opacity: .55, filter: 'url(#b6)' }, p),
    hem: el('path', { fill: 'none', stroke: '#b9bfca', 'stroke-width': 6, 'stroke-linecap': 'round' }, p),
  };
}
function updLimb(L, S, E, W) {
  const mx = lerp(S[0], E[0], .55), my = lerp(S[1], E[1], .55);
  const P = (a) => `${r1(a[0])},${r1(a[1])}`;
  set(L.sleeve, { d: `M ${P(S)} L ${P([mx, my])}` });
  set(L.sleeveSh, { d: `M ${P([S[0] + 22, S[1] + 12])} L ${P([mx + 22, my])}` });
  set(L.up, { d: `M ${P([mx, my])} L ${P(E)}` });
  set(L.fore, { d: `M ${P(E)} L ${P(W)}` });
  set(L.hl, { d: `M ${P([E[0] - 14, E[1]])} L ${P([W[0] - 14, W[1]])}` });
  const dx = E[0] - S[0], dy = E[1] - S[1], l = Math.hypot(dx, dy) || 1, px = -dy / l * 50, py = dx / l * 50;
  set(L.hem, { d: `M ${r1(mx + px)},${r1(my + py)} L ${r1(mx - px)},${r1(my - py)}` });
}
function makePointHand(p) {
  const g = el('g', null, p);
  const OL = { stroke: '#3b1f0f', 'stroke-width': 3, 'stroke-linejoin': 'round' };
  el('path', { d: 'M -62,-30 C -66,-62 -30,-78 4,-76 C 40,-74 66,-54 64,-20 L 62,24 C 58,56 34,72 0,72 C -36,72 -60,52 -62,20 Z', fill: 'url(#gFist)', ...OL }, g);
  for (const [x, y, w] of [[2, 14, 58], [0, 36, 54], [-2, 56, 46]]) el('rect', { x, y, width: w, height: 22, rx: 11, fill: '#875232', ...OL, 'stroke-width': 2.5 }, g);
  el('path', { d: 'M -56,-6 C -52,24 -30,38 0,34', fill: 'none', stroke: '#3b1f0f', 'stroke-width': 32, 'stroke-linecap': 'round' }, g);
  el('path', { d: 'M -56,-6 C -52,24 -30,38 0,34', fill: 'none', stroke: '#93603d', 'stroke-width': 26, 'stroke-linecap': 'round' }, g);
  el('ellipse', { cx: -2, cy: 32, rx: 9, ry: 7.5, fill: '#dcae90', stroke: '#8d6048', 'stroke-width': 1.5 }, g);
  el('path', { d: 'M -30,-70 C -30,-92 26,-92 26,-70 L 26,-14 C 26,12 -30,12 -30,-14 Z', fill: 'url(#gFinger)', ...OL }, g);
  el('path', { d: 'M -18,-36 C -18,-54 14,-54 14,-36 L 14,-18 C 14,-4 -18,-4 -18,-18 Z', fill: '#dcae90', stroke: '#8d6048', 'stroke-width': 2 }, g);
  el('path', { d: 'M -12,-40 C -10,-48 2,-49 6,-44', fill: 'none', stroke: '#fff', 'stroke-width': 3, opacity: .55, 'stroke-linecap': 'round' }, g);
  el('path', { d: 'M -24,-64 Q -2,-58 20,-64', fill: 'none', stroke: '#3b1f0f', 'stroke-width': 2.5, opacity: .45 }, g);
  return g;
}
function makeGrabHand(p) {
  const g = el('g', null, p);
  el('path', { d: 'M -6,-74 C 34,-88 76,-62 80,-12 C 86,40 62,88 16,94 C -14,98 -30,70 -30,30 Z', fill: 'url(#gFist)' }, g);
  for (let i = 0; i < 4; i++) {
    const y = -54 + i * 34;
    el('path', { d: `M 12,${y} C -18,${y - 8} -42,${y + 2} -52,${y + 16}`, fill: 'none', stroke: '#6a3d23', 'stroke-width': 30, 'stroke-linecap': 'round' }, g);
    el('path', { d: `M 10,${y - 5} C -16,${y - 12} -36,${y - 4} -46,${y + 8}`, fill: 'none', stroke: '#96603b', 'stroke-width': 12, 'stroke-linecap': 'round', opacity: .6 }, g);
  }
  return g;
}
function makePhone(p) {
  const P = {};
  P.g = el('g', null, p);
  el('rect', { x: -84, y: -166, width: 168, height: 332, rx: 28, fill: '#000', opacity: .45, filter: 'url(#b12)', transform: 'translate(10,14)' }, P.g);
  el('rect', { x: -80, y: -164, width: 160, height: 328, rx: 28, fill: '#1a1d24', stroke: '#4a505e', 'stroke-width': 4 }, P.g);
  el('rect', { x: -70, y: -154, width: 140, height: 308, rx: 20, fill: '#0a0c11' }, P.g);
  el('rect', { x: -24, y: -146, width: 48, height: 12, rx: 6, fill: '#000' }, P.g);
  P.dot = el('circle', { cx: -50, cy: -112, r: 8, fill: '#ff3b3b' }, P.g);
  const rec = el('text', { x: -38, y: -105, 'font-size': 19, fill: '#fff' }, P.g); rec.textContent = 'REC';
  P.timer = el('text', { x: 60, y: -105, 'font-size': 19, fill: '#ff8a8a', 'text-anchor': 'end' }, P.g); P.timer.textContent = '0:00';
  P.bars = [...Array(13)].map((_, i) => el('rect', { x: -60 + i * 9.4, width: 6, rx: 3, fill: '#ffd43b' }, P.g));
  P.label = el('text', { x: 0, y: 122, 'font-size': 17, fill: '#9aa3b5', 'text-anchor': 'middle' }, P.g); P.label.textContent = 'TAKE 1';
  // fingertips peeking around the edges
  const FO = { stroke: '#3b1f0f', 'stroke-width': 2.5 };
  el('rect', { x: -98, y: 0, width: 34, height: 64, rx: 17, fill: '#80492b', ...FO, transform: 'rotate(-8 -81 32)' }, P.g);
  el('ellipse', { cx: -76, cy: 8, rx: 9, ry: 11, fill: '#dcae90', stroke: '#8d6048', 'stroke-width': 1.5 }, P.g);
  for (const y of [-6, 34, 72]) {
    el('rect', { x: 62, y, width: 34, height: 34, rx: 16, fill: '#7a462a', ...FO }, P.g);
    el('path', { d: `M 70,${y + 9} Q 78,${y + 4} 86,${y + 9}`, fill: 'none', stroke: '#b07a55', 'stroke-width': 3, opacity: .6, 'stroke-linecap': 'round' }, P.g);
  }
  return P;
}

function makeChar(parent) {
  const id = ++UID, C = { id };
  const g = C.g = el('g', null, parent);
  C.shadow = el('ellipse', { cx: 30, cy: 560, rx: 440, ry: 720, fill: '#000', opacity: .5, filter: 'url(#b40)' }, g);
  C.backHead = el('g', null, g);
  C.tw = [];
  for (const s of [-1, 1]) TWISTS.forEach((d, i) => {
    const [rx, ry, ex, ey, w] = d;
    const tg = el('g', null, C.backHead);
    const x0 = s * rx, y0 = ry, x1 = s * ex, y1 = ey;
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(len / 10.5);
    const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    for (let k = 0; k <= n; k++) {
      const u = k / n, cx = lerp(x0, x1, u) + Math.sin(u * Math.PI) * 9 * s, cy = lerp(y0, y1, u), tp = 1 - .22 * u;
      el('ellipse', { cx: r1(cx), cy: r1(cy), rx: r1(w * .52 * tp), ry: r1(w * .34 * tp), transform: `rotate(${r1(ang + 90 + (k % 2 ? 34 : -34))} ${r1(cx)} ${r1(cy)})`, fill: k % 2 ? '#24180f' : '#1a110a', stroke: '#0a0503', 'stroke-width': 1.6 }, tg);
    }
    C.tw.push({ g: tg, x0, y0, ph: hash(i * 7.3 + (s + 1) * 5) * 6.28 });
  });
  C.body = el('g', null, g);
  C.armL = el('path', { d: ARM_L, fill: 'url(#gArmL)' }, C.body);
  C.armR = el('path', { d: ARM_R, fill: 'url(#gArmR)' }, C.body);
  el('path', { d: 'M -80,264 C -62,232 62,232 80,264', fill: 'none', stroke: '#c9cdd5', 'stroke-width': 14 }, C.body);
  el('path', { d: NECK, fill: 'url(#gNeck)' }, C.body);
  const torso = el('g', null, C.body);
  el('path', { d: TORSO, fill: 'url(#gTee)' }, torso);
  el('path', { d: TORSO, fill: 'url(#gTeeShade)' }, torso);
  el('path', { d: TORSO, fill: 'url(#gTeeRim)' }, torso);
  const tcp = el('clipPath', { id: 'tc' + id }, defs); el('path', { d: TORSO }, tcp);
  const tin = el('g', { 'clip-path': `url(#tc${id})` }, torso);
  el('ellipse', { cx: 0, cy: 304, rx: 160, ry: 52, fill: '#2a3142', opacity: .2, filter: 'url(#b12)' }, tin);
  for (const d of ['M -272,566 C -262,520 -270,480 -290,450', 'M 272,566 C 262,520 270,480 290,450', 'M -160,640 Q -70,680 10,650', 'M 70,760 Q 150,740 220,690', 'M -220,880 Q -150,860 -90,890'])
    el('path', { d, fill: 'none', stroke: '#8d95a6', 'stroke-width': 5, opacity: .3, 'stroke-linecap': 'round', filter: 'url(#b2)' }, tin);
  el('path', { d: 'M -376,548 C -342,558 -302,564 -272,564', fill: 'none', stroke: '#b9bfca', 'stroke-width': 5 }, torso);
  el('path', { d: 'M 376,548 C 342,558 302,564 272,564', fill: 'none', stroke: '#b9bfca', 'stroke-width': 5 }, torso);
  el('path', { d: 'M -72,256 Q 0,290 72,256', fill: 'none', stroke: '#2b1a10', 'stroke-width': 6, opacity: .35 }, torso);
  el('path', { d: 'M -78,257 Q 0,305 78,257', fill: 'none', stroke: '#e6e9ee', 'stroke-width': 18, 'stroke-linecap': 'round' }, torso);
  el('path', { d: 'M -70,264 Q 0,313 70,264', fill: 'none', stroke: '#a9b0bc', 'stroke-width': 2.5, opacity: .7 }, torso);

  // head
  C.head = el('g', null, g);
  C.earL = el('g', null, C.head); C.earR = el('g', null, C.head);
  for (const [eg, s] of [[C.earL, -1], [C.earR, 1]]) {
    el('ellipse', { cx: s * 170, cy: 18, rx: 29, ry: 47, fill: 'url(#gEar)', transform: `rotate(${s * 8} ${s * 170} 18)` }, eg);
    el('ellipse', { cx: s * 168, cy: 20, rx: 14, ry: 29, fill: 'url(#gEarIn)', transform: `rotate(${s * 8} ${s * 168} 20)` }, eg);
  }
  el('path', { d: HEAD, fill: 'url(#gHead)' }, C.head);
  el('path', { d: HEAD, fill: 'url(#gJaw)' }, C.head);
  el('path', { d: HEAD, fill: 'url(#gHeadRim)' }, C.head);
  const hcp = el('clipPath', { id: 'hc' + id }, defs); el('path', { d: HEAD }, hcp);
  const hin = el('g', { 'clip-path': `url(#hc${id})` }, C.head);
  el('path', { d: 'M -200,-60 C -160,-96 -84,-126 0,-129 C 84,-126 160,-96 200,-60 L 200,-34 C 160,-72 84,-100 0,-102 C -84,-100 -160,-72 -200,-34 Z', fill: '#1a0c05', opacity: .55, filter: 'url(#b8)' }, hin);
  C.face = el('g', null, C.head);
  C.cheeks = [-1, 1].map(s => el('ellipse', { cx: s * 100, cy: 70, rx: 54, ry: 36, fill: 'url(#gCheek)' }, C.face));
  el('ellipse', { cx: 0, cy: 190, rx: 36, ry: 14, fill: '#b07448', opacity: .35, filter: 'url(#b4)' }, C.face);
  const ng = el('g', null, C.face);
  el('path', { d: 'M -4,-28 C -6,0 -8,24 -10,40', fill: 'none', stroke: '#b57d55', 'stroke-width': 9, opacity: .28, 'stroke-linecap': 'round', filter: 'url(#b3)' }, ng);
  el('ellipse', { cx: 4, cy: 88, rx: 40, ry: 11, fill: '#341b0e', opacity: .5, filter: 'url(#b4)' }, ng);
  for (const s of [-1, 1]) el('circle', { cx: s * 27, cy: 70, r: 17, fill: 'url(#gAla)' }, ng);
  el('path', { d: 'M -15,8 C -20,30 -33,46 -31,63 C -29,79 -16,86 0,86 C 16,86 29,79 31,63 C 33,46 20,30 15,8 Z', fill: 'url(#gNose)' }, ng);
  for (const s of [-1, 1]) el('ellipse', { cx: s * 14, cy: 79, rx: 8.5, ry: 4.6, fill: '#23110a', transform: `rotate(${s * 20} ${s * 14} 79)` }, ng);
  el('ellipse', { cx: -7, cy: 58, rx: 11, ry: 8, fill: '#c38e63', opacity: .55, filter: 'url(#b2)' }, ng);
  C.m = makeMouth(C.face, id);
  C.eL = makeEye(C.face, -64, -8, id, 'L'); C.eR = makeEye(C.face, 64, -8, id, 'R');
  C.bL = el('path', { fill: 'none', stroke: '#120a06', 'stroke-width': 16, 'stroke-linecap': 'round' }, C.face);
  C.bR = el('path', { fill: 'none', stroke: '#120a06', 'stroke-width': 16, 'stroke-linecap': 'round' }, C.face);
  // durag
  const dg = el('g', null, C.head);
  el('path', { d: DURAG, fill: 'url(#gDurag)' }, dg);
  el('path', { d: DURAG_EDGE, fill: 'none', stroke: '#1d1d24', 'stroke-width': 16, 'stroke-linecap': 'round' }, dg);
  el('path', { d: 'M -176,-84 C -146,-112 -80,-139 0,-142 C 80,-139 146,-112 176,-84', fill: 'none', stroke: '#5a5a68', 'stroke-width': 2.5, opacity: .55 }, dg);
  el('path', { d: 'M 0,-140 C 3,-182 3,-216 0,-245', fill: 'none', stroke: '#2f2f38', 'stroke-width': 5 }, dg);
  el('path', { d: 'M 5,-142 C 8,-182 8,-214 5,-243', fill: 'none', stroke: '#6a6a7a', 'stroke-width': 2, opacity: .4 }, dg);
  el('path', { d: 'M -152,-118 C -150,-182 -98,-228 -28,-236 C -78,-214 -120,-176 -130,-112 Z', fill: '#fff', opacity: .3, filter: 'url(#b6)' }, dg);
  el('path', { d: 'M 118,-198 C 150,-172 168,-140 172,-104 C 158,-138 138,-168 108,-192 Z', fill: '#cfe0ff', opacity: .16, filter: 'url(#b4)' }, dg);
  for (const d of ['M -70,-146 C -52,-176 -44,-206 -54,-236', 'M 74,-150 C 62,-180 68,-212 60,-238', 'M -128,-100 C -118,-130 -104,-160 -104,-196'])
    el('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 6, opacity: .05, 'stroke-linecap': 'round' }, dg);
  C.glow = el('path', { d: HEAD, fill: 'url(#gFaceGlow)', opacity: 0 }, C.head);
  C.maskHolder = el('g', null, C.head);
  // x-ray overlay
  C.xr = el('g', { opacity: 0, display: 'none' }, g);
  const scp = el('clipPath', { id: 'xs' + id }, defs); C.xrScan = el('rect', { x: -700, y: -420, width: 1400, height: 0 }, scp);
  const xo = el('g', { 'clip-path': `url(#xs${id})` }, C.xr);
  const xcp = el('clipPath', { id: 'xc' + id }, defs);
  C.xrHeadClip = el('path', { d: HEAD }, xcp); el('path', { d: NECK }, xcp); el('path', { d: TORSO }, xcp); el('path', { d: ARM_L }, xcp); el('path', { d: ARM_R }, xcp);
  const xin = el('g', { 'clip-path': `url(#xc${id})` }, xo);
  el('rect', { x: -500, y: -320, width: 1000, height: 1600, fill: '#06122b', opacity: .9 }, xin);
  for (let y = -300; y < 1200; y += 34) el('line', { x1: -500, x2: 500, y1: y, y2: y, stroke: '#4fd8ff', 'stroke-width': 1.4, opacity: .09 }, xin);
  const XS = { fill: 'none', stroke: '#7febff', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  C.xrHead = el('g', null, xin);
  el('path', { d: HEAD, ...XS, opacity: .35, transform: 'scale(.9)' }, C.xrHead);
  el('path', { d: 'M -30,-34 C -52,0 -50,52 -26,86 L 26,86 C 50,52 52,0 30,-34 C 16,-50 -16,-50 -30,-34 Z', ...XS, fill: '#7febff', 'fill-opacity': .08 }, C.xrHead);
  for (const s of [-1, 1]) el('ellipse', { cx: s * 58, cy: 34, rx: 24, ry: 19, ...XS, opacity: .7 }, C.xrHead);
  el('ellipse', { cx: 0, cy: -86, rx: 34, ry: 14, ...XS, opacity: .6 }, C.xrHead);
  el('path', { d: 'M -64,112 C -40,98 40,98 64,112 C 52,146 -52,146 -64,112 Z', ...XS, opacity: .7 }, C.xrHead);
  C.xrBody = el('g', null, xin);
  el('path', { d: 'M -20,96 C -22,190 -24,260 -22,334 M 20,96 C 22,190 24,260 22,334', ...XS }, C.xrBody);
  for (let y = 250; y <= 330; y += 18) el('path', { d: `M -20,${y} Q 0,${y + 6} 20,${y}`, ...XS, 'stroke-width': 2, opacity: .6 }, C.xrBody);
  el('path', { d: 'M 0,338 C -20,360 -50,384 -78,420 M 0,338 C 20,360 50,384 78,420', ...XS }, C.xrBody);
  for (const s of [-1, 1]) {
    el('path', { d: `M ${s * 40},362 C ${s * 120},350 ${s * 232},420 ${s * 238},560 C ${s * 242},684 ${s * 202},770 ${s * 122},776 C ${s * 70},780 ${s * 46},744 ${s * 44},684 Z`, ...XS, fill: '#7febff', 'fill-opacity': .07 }, C.xrBody);
    for (let k = 0; k < 5; k++) el('path', { d: `M ${s * 30},${430 + k * 68} C ${s * 110},${410 + k * 68} ${s * 200},${438 + k * 68} ${s * 236},${492 + k * 68}`, ...XS, opacity: .32 }, C.xrBody);
  }
  el('path', { d: 'M -250,800 C -120,740 120,740 250,800', ...XS, opacity: .5 }, C.xrBody);
  C.xrOut = el('g', { filter: 'url(#xline)' }, xo);
  C.xrHeadOut = el('path', { d: HEAD, fill: '#fff' }, C.xrOut);
  for (const d of [NECK, TORSO, ARM_L, ARM_R]) el('path', { d, fill: '#fff' }, C.xrOut);
  C.xrOutCover = el('g', null, C.xrOut);
  // posed limbs (front)
  C.poseG = el('g', null, g);
  C.pPoint = el('g', { display: 'none' }, C.poseG); C.lPoint = makeLimb(C.pPoint); C.hPoint = makePointHand(C.pPoint);
  C.pGrab = el('g', { display: 'none' }, C.poseG); C.lGrab = makeLimb(C.pGrab); C.hGrab = makeGrabHand(C.pGrab);
  C.pPhone = el('g', { display: 'none' }, C.poseG); C.lPhone = makeLimb(C.pPhone); C.phone = makePhone(C.pPhone);
  C.over = el('g', null, g);
  C.blinkSeed = id * 1.37;
  return C;
}
function blinkF(t, seed) {
  const per = 3.3, k = Math.floor(t / per);
  for (const kk of [k - 1, k]) {
    const bt = kk * per + .6 + hash(kk * 3.7 + seed * 11) * 1.8, d = t - bt;
    if (d >= 0 && d < .2) return d < .07 ? 1 - d / .07 : Math.min(1, (d - .07) / .13);
  }
  return 1;
}
function baseState(t, seed = 0) {
  return {
    x: 540, y: 900, sc: 1, t, op: 1,
    hx: Math.sin(t * 1.3 + seed) * 2, hy: Math.sin(t * 1.9 + seed) * 2.5, hr: Math.sin(t * 1.1 + seed) * 1.3,
    fx: 0, fy: 0, eye: .7, eyeL: 1, eyeR: 1, lx: 0, ly: 0, squint: .2, blink: true,
    browL: { r: 0, t: 0 }, browR: { r: 0, t: 0 },
    mouth: { open: 0, wide: 1, smile: .25, smirk: 0, pucker: 0, trill: 0 },
    glow: 0, pose: null, poseT: 0, poseX: 0, poseY: 0, handSc: 1, breath: Math.sin(t * 2.1 + seed), xray: 0, scan: 1,
  };
}
const REST_L = { S: [-300, 380], E: [-338, 700], W: [-330, 980] }, REST_R = { S: [300, 380], E: [338, 700], W: [330, 980] };
function updChar(C, s, fr) {
  set(C.g, { transform: `translate(${r1(s.x)},${r1(s.y)}) scale(${s.sc.toFixed(4)})`, opacity: r3(s.op) });
  const ht = `translate(${r1(s.hx)},${r1(s.hy)}) rotate(${s.hr.toFixed(2)} 0 170)`;
  set(C.head, { transform: ht }); set(C.backHead, { transform: ht });
  set(C.body, { transform: `translate(0,${r1(-1.6 * s.breath)})` });
  set(C.face, { transform: `translate(${r1(s.fx)},${r1(s.fy)})` });
  set(C.earL, { transform: `translate(${r1(-s.fx * .35)},${r1(-s.fy * .3)})` }); set(C.earR, { transform: `translate(${r1(-s.fx * .35)},${r1(-s.fy * .3)})` });
  const bl = s.blink ? blinkF(s.t, C.blinkSeed) : 1;
  updEye(C.eL, s.eye * s.eyeL * bl, s.lx, s.ly, s.squint); updEye(C.eR, s.eye * s.eyeR * bl, s.lx, s.ly, s.squint);
  set(C.bL, { d: browPath(-1, s.browL.r, s.browL.t) }); set(C.bR, { d: browPath(1, s.browR.r, s.browR.t) });
  updMouth(C.m, s.mouth, fr);
  const sm = s.mouth.smile || 0;
  C.cheeks.forEach(c => set(c, { cy: r1(70 - sm * 6) }));
  for (const tw of C.tw) set(tw.g, { transform: `rotate(${(Math.sin(s.t * 1.9 + tw.ph) * 2.2 - s.hr * .5).toFixed(2)} ${tw.x0} ${tw.y0})` });
  set(C.glow, { opacity: r3(s.glow) });
  // poses
  const k = eOut(s.poseT);
  set(C.pPoint, { display: s.pose === 'point' && k > 0 ? 'inline' : 'none' });
  set(C.pGrab, { display: s.pose === 'grab' && k > 0 ? 'inline' : 'none' });
  set(C.pPhone, { display: s.pose === 'phone' && k > 0 ? 'inline' : 'none' });
  set(C.armL, { display: s.pose === 'point' && k > 0 ? 'none' : 'inline' });
  set(C.armR, { display: (s.pose === 'grab' || s.pose === 'phone') && k > 0 ? 'none' : 'inline' });
  const L3 = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  if (s.pose === 'point' && k > 0) {
    const E = L3(REST_L.E, [-272, 560]), W = L3(REST_L.W, [-146 + s.poseX, 268 + s.poseY]);
    updLimb(C.lPoint, REST_L.S, E, W);
    set(C.hPoint, { transform: `translate(${r1(W[0] + 4)},${r1(W[1] - 30)}) scale(${r3(lerp(1, s.handSc, k))}) rotate(${r1(lerp(40, -4, k))})` });
  }
  if (s.pose === 'grab' && k > 0) {
    const E = L3(REST_R.E, [372, 610]), W = L3(REST_R.W, [252 + s.poseX, 150 + s.poseY]);
    updLimb(C.lGrab, REST_R.S, E, W);
    set(C.hGrab, { transform: `translate(${r1(W[0] - 40)},${r1(W[1] - 82)}) rotate(${r1(s.handRot || 0)})` });
  }
  if (s.pose === 'phone' && k > 0) {
    const E = L3(REST_R.E, [430, 600]), W = L3(REST_R.W, [418, 200]);
    updLimb(C.lPhone, REST_R.S, E, W);
    set(C.phone.g, { transform: `translate(${r1(W[0] + 4)},${r1(W[1] - 128)}) rotate(${r1(lerp(20, -8, k))}) scale(1.08)` });
  }
  // x-ray
  set(C.xr, { display: s.xray > 0 ? 'inline' : 'none', opacity: r3(s.xray) });
  if (s.xray > 0) {
    set(C.xrScan, { height: r1(1900 * s.scan) });
    set(C.xrHeadClip, { transform: ht }); set(C.xrHead, { transform: ht }); set(C.xrHeadOut, { transform: ht });
  }
}

/* ---------------- titles ---------------- */
function makeTitle(parent, o) {
  const T = { g: el('g', null, parent), o, lines: [], words: [] };
  const size = o.size || 104;
  const y = o.y || (o.pill ? 436 : 400);
  if (o.pill) {
    T.pill = el('g', null, T.g);
    T.pillR = el('rect', { y: 260, height: 62, rx: 31, fill: o.pillColor || '#FFD43B' }, T.pill);
    T.pillT = el('text', { x: 540, y: 304, 'text-anchor': 'middle', 'font-size': 38, fill: '#0b0b0e', 'letter-spacing': 4 }, T.pill);
    T.pillT.textContent = o.pill;
  }
  o.lines.forEach((ln, li) => {
    const te = el('text', { x: 540, y: r1(y + li * size * 1.02), 'text-anchor': 'middle', 'font-size': size, fill: '#fff', filter: 'url(#tsh)', 'letter-spacing': -1.5 }, T.g);
    ln.split(' ').forEach((w, wi) => { const ts = el('tspan', null, te); ts.textContent = (wi ? ' ' : '') + w; T.words.push({ ts, w, li, color: (o.colors || {})[w] || '#fff' }); });
    T.lines.push(te);
  });
  if (T.pill) { const w = T.pillT.getComputedTextLength(); set(T.pillR, { x: r1(540 - w / 2 - 32), width: r1(w + 64) }); }
  for (const te of T.lines) { const w = te.getComputedTextLength(), max = o.maxW || 960; if (w > max) set(te, { 'font-size': r1(size * max / w) }); }
  return T;
}
function updTitle(T, lt) {
  const o = T.o, b = back(inv(0, .34, lt)), a = eOut(inv(0, .2, lt));
  if (T.pill) set(T.pill, { transform: `translate(540,291) scale(${r3(b)}) translate(-540,-291)`, opacity: r3(a) });
  T.lines.forEach((te, li) => { const k = eOut(inv(.05 + li * .07, .33 + li * .07, lt)); set(te, { transform: `translate(0,${r1((1 - k) * 36)})`, opacity: r3(k) }); });
  for (const w of T.words) {
    const rv = o.reveal && o.reveal[w.w];
    let op = 1, dy = 0;
    if (rv != null) { op = eOut(inv(rv, rv + .16, lt)); }
    let col = w.color; const ca = o.colorAt && o.colorAt[w.w]; if (ca && lt >= ca[0]) col = ca[1];
    set(w.ts, { 'fill-opacity': r3(op), fill: col });
  }
}

/* ---------------- captions ---------------- */
const PAGES = [];
TL.clips.forEach((c, ci) => {
  let cur = [];
  const flush = () => { if (cur.length) PAGES.push({ ci: ci + 1, words: cur.map(w => ({ w: w.w, t0: w.t0 + c.start, t1: w.t1 + c.start })) }); cur = []; };
  c.words.forEach(w => {
    cur.push(w);
    const chars = cur.map(x => x.w).join(' ').length;
    const nxt = c.words[c.words.indexOf(w) + 1]; const nchars = nxt ? chars + 1 + nxt.w.length : 0;
    if (w.seg_end || cur.length >= 4 || nchars > 19 || (/[,…]$/.test(w.w) && cur.length >= 2)) flush();
  });
  flush();
});
PAGES.forEach((p, i) => {
  const c = TL.clips[p.ci - 1], nx = PAGES[i + 1];
  p.start = p.words[0].t0 - .05;
  p.end = Math.min(nx && nx.ci === p.ci ? nx.words[0].t0 - .05 : 1e9, p.words[p.words.length - 1].t1 + .45, c.start + c.dur);
});
const capG = el('g', { filter: 'url(#tsh)' }, ui);
const capT = el('text', { x: 540, y: 1530, 'text-anchor': 'middle', 'font-size': 66, fill: '#fff', stroke: '#000', 'stroke-width': 14, 'stroke-linejoin': 'round', 'paint-order': 'stroke', 'letter-spacing': -.5 }, capG);
let capPage = -1, capSpans = [];
function updCaptions(t, hide) {
  const pi = PAGES.findIndex(p => t >= p.start && t < p.end);
  if (pi < 0 || hide) { set(capG, { opacity: 0 }); return; }
  const P = PAGES[pi];
  if (pi !== capPage) {
    capPage = pi; capT.textContent = ''; capSpans = [];
    const txt = P.words.map(w => w.w).join(' ');
    let split = -1;
    if (txt.length > 21 && P.words.length > 1) { let acc = 0; for (let i = 0; i < P.words.length; i++) { acc += P.words[i].w.length + 1; if (acc >= txt.length / 2) { split = i; break; } } if (split >= P.words.length - 1) split = P.words.length - 2; }
    P.words.forEach((w, i) => {
      const ts = el('tspan', null, capT);
      if (i === 0) set(ts, { x: 540, dy: split >= 0 ? -38 : 0 });
      else if (i === split + 1 && split >= 0) set(ts, { x: 540, dy: 80 });
      ts.textContent = (i === 0 || i === split + 1 ? '' : ' ') + w.w;
      capSpans.push(ts);
    });
  }
  const k = back(inv(P.start, P.start + .16, t), 2.2);
  set(capG, { opacity: 1, transform: `translate(540,1530) scale(${r3(.82 + .18 * k)}) translate(-540,-1530)` });
  P.words.forEach((w, i) => set(capSpans[i], { fill: t >= w.t0 - .02 && (i === P.words.length - 1 || t < P.words[i + 1].t0 - .02) ? '#FFD43B' : '#fff' }));
}

/* ---------------- scenes ---------------- */
const SCENES = [];
function newScene(ci) {
  const S = { ci, clip: TL.clips[ci - 1], layer: el('g', null, stage), ui: el('g', null, ui) };
  SCENES.push(S); return S;
}
const SEG = t => `M 0,0`;

/* ===== 1 · THE HOOK ===== */
(() => {
  const S = newScene(1), L = S.layer;
  const wThroat = WD(1, 'throat'), wMono = WD(1, 'monotone'), wFive = WD(1, 'five'), wDrills = WD(1, 'drills'), wMask2 = WD(1, 'mask', 1), wComes = WD(1, 'comes'), wOff = WD(1, 'off');
  const TR = wComes.t0 - .03;
  const MIR = 'M 150,1590 L 150,960 A 390,390 0 0 1 930,960 L 930,1590 Z';
  el('path', { d: MIR, fill: '#000', opacity: .6, filter: 'url(#b26)', transform: 'translate(0,26)' }, L);
  el('path', { d: MIR, fill: 'url(#gGlass)' }, L);
  const mcp = el('clipPath', { id: 'mirClip' }, defs); el('path', { d: MIR }, mcp);
  const inM = el('g', { 'clip-path': 'url(#mirClip)' }, L);
  const halo = el('circle', { cx: 540, cy: 930, r: 430, fill: 'url(#gHalo)', opacity: 0 }, inM);
  const rays = el('g', { opacity: 0, filter: 'url(#b6)' }, inM);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, d = .065; el('path', { d: `M 0,0 L ${r1(Math.cos(a - d) * 1000)},${r1(Math.sin(a - d) * 1000)} L ${r1(Math.cos(a + d) * 1000)},${r1(Math.sin(a + d) * 1000)} Z`, fill: '#ffd27a', opacity: i % 2 ? .35 : .6 }, rays); }
  const ch = makeChar(inM);
  // stone mask
  const MASK = 'M 0,-126 C 94,-126 162,-86 166,-10 C 170,66 142,150 92,192 C 62,214 30,222 0,222 C -30,222 -62,214 -92,192 C -142,150 -170,66 -166,-10 C -162,-86 -94,-126 0,-126 Z';
  const mk = el('g', null, ch.maskHolder);
  const mki = el('g', null, mk);
  el('path', { d: MASK, fill: '#000', opacity: .45, filter: 'url(#b8)', transform: 'translate(6,10)' }, mki);
  const kcp = el('clipPath', { id: 'maskClip' }, defs); el('path', { d: MASK }, kcp);
  const mtex = el('g', { 'clip-path': 'url(#maskClip)' }, mki);
  el('image', { href: 'stone.png', x: -180, y: -140, width: 360, height: 380, preserveAspectRatio: 'none' }, mtex);
  el('path', { d: MASK, fill: 'url(#gMaskShade)' }, mtex);
  el('path', { d: 'M -112,-50 Q -64,-74 -18,-52 M 18,-52 Q 64,-74 112,-50', fill: 'none', stroke: '#55585e', 'stroke-width': 12, 'stroke-linecap': 'round' }, mtex);
  el('path', { d: 'M -112,-58 Q -64,-82 -18,-60 M 18,-60 Q 64,-82 112,-58', fill: 'none', stroke: '#c4c7cc', 'stroke-width': 3, opacity: .35, 'stroke-linecap': 'round' }, mtex);
  for (const s of [-1, 1]) {
    el('path', { d: `M ${s * 100},-10 Q ${s * 62},-30 ${s * 26},-10 Q ${s * 62},4 ${s * 100},-10 Z`, fill: '#26282c' }, mtex);
    el('path', { d: `M ${s * 98},-6 Q ${s * 62},8 ${s * 28},-6`, fill: 'none', stroke: '#c4c7cc', 'stroke-width': 2.5, opacity: .3 }, mtex);
  }
  el('path', { d: 'M -14,-34 L -28,66 Q 0,80 28,66 L 14,-34 Z', fill: 'url(#gMaskNose)', opacity: .9 }, mtex);
  el('path', { d: 'M -28,66 Q 0,80 28,66', fill: 'none', stroke: '#2e3034', 'stroke-width': 4, opacity: .7 }, mtex);
  el('path', { d: 'M -54,130 L 54,130', fill: 'none', stroke: '#24262a', 'stroke-width': 9, 'stroke-linecap': 'round' }, mtex);
  el('path', { d: 'M -50,138 L 50,138', fill: 'none', stroke: '#c4c7cc', 'stroke-width': 2.5, opacity: .3, 'stroke-linecap': 'round' }, mtex);
  el('path', { d: MASK, fill: 'none', stroke: '#33353a', 'stroke-width': 7 }, mki);
  el('path', { d: MASK, fill: 'none', stroke: '#d6d9de', 'stroke-width': 2.5, opacity: .3, transform: 'scale(.965)' }, mki);
  const CRACKS = [
    ['M -20,-126 L -30,-90 L -12,-62 L -36,-30 L -26,-4', 'M -12,-62 L 14,-70 L 30,-96'],
    ['M 166,30 L 128,40 L 112,72 L 76,80 L 56,112 L 64,150', 'M 112,72 L 128,108 L 118,140'],
    ['M -150,110 L -118,96 L -96,120 L -62,104 L -40,128 L -10,116 L 10,138', 'M -96,120 L -104,160 L -86,190', 'M -62,104 L -70,70 L -96,58'],
    ['M 40,222 L 34,190 L 52,170 L 40,140', 'M 120,-90 L 100,-64 L 114,-36 L 92,-12'],
  ];
  const crackEls = CRACKS.map(set => set.map(d => [
    el('path', { d, fill: 'none', stroke: '#c9ccd1', 'stroke-width': 2, opacity: .35, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, transform: 'translate(1.5,1.5)', 'stroke-linejoin': 'round' }, mki),
    el('path', { d, fill: 'none', stroke: '#121315', 'stroke-width': 4.5, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, mki)]));
  const crackT = [wThroat.t0 + .02, wMono.t0 + .02, wFive.t0 + .02, wMask2.t0 - .05];
  // glass reflections
  const refl = el('g', { 'clip-path': 'url(#mirClip)' }, L);
  const st1 = el('path', { d: 'M -150,0 L -10,0 L -470,1700 L -610,1700 Z', fill: '#fff', opacity: .05 }, refl);
  const st2 = el('path', { d: 'M 30,0 L 66,0 L -394,1700 L -430,1700 Z', fill: '#fff', opacity: .07 }, refl);
  el('path', { d: MIR, fill: 'none', stroke: 'url(#gGold)', 'stroke-width': 30 }, L);
  el('path', { d: 'M 168,1574 L 168,960 A 372,372 0 0 1 912,960 L 912,1574 Z', fill: 'none', stroke: '#fff4cc', 'stroke-width': 2, opacity: .45 }, L);
  el('path', { d: 'M 132,1606 L 132,960 A 408,408 0 0 1 948,960 L 948,1606 Z', fill: 'none', stroke: '#5b3f10', 'stroke-width': 3, opacity: .7 }, L);
  // debris + dust (screen)
  const fx = el('g', null, L);
  const chips = [...Array(30)].map((_, i) => {
    const pts = [...Array(5)].map((__, j) => { const a = j / 5 * 6.28 + hash(i * 9 + j) * .8, r = 7 + hash(i * 5 + j * 3) * 13; return `${r1(Math.cos(a) * r)},${r1(Math.sin(a) * r)}`; }).join(' ');
    return { e: el('polygon', { points: pts, fill: ['#8f9298', '#6d7076', '#5a5d63'][i % 3], opacity: 0 }, fx), a: hash(i * 1.3) * 6.28, v: 500 + hash(i * 2.7) * 900, sp: (hash(i * 4.1) - .5) * 900, ox: (hash(i * 6.6) - .5) * 220, oy: (hash(i * 8.8) - .5) * 260 };
  });
  const dust = [...Array(8)].map((_, i) => ({ e: el('circle', { r: 40, fill: '#a7aab0', opacity: 0, filter: 'url(#b18)' }, fx), a: hash(i * 3.3) * 6.28, d: 80 + hash(i * 4.4) * 140 }));
  S.title = makeTitle(S.ui, { lines: ['YOUR VOICE', 'IS BURIED'], colors: { BURIED: '#FFD43B' }, y: 392 });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt + .5);
    const s = baseState(lt, 0);
    s.x = 540; s.y = 960; s.sc = lerp(.9, .95, eIO(lt / S.clip.dur));
    const tau = lt - TR;
    // before rip: tense; after: grin
    if (tau < 0) { s.eye = 1; s.mouth.smile = 0; }
    else {
      const surprise = bump(tau, 0, .08, .35);
      s.eye = .7 + .42 * surprise; s.browL.r = s.browR.r = .9 * surprise + .25 * eOut(inv(.3, .6, tau));
      s.mouth.smile = lerp(.1, 1, eOut(inv(.12, .4, tau))); s.mouth.open = .28 * eOut(inv(.12, .4, tau)) + .1 * surprise;
      s.squint = .1 + .3 * eOut(inv(.2, .5, tau));
      s.hr += -4 * bump(tau, 0, .07, .4); s.hx += -10 * bump(tau, 0, .07, .4);
      s.glow = .95 * bump(tau, 0, .06, 1.6) + .12;
    }
    // grab + rip
    s.pose = 'grab';
    const reach = eOut(inv(wMask2.t0 - .4, wMask2.t0 - .02, lt));
    const yank = tau > 0 ? eIn(inv(0, .22, tau)) : 0;
    const release = tau > 0 ? eIO(inv(.22, .6, tau)) : 0;
    s.poseT = reach * (1 - release);
    s.poseX = yank * 330; s.poseY = -yank * 160; s.handRot = -yank * 25;
    // mask transform (head-local)
    const jit = tau < 0 ? 3.2 * eIn(inv(wFive.t0, TR, lt)) : 0;
    let mx = noise(lt * 38) * jit, my = noise(lt * 41 + 9) * jit, mr = noise(lt * 33 + 4) * jit * .6, ms = 1, mo = 1;
    if (tau > 0) { const u = tau; mx = 330 * yank + 1500 * Math.max(0, u - .22); my = -160 * yank - 500 * Math.max(0, u - .22) + 1500 * Math.pow(Math.max(0, u - .22), 2); mr = 26 * yank + 160 * Math.max(0, u - .22); ms = 1 + .4 * Math.max(0, u - .1); mo = 1 - inv(.45, .7, u); }
    set(mk, { transform: `translate(${r1(mx)},${r1(my)}) rotate(${r1(mr)} 0 40) scale(${r3(ms)})`, opacity: r3(mo), display: mo > 0 ? 'inline' : 'none' });
    crackEls.forEach((grp, gi) => { const p = eOut(inv(crackT[gi], crackT[gi] + .22, lt)); grp.forEach(([a, b]) => { set(a, { 'stroke-dashoffset': r3(1 - p) }); set(b, { 'stroke-dashoffset': r3(1 - p) }); }); });
    updChar(ch, s, fr);
    // rays / halo
    const rv = tau > 0 ? bump(tau, .02, .2, 2.2) * .9 + .2 * inv(0, .3, tau) : 0;
    set(rays, { opacity: r3(rv), transform: `translate(540,${r1(960 - 20)}) rotate(${r1(lt * 12)})` });
    set(halo, { opacity: r3(tau > 0 ? clamp(rv * 1.1) : 0) });
    // reflections drift
    set(st1, { transform: `translate(${r1(200 + lt * 60)},0)` }); set(st2, { transform: `translate(${r1(320 + lt * 60)},0)` });
    // debris
    const fcx = 540 + 1 * .93, fcy = 960 + 40 * .93;
    chips.forEach(c => {
      if (tau <= 0) { set(c.e, { opacity: 0 }); return; }
      const u = tau; const x = fcx + 120 + c.ox + Math.cos(c.a) * c.v * u * .55 + 380 * u, y = fcy + c.oy + Math.sin(c.a) * c.v * u * .55 + 1300 * u * u;
      set(c.e, { opacity: r3(clamp(1 - u / 1.1)), transform: `translate(${r1(x)},${r1(y)}) rotate(${r1(c.sp * u)})` });
    });
    dust.forEach(d => {
      if (tau <= 0) { set(d.e, { opacity: 0 }); return; }
      const u = tau; set(d.e, { cx: r1(fcx + 100 + Math.cos(d.a) * d.d * eOut(u / .8) + 160 * u), cy: r1(fcy + Math.sin(d.a) * d.d * eOut(u / .8)), r: r1(40 + 90 * eOut(u / .9)), opacity: r3(.35 * (1 - inv(0, 1, u))) });
    });
    st.tintColor = tau < 0 ? '#3d5a8a' : '#ffb347'; st.tint = tau < 0 ? .5 : .32 * bump(tau, 0, .1, 1.5) + .08;
    st.shake = tau > 0 ? 10 * (1 - inv(0, .35, tau)) : (lt > wFive.t0 ? 1.5 : 0);
    st.flash = tau > 0 ? .35 * (1 - inv(0, .25, tau)) : 0;
  };
})();

/* ===== 2 · LIP TRILLS ===== */
(() => {
  const S = newScene(2), L = S.layer;
  const T0 = WD(2, 'motorboat').t0 - .1;
  const ch = makeChar(L);
  const waves = el('g', { filter: 'url(#gl5)' }, L);
  const W = [...Array(9)].map(() => [el('path', { fill: 'none', stroke: '#7febff', 'stroke-linecap': 'round' }, waves), el('path', { fill: 'none', stroke: '#7febff', 'stroke-linecap': 'round' }, waves)]);
  S.title = makeTitle(S.ui, { pill: 'DRILL 1', lines: ['20 SECONDS'] });
  const bar = el('g', null, S.ui);
  el('rect', { x: 330, y: 486, width: 420, height: 14, rx: 7, fill: '#fff', opacity: .16 }, bar);
  const barF = el('rect', { x: 330, y: 486, width: 0, height: 14, rx: 7, fill: '#FFD43B' }, bar);
  const barD = el('circle', { cy: 493, r: 13, fill: '#FFD43B', filter: 'url(#gl5)' }, bar);
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const s = baseState(lt, 2);
    const sc = lerp(2.42, 2.56, eIO(lt / S.clip.dur));
    s.sc = sc; s.x = 540; s.y = 1110 - 128 * sc; s.hr *= .5; s.hx *= .4; s.hy *= .4;
    const tr = eOut(inv(T0, T0 + .18, lt));
    s.mouth = { open: .05 + .1 * tr, wide: 1, smile: .25 * (1 - tr), pucker: .6 * tr, trill: tr };
    s.browL.r = s.browR.r = .25 * tr; s.squint = .15;
    s.hx += noise(lt * 30) * 1.5 * tr; s.hy += noise(lt * 31 + 3) * 1.5 * tr;
    updChar(ch, s, fr);
    const mx = 540 + s.hx * sc, my = 1110 + s.hy * sc;
    W.forEach((pair, k) => {
      const per = .16, n = Math.floor((lt - T0) / per) - k, born = T0 + n * per, age = lt - born;
      const ok = lt > T0 && age >= 0 && age < 1.2 && born >= T0;
      pair.forEach((p, side) => {
        if (!ok) { set(p, { opacity: 0 }); return; }
        const R = 150 + age * 340, a0 = side ? -0.36 : Math.PI - 0.36, a1 = side ? 0.36 : Math.PI + 0.36;
        const d = `M ${r1(mx + Math.cos(a0) * R)},${r1(my + Math.sin(a0) * R)} A ${r1(R)},${r1(R)} 0 0 1 ${r1(mx + Math.cos(a1) * R)},${r1(my + Math.sin(a1) * R)}`;
        set(p, { d, opacity: r3(Math.pow(1 - age / 1.2, 1.5) * .7 * tr), 'stroke-width': r1(9 * (1 - age / 1.2) + 2) });
      });
    });
    const pr = inv(T0, S.clip.dur, lt);
    set(barF, { width: r1(420 * pr) }); set(barD, { cx: r1(330 + 420 * pr), opacity: r3(lt > T0 ? 1 : 0) });
    st.tintColor = '#2f7fa0'; st.tint = .35 * tr;
  };
})();

/* ===== 3 · HUM SLIDE ===== */
(() => {
  const S = newScene(3), L = S.layer;
  const wHum = WD(3, 'hum'), wM5 = WD(3, 'mmmmm'), wFeel = WD(3, 'feel'), wOpen = WD(3, 'open'), wM3 = WD(3, 'mmm'), wMah = WD(3, 'mahhh'), wKeep = WD(3, 'keep'), wThats = WD(3, "that's");
  const ch = makeChar(L);
  const O = ch.over;
  const trail = el('path', { d: 'M 0,50 C 4,150 -4,260 0,330 C 4,400 0,450 0,500', fill: 'none', stroke: '#ffd43b', 'stroke-width': 8, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, filter: 'url(#gl10)', opacity: .9 }, O);
  const ripples = [...Array(4)].map(() => el('circle', { fill: 'none', stroke: '#ffe27a', 'stroke-width': 4, opacity: 0 }, O));
  const orbG = el('g', null, O);
  el('circle', { r: 90, fill: 'url(#gOrb)', opacity: .7, filter: 'url(#b12)' }, orbG);
  el('circle', { r: 34, fill: 'url(#gOrb)' }, orbG);
  el('circle', { r: 13, fill: '#fff' }, orbG);
  const buzz = [...Array(6)].map(() => el('path', { fill: 'none', stroke: '#7febff', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0, filter: 'url(#gl5)' }, O));
  const scanLine = el('rect', { x: 0, width: 1080, height: 6, fill: '#9ff3ff', opacity: 0, filter: 'url(#gl10)' }, L);
  function tag(txt, col) { const g = el('g', { opacity: 0 }, L); const r = el('rect', { height: 54, rx: 27, fill: '#06122b', stroke: col, 'stroke-width': 3 }, g); const tx = el('text', { x: 0, y: 38, 'font-size': 32, fill: col, 'letter-spacing': 3 }, g); tx.textContent = txt; const w = tx.getComputedTextLength(); set(r, { x: -22, width: w + 44 }); const ln = el('path', { fill: 'none', stroke: col, 'stroke-width': 3, opacity: .9 }, L); return { g, ln, w }; }
  const tNose = tag('BUZZ · NOSE', '#7febff'), tChest = tag('LOW · CHEST', '#ffd43b');
  S.title = makeTitle(S.ui, { pill: 'DRILL 2', lines: ['MMM → MAHHH'] });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const s = baseState(lt, 3);
    s.sc = lerp(1, 1.04, eIO(lt / S.clip.dur)); s.x = 540; s.y = 830;
    const closeE = eIO(inv(.85, 1.15, lt)) * (1 - eIO(inv(wThats.t0 - .2, wThats.t0 + .1, lt)));
    s.eye = .72 * (1 - closeE); s.blink = closeE < .05;
    const hum = win(lt, wHum.t0 - .05, .15, wFeel.t0 + .9, .2) + win(lt, wM3.t0 - .05, .08, wMah.t0, .06);
    const mah = win(lt, wMah.t0, .1, wMah.t1 + .05, .45);
    s.mouth = { open: lerp(0, 1.02, mah) + .22 * win(lt, wMah.t1, .3, wThats.t0 - .3, .4), wide: 1 - .1 * hum + .08 * mah, smile: lerp(.3, .05, mah) + .3 * inv(wThats.t0, wThats.t0 + .3, lt), pucker: .12 * hum };
    s.browL.r = s.browR.r = .2 * closeE + .35 * mah;
    s.hy += 6 * mah; s.hr += noise(lt * 40) * 1.2 * hum;
    // x-ray
    const xon = inv(1.0, 1.08, lt) * (1 - eIO(inv(wThats.t0 - .1, wThats.t0 + .35, lt)));
    s.xray = xon; s.scan = eIO(inv(1.0, 1.55, lt));
    updChar(ch, s, fr);
    const sy = 830 + (-420 + 1900 * s.scan) * s.sc;
    set(scanLine, { y: r1(sy - 3), opacity: r3(lt > 1 && lt < 1.6 ? .9 : 0) });
    // orb path (local)
    const fall = eIO(inv(wMah.t0 - .05, wMah.t0 + .5, lt)), dip = .15 * eOut(inv(wM3.t0, wMah.t0, lt));
    const oy = lerp(52, 500, Math.max(fall, dip * .2)) + noise(lt * 50) * 2.5 * (1 - fall);
    const ox = noise(lt * 47 + 2) * 2.5 * (1 - fall);
    const oOp = eOut(inv(1.25, 1.55, lt)) * xon;
    const oSc = lerp(.55, 1.15, fall) * (1 + .12 * Math.sin(lt * 28) * (hum > .3 ? 1 : .3));
    set(orbG, { transform: `translate(${r1(ox)},${r1(oy)}) scale(${r3(oSc)})`, opacity: r3(oOp) });
    ripples.forEach((rp, i) => { const per = .32, age = ((lt + i * per / 4 * 4 / 4 * 1) % per) / per; const R = (30 + age * 120) * lerp(.7, 1.3, fall); set(rp, { cx: r1(ox), cy: r1(oy), r: r1(R), opacity: r3(oOp * (1 - age) * .8), 'stroke-width': r1(5 * (1 - age) + 1) }); });
    set(trail, { 'stroke-dashoffset': r3(1 - fall), opacity: r3(.9 * xon) });
    buzz.forEach((b, i) => {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2), a = hum * xon;
      const R = 70 + k * 26 + ((lt * 90) % 26);
      set(b, { d: `M ${side * R},${r1(30 - R * .35)} Q ${side * (R + 12)},40 ${side * R},${r1(50 + R * .35)}`, opacity: r3(a * .8 * (1 - k * .25)) });
    });
    // tags
    const nosePos = [540 + 0 * s.sc, 830 + 52 * s.sc], chestPos = [540, 830 + 500 * s.sc];
    const n1 = win(lt, wFeel.t0 - .05, .22, wMah.t0, .25) * xon, n2 = win(lt, wKeep.t0 - .1, .22) * xon;
    set(tNose.g, { opacity: r3(n1), transform: `translate(${r1(700)},${r1(nosePos[1] - 120)}) scale(${r3(.9 + .1 * n1)})` });
    set(tNose.ln, { d: `M 690,${r1(nosePos[1] - 93)} L ${r1(nosePos[0] + 50)},${r1(nosePos[1] - 10)}`, opacity: r3(n1 * .8) });
    set(tChest.g, { opacity: r3(n2), transform: `translate(${r1(700)},${r1(chestPos[1] - 190)}) scale(${r3(.9 + .1 * n2)})` });
    set(tChest.ln, { d: `M 690,${r1(chestPos[1] - 163)} L ${r1(chestPos[0] + 60)},${r1(chestPos[1] - 40)}`, opacity: r3(n2 * .8) });
    st.tintColor = '#2a7cff'; st.tint = .55 * xon;
    st.shake = 5 * bump(lt, wMah.t0, .05, .3);
  };
})();

/* ===== 4 · HOME BASE PITCH ===== */
(() => {
  const S = newScene(4), L = S.layer;
  const wUh = WD(4, 'uh-huh'), wHuh = WD(4, 'huh'), wLands = WD(4, 'lands'), wNat = WD(4, 'natural'), wSpeak = WD(4, 'speak'), wNever = WD(4, 'never'), wDeep = WD(4, 'deep');
  const MX = 860, MT = 660, MB = 1300, HOME = MT + (MB - MT) * .6;
  const ch = makeChar(L);
  const m = el('g', null, L);
  el('rect', { x: MX - 46, y: MT - 8, width: 92, height: MB - MT + 16, rx: 46, fill: '#0d1018', stroke: '#2c3346', 'stroke-width': 3 }, m);
  el('rect', { x: MX - 30, y: MT + 8, width: 60, height: MB - MT - 16, rx: 30, fill: 'url(#gMeter)', opacity: .85 }, m);
  el('rect', { x: MX - 30, y: MT + 8, width: 60, height: MB - MT - 16, rx: 30, fill: '#000', opacity: .25 }, m);
  for (let y = MT + 30; y < MB - 20; y += 32) el('line', { x1: MX - 70, x2: MX - 56, y1: y, y2: y, stroke: '#8b93a8', 'stroke-width': 3, opacity: .55 }, m);
  const hi = el('text', { x: MX, y: MT - 28, 'text-anchor': 'middle', 'font-size': 30, fill: '#c7cfe2', 'letter-spacing': 3 }, m); hi.textContent = 'HIGH';
  const lo = el('text', { x: MX, y: MB + 52, 'text-anchor': 'middle', 'font-size': 30, fill: '#c7cfe2', 'letter-spacing': 3 }, m); lo.textContent = 'LOW';
  const danger = el('g', { opacity: 0 }, m);
  el('rect', { x: MX - 30, y: MB - 130, width: 60, height: 122, rx: 26, fill: '#ff3b4d', opacity: .75 }, danger);
  for (let k = 0; k < 6; k++) el('line', { x1: MX - 30, x2: MX + 30, y1: MB - 120 + k * 22, y2: MB - 140 + k * 22, stroke: '#fff', 'stroke-width': 5, opacity: .35 }, danger);
  const dLab = el('g', { opacity: 0 }, L);
  el('rect', { x: -330, y: -30, width: 330, height: 60, rx: 30, fill: '#ff3b4d' }, dLab);
  const dTx = el('text', { x: -165, y: 12, 'text-anchor': 'middle', 'font-size': 32, fill: '#fff', 'letter-spacing': 2 }, dLab); dTx.textContent = '✕ FORCED DEEP';
  const homeBand = el('rect', { x: MX - 58, y: HOME - 34, width: 116, height: 68, rx: 20, fill: 'none', stroke: '#FFD43B', 'stroke-width': 5, opacity: 0, filter: 'url(#gl5)' }, L);
  const ring = el('circle', { cx: MX, cy: HOME, fill: 'none', stroke: '#FFD43B', 'stroke-width': 5, opacity: 0 }, L);
  const hLab = el('g', { opacity: 0 }, L);
  const hR = el('rect', { y: -30, height: 60, rx: 30, fill: '#FFD43B' }, hLab);
  const hTx = el('text', { y: 11, 'text-anchor': 'middle', 'font-size': 31, fill: '#0b0b0e', 'letter-spacing': 2 }, hLab); hTx.textContent = 'HOME BASE';
  { const w = hTx.getComputedTextLength() + 48; set(hR, { x: r1(-w), width: r1(w) }); set(hTx, { x: r1(-w / 2) }); }
  const lock = el('g', { opacity: 0 }, L);
  el('rect', { x: -16, y: -4, width: 32, height: 26, rx: 5, fill: '#0b0b0e' }, lock);
  el('path', { d: 'M -10,-4 L -10,-12 A 10,10 0 0 1 10,-12 L 10,-4', fill: 'none', stroke: '#0b0b0e', 'stroke-width': 5 }, lock);
  const note = el('g', { opacity: 0 }, L);
  const noteInner = el('g', { filter: 'url(#gl10)' }, note);
  el('ellipse', { cx: 0, cy: 0, rx: 25, ry: 18, transform: 'rotate(-22)', fill: '#FFD43B' }, noteInner);
  el('rect', { x: 17, y: -86, width: 8, height: 86, fill: '#FFD43B' }, noteInner);
  el('path', { d: 'M 25,-86 C 40,-70 58,-62 52,-34 C 48,-48 38,-56 25,-58 Z', fill: '#FFD43B' }, noteInner);
  const trailN = el('path', { fill: 'none', stroke: '#FFD43B', 'stroke-width': 5, 'stroke-dasharray': '2 14', 'stroke-linecap': 'round', opacity: 0 }, L);
  S.title = makeTitle(S.ui, { pill: 'DRILL 3', lines: ['FIND HOME BASE'] });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const s = baseState(lt, 4);
    s.sc = .86; s.x = 330; s.y = 930;
    s.mouth.open = talkOpen(fr, .9); s.mouth.wide = 1 - .15 * s.mouth.open + .06 * noise(fr * .37); s.mouth.smile = .4;
    const n1 = bump(lt, wUh.t0 - .02, .1, .14), n2 = bump(lt, wUh.t0 + .22, .1, .16);
    s.hy += 16 * (n1 + n2); s.fy = 7 * (n1 + n2); s.hr += 2 * (n1 + n2);
    s.squint = .22; s.browL.r = s.browR.r = .2;
    const shake = win(lt, wNever.t0, .1, wDeep.t1 + .1, .2);
    s.hr += Math.sin((lt - wNever.t0) * 20) * 5 * shake; s.fx = Math.sin((lt - wNever.t0) * 20) * 9 * shake;
    s.browL.t = s.browR.t = .5 * shake;
    s.lx = 9 * eOut(inv(1.6, 1.9, lt)) * (1 - shake); s.ly = -2;
    updChar(ch, s, fr);
    // note flight: mouth -> top of meter -> slide to home
    const mouth = [330 + s.hx * .86, 930 + (128 + s.hy) * .86];
    const T_EM = wUh.t0 + .18, T_TOP = T_EM + .75, T_HOME = wLands.t0 + .12;
    let nx = MX, ny = HOME, nsc = 1, nop = 0;
    if (lt >= T_EM) {
      nop = 1;
      if (lt < T_TOP) { const u = eIO(inv(T_EM, T_TOP, lt)); const cx = 620, cy = 560; nx = (1 - u) * (1 - u) * mouth[0] + 2 * u * (1 - u) * cx + u * u * MX; ny = (1 - u) * (1 - u) * mouth[1] + 2 * u * (1 - u) * cy + u * u * (MT + 60); nsc = .6 + .4 * u; }
      else if (lt < T_HOME) { const u = inv(T_TOP, T_HOME, lt); const yy = lerp(MT + 60, HOME, eIO(u)) + Math.sin(u * 14) * 38 * (1 - u); nx = MX; ny = yy; }
      else { const u = inv(T_HOME, T_HOME + .5, lt); ny = HOME - 26 * (1 - elastic(u)) * (u < 1 ? 1 : 0); }
      // speaking jiggle + forced dip
      const talkJ = win(lt, wSpeak.t0, .15, wNever.t0 - .1, .2) * (envAt(fr) - .3) * 40;
      const dip = bump(lt, wDeep.t0 - .05, .2, .5) * (MB - 70 - HOME);
      ny += talkJ + dip;
    }
    set(note, { opacity: r3(nop), transform: `translate(${r1(nx)},${r1(ny)}) scale(${r3(nsc * (1 + .08 * Math.sin(lt * 9)))})` });
    if (lt >= T_EM && lt < T_TOP + .1) { const pts = []; for (let k = 0; k <= 20; k++) { const u = k / 20 * eIO(inv(T_EM, T_TOP, lt)); pts.push(`${r1((1 - u) * (1 - u) * mouth[0] + 2 * u * (1 - u) * 620 + u * u * MX)},${r1((1 - u) * (1 - u) * mouth[1] + 2 * u * (1 - u) * 560 + u * u * (MT + 60))}`); } set(trailN, { d: 'M ' + pts.join(' L '), opacity: .6 }); }
    else set(trailN, { opacity: r3(.6 * (1 - inv(T_TOP + .1, T_TOP + .4, lt))) });
    const lk = eOut(inv(wNat.t0 - .05, wNat.t0 + .2, lt));
    set(homeBand, { opacity: r3(lk), transform: `translate(${MX},${HOME}) scale(${r3(lerp(1.5, 1, back(inv(wNat.t0 - .05, wNat.t0 + .25, lt))))}) translate(${-MX},${-HOME})` });
    const ra = inv(wNat.t0, wNat.t0 + .6, lt); set(ring, { r: r1(40 + ra * 150), opacity: r3(lt > wNat.t0 ? (1 - ra) * .8 : 0) });
    set(hLab, { opacity: r3(lk), transform: `translate(${MX - 74},${HOME}) scale(${r3(back(inv(wNat.t0, wNat.t0 + .3, lt)))})` });
    set(lock, { opacity: r3(lk), transform: `translate(${MX - 74 - 300 - 4},${HOME}) scale(0)` });
    const dz = win(lt, wNever.t0 - .05, .15);
    set(danger, { opacity: r3(dz * (.7 + .3 * Math.sin(lt * 18))) });
    set(dLab, { opacity: r3(dz), transform: `translate(${MX - 74},${MB - 70}) scale(${r3(back(inv(wNever.t0 - .05, wNever.t0 + .25, lt)))})` });
    st.tintColor = '#7b4dff'; st.tint = .28;
  };
})();

/* ===== 5 · MELODY 3 WAYS ===== */
(() => {
  const S = newScene(5), L = S.layer;
  const wSame = WD(5, 'same'), wFlat = WD(5, 'flat'), wCart = WD(5, 'cartoon'), wHalf = WD(5, 'halfway'), wSig = WD(5, 'signature');
  const main = makeChar(L);
  const PY = [560, 850, 1140], PH = 270, PW = 960;
  const kinds = [
    { name: 'FLAT', col: '#9aa1ad', txt: '#0b0b0e', at: wFlat.t0, stroke: '#9aa1ad' },
    { name: 'CARTOON', col: '#ff4dc4', txt: '#fff', at: wCart.t0, stroke: 'url(#gRainbow)' },
    { name: 'HALFWAY', col: '#FFD43B', txt: '#0b0b0e', at: wHalf.t0, stroke: 'url(#gGoldTeal)' },
  ];
  const panels = kinds.map((k, i) => {
    const P = { k, g: el('g', null, L) };
    P.bg = el('rect', { width: PW, height: PH, rx: 30, fill: '#121621', stroke: '#2a3142', 'stroke-width': 3 }, P.g);
    const cid = 'pc' + i; const cp = el('clipPath', { id: cid }, defs); el('rect', { width: PW, height: PH, rx: 30 }, cp);
    const inner = el('g', { 'clip-path': `url(#${cid})` }, P.g);
    P.spot = el('circle', { cx: 150, cy: 150, r: 190, fill: k.col, opacity: .1, filter: 'url(#b26)' }, inner);
    P.cg = el('g', i === 0 ? { filter: 'url(#gray)' } : null, inner);
    P.ch = makeChar(P.cg);
    P.base = el('line', { x1: 316, x2: 920, y1: 170, y2: 170, stroke: '#3a4256', 'stroke-width': 3, 'stroke-dasharray': '8 10' }, P.g);
    P.wave = el('polyline', { fill: 'none', stroke: k.stroke, 'stroke-width': i === 0 ? 5 : 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0, filter: i ? 'url(#gl5)' : null }, P.g);
    P.lab = el('g', null, P.g);
    P.labR = el('rect', { x: 316, y: 26, height: 50, rx: 25, fill: k.col }, P.lab);
    P.labT = el('text', { x: 338, y: 62, 'font-size': 30, fill: k.txt, 'letter-spacing': 3 }, P.lab); P.labT.textContent = k.name;
    set(P.labR, { width: r1(P.labT.getComputedTextLength() + 44) });
    P.border = el('rect', { width: PW, height: PH, rx: 30, fill: 'none', stroke: '#FFD43B', 'stroke-width': 6, opacity: 0, filter: 'url(#gl10)' }, P.g);
    return P;
  });
  const badge = el('g', { opacity: 0 }, panels[2].g);
  const bR = el('rect', { x: 0, y: 0, height: 52, rx: 26, fill: '#0b0b0e', stroke: '#FFD43B', 'stroke-width': 3 }, badge);
  const bT = el('text', { y: 36, 'text-anchor': 'middle', 'font-size': 26, fill: '#FFD43B', 'letter-spacing': 2 }, badge); bT.textContent = '★ YOUR SIGNATURE';
  const bW = bT.getComputedTextLength() + 44; set(bR, { width: r1(bW) }); set(bT, { x: r1(bW / 2) });
  S.title = makeTitle(S.ui, { pill: 'DRILL 4', lines: ['FLAT → CARTOON → HALFWAY'], size: 92, colorAt: { 'FLAT': [wFlat.t0, '#b9c0cc'], 'CARTOON': [wCart.t0, '#ff6fd0'], 'HALFWAY': [wHalf.t0, '#FFD43B'] } });
  const NPT = 110;
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const split = eIO(inv(wSame.t0 - .05, wSame.t0 + .3, lt));
    const s = baseState(lt, 5);
    s.x = 540; s.y = lerp(930, 1000, split); s.sc = lerp(.95, .7, split); s.op = 1 - split;
    s.mouth.open = talkOpen(fr, .9); s.mouth.smile = .35; s.mouth.wide = 1 - .15 * s.mouth.open;
    set(main.g, { display: split < 1 ? 'inline' : 'none' });
    if (split < 1) updChar(main, s, fr);
    const active = lt >= wHalf.t0 ? 2 : lt >= wCart.t0 ? 1 : lt >= wFlat.t0 ? 0 : -1;
    const sig = eOut(inv(wSig.t0 - .05, wSig.t0 + .25, lt));
    panels.forEach((P, i) => {
      const inK = eOut(inv(wSame.t0 + i * .08, wSame.t0 + .38 + i * .08, lt));
      const on = eOut(inv(P.k.at - .03, P.k.at + .18, lt));
      const sc = 1 + .035 * sig * (i === 2 ? 1 : 0) + .02 * bump(lt, P.k.at, .1, .3);
      set(P.g, { transform: `translate(${r1(60 + (1 - inK) * 1100)},${PY[i]}) translate(480,135) scale(${r3(sc)}) translate(-480,-135)`, opacity: r3((.55 + .45 * Math.max(on, i === 2 ? 0 : 0)) * (i < 2 ? 1 - .5 * sig : 1)) });
      set(P.bg, { stroke: on > .5 ? P.k.col : '#2a3142', 'stroke-opacity': on > .5 ? .55 : 1 });
      set(P.spot, { opacity: r3(.06 + .16 * on) });
      const c = baseState(lt, 10 + i * 3);
      c.x = 150; c.y = 162; c.sc = .4;
      const talking = active === i;
      const op = talking ? talkOpen(fr, [0.35, 1.35, .85][i]) : 0;
      c.mouth = { open: op, wide: [1, 1.12, 1][i] - .15 * op, smile: [0, .35, .5][i], smirk: i === 2 ? .2 : 0 };
      if (i === 0) { c.eye = .42; c.browL.r = c.browR.r = -.25; c.hr = 0; c.hy = 0; c.hx = 0; }
      if (i === 1) { c.eye = 1.08; c.browL.r = c.browR.r = .7 + .4 * Math.abs(Math.sin(lt * 7)) * (talking ? 1 : .2); c.hr = Math.sin(lt * 9) * (talking ? 9 : 2); c.hy = Math.abs(Math.sin(lt * 9)) * (talking ? -14 : -2); c.squint = 0; }
      if (i === 2) { c.eye = .7; c.browL.r = .05; c.browR.r = .25; c.hr = Math.sin(lt * 3) * (talking ? 3 : 1); c.squint = .2; }
      updChar(P.ch, c, fr);
      // waveform
      const A = [5, 92, 48][i] * on * (.6 + .55 * (talking ? envAt(fr) : .25));
      const pts = [];
      for (let k = 0; k <= NPT; k++) {
        const x = 316 + k / NPT * 604, ph = x * .01;
        let y;
        if (i === 0) y = Math.sin(x * .2 + lt * 22) * .5 + noise(x * .05 + lt * 6) * .5;
        else if (i === 1) y = (Math.sin(x * .045 + lt * 9) * .55 + Math.sin(x * .13 - lt * 13) * .45) * (.45 + .55 * Math.abs(noise(x * .02 + lt * 3)));
        else y = Math.sin(x * .03 + lt * 5) * .78 + Math.sin(x * .085 - lt * 3) * .22;
        const env = Math.sin(Math.PI * k / NPT);
        pts.push(`${r1(x)},${r1(170 + y * A * (.35 + .65 * env))}`);
      }
      set(P.wave, { points: pts.join(' '), opacity: r3(on), 'stroke-width': i === 2 ? r1(7 + 3 * sig) : (i ? 7 : 5) });
      set(P.base, { opacity: r3(1 - on) });
      if (i === 2) set(P.border, { opacity: r3(sig * (.75 + .25 * Math.sin(lt * 8))) });
    });
    set(badge, { opacity: r3(sig), transform: `translate(${r1(930 - bW)},${26}) scale(${r3(back(inv(wSig.t0 - .05, wSig.t0 + .3, lt)))})` });
    st.tintColor = ['#4b5563', '#ff4dc4', '#ffb020'][Math.max(0, active)]; st.tint = active < 0 ? 0 : .3;
  };
})();

/* ===== 6 · THE PUNCH WORD ===== */
(() => {
  const S = newScene(6), L = S.layer;
  const wI = WD(6, 'i'), wBeen = WD(6, 'been'), wWait = WD(6, 'waiting'), wOn = WD(6, 'on'), wYou = WD(6, 'you', 0), wRhy = WD(6, 'rhythm'), wQuote = WD(6, 'quote');
  const ch = makeChar(L);
  const fxg = el('g', null, L);
  const lines = [...Array(30)].map(() => el('line', { stroke: '#fff', 'stroke-linecap': 'round', opacity: 0 }, fxg));
  const shock = el('circle', { cx: 540, cy: 790, fill: 'none', stroke: '#FFD43B', opacity: 0 }, fxg);
  S.capHide = lt => lt > wI.t0 - .1 && lt < wRhy.t0 - .05;
  const big = el('g', null, S.ui);
  const pre = el('text', { x: 540, y: 640, 'text-anchor': 'middle', 'font-size': 76, fill: '#fff', filter: 'url(#tsh)', 'letter-spacing': -1 }, big);
  const preW = ['I', 'BEEN', 'WAITING', 'ON', '...'].map((w, i) => { const ts = el('tspan', null, pre); ts.textContent = (i && i < 4 ? ' ' : '') + w; return ts; });
  const preT = [wI.t0, wBeen.t0, wWait.t0, wOn.t0, wOn.t1 - .05];
  const you = el('g', null, big);
  const youT = el('text', { x: 0, y: 105, 'text-anchor': 'middle', 'font-size': 300, fill: '#FFD43B', stroke: '#0b0b0e', 'stroke-width': 16, 'paint-order': 'stroke', 'stroke-linejoin': 'round', filter: 'url(#gl18)', 'letter-spacing': -8 }, you); youT.textContent = 'YOU';
  const q1 = el('text', { x: 22, y: 740, 'font-size': 210, fill: '#FFD43B', opacity: 0, filter: 'url(#tsh)' }, big); q1.textContent = '“';
  const q2 = el('text', { x: 1050, y: 950, 'text-anchor': 'end', 'font-size': 210, fill: '#FFD43B', opacity: 0, filter: 'url(#tsh)' }, big); q2.textContent = '”';
  S.title = makeTitle(S.ui, { pill: 'DRILL 5', lines: ['PAUSE. PUNCH.'], colors: { 'PUNCH.': '#FFD43B' } });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const s = baseState(lt, 6);
    const lean = eIO(inv(wI.t0, wYou.t0, lt)), rel = eIO(inv(wRhy.t0, wRhy.t0 + .5, lt));
    s.x = 540; s.y = lerp(1060, 1090, lean); s.sc = lerp(.98, 1.08, lean) - .04 * rel;
    s.mouth.open = talkOpen(fr, .95); s.mouth.wide = 1 - .15 * s.mouth.open + .05 * noise(fr * .41); s.mouth.smile = .3 + .25 * rel;
    s.browL.t = s.browR.t = .55 * lean * (1 - rel); s.browL.r = s.browR.r = -.25 * lean * (1 - rel) + .2 * rel; s.squint = .1 + .25 * lean;
    s.mouth.smirk = .5 * lean * (1 - rel);
    const hit = bump(lt, wYou.t0 - .02, .06, .5);
    s.pose = 'point'; s.poseT = eOut(inv(wYou.t0 - .22, wYou.t0 - .02, lt)) * (1 - eIO(inv(wQuote.t0, wQuote.t0 + .45, lt)));
    s.handSc = 1.5 + .3 * hit; s.poseY = -20 * hit;
    s.mouth.open = Math.max(s.mouth.open, .55 * bump(lt, wYou.t0 - .02, .05, .35));
    updChar(ch, s, fr);
    // pre-text words
    const preIn = lt >= wI.t0 - .05;
    preW.forEach((ts, i) => {
      let op = eOut(inv(preT[i] - .03, preT[i] + .1, lt));
      if (i === 4 && lt < wYou.t0) op *= .45 + .55 * Math.abs(Math.sin((lt - preT[4]) * 7));
      set(ts, { 'fill-opacity': r3(op) });
    });
    const topK = eIO(inv(wRhy.t0, wRhy.t0 + .4, lt));
    set(pre, { opacity: preIn ? 1 : 0, transform: `translate(0,${r1(-10 * topK)})` });
    const yk = lt - wYou.t0;
    let ys = 0; if (yk >= 0) ys = yk < .1 ? lerp(.2, 1.3, eOut(yk / .1)) : lerp(1.3, 1, eOut((yk - .1) / .3));
    set(you, { transform: `translate(540,${r1(790 - 20 * topK)}) scale(${r3(ys * (1 - .12 * topK))}) rotate(${r1(-4 * (1 - topK))})`, opacity: yk >= 0 ? 1 : 0 });
    lines.forEach((ln, i) => {
      const a = i / 30 * 6.283 + hash(i) * .2, u = inv(0, .55, yk);
      if (yk < 0 || u >= 1) { set(ln, { opacity: 0 }); return; }
      const R0 = 220 + eOut(u) * 700, R1 = R0 + 240 * (1 - u) + 40;
      set(ln, { x1: r1(540 + Math.cos(a) * R0), y1: r1(790 + Math.sin(a) * R0), x2: r1(540 + Math.cos(a) * R1), y2: r1(790 + Math.sin(a) * R1), 'stroke-width': r1(10 * (1 - u) + 2), opacity: r3(.9 * (1 - u)) });
    });
    const su = inv(0, .5, yk); set(shock, { r: r1(80 + eOut(su) * 800), 'stroke-width': r1(30 * (1 - su) + 1), opacity: r3(yk >= 0 ? .8 * (1 - su) : 0) });
    const qk = back(inv(wRhy.t0 + .05, wRhy.t0 + .4, lt));
    set(q1, { opacity: r3(clamp(qk)), transform: `translate(${r1(-30 * (1 - qk))},0)` }); set(q2, { opacity: r3(clamp(qk)), transform: `translate(${r1(30 * (1 - qk))},0)` });
    // darken during the pause
    const pause = win(lt, wOn.t1, .2, wYou.t0 - .02, .05);
    st.tintColor = yk >= 0 ? '#ffb020' : '#ff3b4d'; st.tint = yk >= 0 ? .35 * (1 - inv(0, 1.2, yk)) + .1 : .25 * pause;
    st.zoom = 1 + .05 * pause + .02 * eOut(inv(wI.t0, wYou.t0, lt));
    st.shake = (yk >= 0 ? 24 * (1 - inv(0, .45, yk)) : 0) + 2 * pause;
    st.flash = yk >= 0 ? .42 * (1 - inv(0, .2, yk)) : 0;
    st.dim = .35 * pause;
  };
})();

/* ===== 7 · LAND IT ===== */
(() => {
  const S = newScene(7), L = S.layer;
  const wGoing = WD(7, 'going'), wDown0 = WD(7, 'down', 0), wUp = WD(7, 'up'), wPerm = WD(7, 'permission'), wDown = WD(7, 'down', 1), wMeant = WD(7, 'meant');
  const ch = makeChar(L);
  const A = el('g', null, L);
  const RED = 'M 150,720 C 450,720 640,720 760,694 C 832,678 872,626 886,566';
  const GRN = 'M 150,720 C 450,720 640,720 760,746 C 832,762 872,814 886,874';
  const base = el('path', { d: 'M 150,720 L 560,720', fill: 'none', stroke: '#fff', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, A);
  const red = el('path', { d: RED, fill: 'none', stroke: '#ff4d5e', 'stroke-width': 16, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, filter: 'url(#gl10)' }, A);
  const redH = el('path', { d: 'M -26,22 L 0,-14 L 26,22', fill: 'none', stroke: '#ff4d5e', 'stroke-width': 16, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0, filter: 'url(#gl10)' }, A);
  const grn = el('path', { d: GRN, fill: 'none', stroke: '#3ddc84', 'stroke-width': 16, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, filter: 'url(#gl10)' }, A);
  const grnH = el('path', { d: 'M -26,-22 L 0,14 L 26,-22', fill: 'none', stroke: '#3ddc84', 'stroke-width': 16, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0, filter: 'url(#gl10)' }, A);
  function badge(col, sym) { const g = el('g', { opacity: 0 }, A); el('circle', { r: 44, fill: col }, g); el('path', { d: sym, fill: 'none', stroke: '#fff', 'stroke-width': 11, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); return g; }
  const bx = badge('#ff4d5e', 'M -16,-16 L 16,16 M 16,-16 L -16,16'), bc = badge('#3ddc84', 'M -18,2 L -6,14 L 18,-12');
  function lab(txt, col) { const tx = el('text', { 'font-size': 38, fill: col, 'text-anchor': 'end', opacity: 0, filter: 'url(#tsh)', 'letter-spacing': 1 }, A); tx.textContent = txt; return tx; }
  const lr = lab('ASKING PERMISSION?', '#ff6b78'), lg = lab('MEANT IT.', '#5bea9c');
  set(lr, { x: 740, y: 642 }); set(lg, { x: 740, y: 828 });
  S.title = makeTitle(S.ui, { pill: 'LAST ONE', lines: ['LAND IT ↓'] });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const arrowBounce = bump(lt, wDown0.t0, .1, .35) + bump(lt, wDown.t0, .1, .35);
    const lastW = S.title.words[S.title.words.length - 1];
    set(S.title.lines[0], { transform: `translate(0,${r1(14 * arrowBounce)})` });
    const s = baseState(lt, 7);
    s.x = 540; s.y = 1130; s.sc = .88;
    s.mouth.open = talkOpen(fr, .95); s.mouth.wide = 1 - .15 * s.mouth.open + .05 * noise(fr * .39); s.mouth.smile = .3;
    const up = win(lt, wUp.t0 - .05, .2, wDown.t0 - .1, .3), dn = win(lt, wDown.t0, .2);
    s.browL.r = s.browR.r = .85 * up - .1 * dn; s.hr += 6 * up; s.y -= 10 * up; s.ly = -8 * up; s.lx = 6 * up;
    const nod = bump(lt, wMeant.t0 - .05, .12, .3); s.hy += 16 * nod; s.fy = 6 * nod;
    s.mouth.smirk = .6 * dn; s.mouth.smile = .3 + .2 * dn - .3 * up; s.squint = .1 + .25 * dn;
    updChar(ch, s, fr);
    const pb = eOut(inv(wGoing.t0 - .2, wDown0.t1, lt));
    set(base, { 'stroke-dashoffset': r3(1 - pb), opacity: r3(.5 * pb * (1 - inv(wUp.t0, wUp.t0 + .2, lt))) });
    const pr = eIO(inv(wUp.t0, wUp.t0 + .7, lt)), pg = eIO(inv(wDown.t0, wDown.t0 + .6, lt));
    set(red, { 'stroke-dashoffset': r3(1 - pr), opacity: r3(1 - .62 * pg) });
    set(redH, { opacity: r3(pr > .97 ? 1 - .62 * pg : 0), transform: 'translate(886,560) rotate(18)' });
    set(grn, { 'stroke-dashoffset': r3(1 - pg) });
    set(grnH, { opacity: r3(pg > .97 ? 1 : 0), transform: 'translate(886,880) rotate(-18)' });
    const xb = back(inv(wPerm.t0, wPerm.t0 + .3, lt)), cb = back(inv(wMeant.t0, wMeant.t0 + .3, lt));
    set(bx, { opacity: r3(clamp(xb) * (1 - .5 * pg)), transform: `translate(950,520) scale(${r3(xb)}) rotate(${r1(-12 * (1 - clamp(xb)))})` });
    set(bc, { opacity: r3(clamp(cb)), transform: `translate(950,900) scale(${r3(cb)})` });
    set(lr, { opacity: r3(eOut(inv(wPerm.t0 - .1, wPerm.t0 + .2, lt)) * (1 - .55 * pg)) });
    set(lg, { opacity: r3(eOut(inv(wMeant.t0 - .1, wMeant.t0 + .2, lt))) });
    st.tintColor = dn > .5 ? '#2bd47a' : '#ff4d5e'; st.tint = .25 * Math.max(up, dn);
  };
})();

/* ===== 8 · THE PROOF ===== */
(() => {
  const S = newScene(8), L = S.layer;
  const wNorm = WD(8, 'normal'), wThen = WD(8, 'then'), wDrills = WD(8, 'drills'), wPlay = WD(8, 'play'), wBack2 = WD(8, 'back', 1), wThats = WD(8, "that's"), wUp = WD(8, 'up');
  const ch = makeChar(L);
  function card(x, y, w, h, name, col, n, gold) {
    const C = { g: el('g', { opacity: 0 }, L), x, y, w, h };
    C.bg = el('rect', { x, y, width: w, height: h, rx: 28, fill: '#121722', stroke: gold ? '#6b5a1e' : '#2a3142', 'stroke-width': 3 }, C.g);
    C.glow = el('rect', { x, y, width: w, height: h, rx: 28, fill: 'none', stroke: '#FFD43B', 'stroke-width': 6, opacity: 0, filter: 'url(#gl18)' }, C.g);
    const lr = el('rect', { x: x + 24, y: y + 22, height: 48, rx: 24, fill: col }, C.g);
    const lt = el('text', { x: x + 46, y: y + 57, 'font-size': 28, fill: '#0b0b0e', 'letter-spacing': 3 }, C.g); lt.textContent = name;
    set(lr, { width: r1(lt.getComputedTextLength() + 44) });
    C.bars = [...Array(n)].map((_, i) => ({ e: el('rect', { width: 10, rx: 5, fill: gold ? 'url(#gBarGold)' : '#8b919c' }, C.g), h: gold ? 30 + 110 * Math.abs(Math.sin(i * .55) * .6 + Math.sin(i * 1.7) * .4) : 8 + 14 * hash(i * 3.3) }));
    C.ph = el('rect', { y: y + 84, width: 5, height: h - 104, rx: 2.5, fill: '#fff', opacity: 0 }, C.g);
    return C;
  }
  const B = card(70, 592, 440, 200, 'BEFORE', '#9aa1ad', 22, false);
  const A2 = card(550, 574, 460, 236, 'AFTER', '#FFD43B', 22, true);
  const sparks = [...Array(14)].map((_, i) => el('path', { d: 'M 0,-14 L 4,-4 L 14,0 L 4,4 L 0,14 L -4,4 L -14,0 L -4,-4 Z', fill: '#fff6c8', opacity: 0 }, L));
  S.title = makeTitle(S.ui, { lines: ['RECORD.', 'COMPARE.', "THAT'S YOU."], size: 86, y: 330, colors: { "THAT'S": '#FFD43B', 'YOU.': '#FFD43B' }, reveal: { 'COMPARE.': wPlay.t0, "THAT'S": wThats.t0, 'YOU.': wThats.t0 + .12 } });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const s = baseState(lt, 8);
    s.x = 410; s.y = 1150; s.sc = .84 + .03 * eIO(inv(wThats.t0, S.clip.dur, lt));
    s.pose = 'phone'; s.poseT = eOut(inv(0, .35, lt));
    s.mouth.open = talkOpen(fr, .9); s.mouth.wide = 1 - .15 * s.mouth.open; s.mouth.smile = .3;
    const look = 1 - eIO(inv(wThats.t0 - .1, wThats.t0 + .2, lt));
    s.lx = 13 * look; s.ly = -4 * look; s.fx = 6 * look; s.hr += 3 * look;
    const smirk = eOut(inv(wUp.t0, wUp.t0 + .35, lt));
    s.mouth.smirk = smirk; s.mouth.smile = .3 + .2 * smirk; s.browR.r = .55 * smirk; s.browL.r = -.1 * smirk; s.squint = .1 + .2 * smirk;
    if (lt > wUp.t1) s.mouth.open *= .3;
    updChar(ch, s, fr);
    // phone UI
    const P = ch.phone;
    const rec1 = lt >= .2 && lt < wThen.t0, rec2 = lt >= wThen.t0 && lt < wPlay.t0;
    const sec = rec1 ? Math.min(10, (lt - .2) / (wNorm.t1 - .2) * 10) : rec2 ? Math.min(10, (lt - wThen.t0) / (wDrills.t1 - wThen.t0) * 10) : 10;
    P.timer.textContent = `0:${String(Math.floor(sec)).padStart(2, '0')}`;
    P.label.textContent = lt < wThen.t0 ? 'TAKE 1 · NORMAL' : 'TAKE 2 · DRILLS';
    set(P.dot, { opacity: (rec1 || rec2) && Math.floor(lt * 3) % 2 === 0 ? 1 : .25 });
    P.bars.forEach((b, i) => { const hh = rec2 ? 20 + 90 * Math.abs(noise(lt * 9 + i * .7)) : 6 + 10 * Math.abs(noise(lt * 6 + i * .9)); set(b, { y: r1(-hh / 2), height: r1(hh), fill: rec2 || lt >= wPlay.t0 ? '#ffd43b' : '#8b919c' }); });
    // cards
    const shine = eOut(inv(wThats.t0, wThats.t0 + .35, lt));
    [[B, wNorm.t0 + .05, false], [A2, wDrills.t0 + .02, true]].forEach(([C, t0, gold], ci) => {
      const k = back(inv(t0, t0 + .35, lt)), sc = clamp(k, 0, 2) * (gold ? 1 + .07 * shine : 1);
      const cx = C.x + C.w / 2, cy = C.y + C.h / 2, fy = Math.sin(lt * 2 + ci) * 5;
      set(C.g, { opacity: r3(clamp(k) * (gold ? 1 : 1 - .45 * shine)), transform: `translate(${cx},${r1(cy + fy)}) scale(${r3(sc)}) translate(${-cx},${-cy})` });
      const p0 = gold ? wBack2.t0 - .05 : wPlay.t0 + .02, p1 = p0 + .5, pp = inv(p0, p1, lt);
      const phx = C.x + 30 + pp * (C.w - 60);
      set(C.ph, { x: r1(phx), opacity: r3(lt > p0 && lt < p1 + .15 ? 1 : 0) });
      const n = C.bars.length, by = C.y + C.h * .62;
      C.bars.forEach((b, i) => {
        const bx = C.x + 34 + i * (C.w - 68) / (n - 1) - 5, grow = eOut(inv(t0 + i * .015, t0 + .3 + i * .015, lt));
        const live = 1 + (gold ? .25 : .1) * noise(lt * 6 + i);
        const hh = b.h * grow * live * (gold ? 1 + .15 * shine : 1);
        const lit = lt > p0 && bx < phx;
        set(b.e, { x: r1(bx), y: r1(by - hh / 2), height: r1(Math.max(6, hh)), opacity: r3(lit ? 1 : .8) });
      });
      if (gold) set(C.glow, { opacity: r3(.35 * clamp(k) + .65 * shine * (.8 + .2 * Math.sin(lt * 7))) });
    });
    sparks.forEach((sp, i) => {
      const t0 = wThats.t0 + i * .07, u = inv(t0, t0 + .9, lt);
      if (u <= 0 || u >= 1) { set(sp, { opacity: 0 }); return; }
      const a = hash(i * 7.1) * 6.28, R = 160 + hash(i * 3.9) * 140;
      set(sp, { opacity: r3(Math.sin(u * Math.PI)), transform: `translate(${r1(780 + Math.cos(a) * R * (.6 + .4 * u))},${r1(692 + Math.sin(a) * R * .6 * (.6 + .4 * u))}) scale(${r3(.6 + .8 * Math.sin(u * Math.PI))}) rotate(${r1(u * 90)})` });
    });
    st.tintColor = '#ffb020'; st.tint = .12 + .3 * shine;
  };
})();

/* ---------------- frame driver ---------------- */
SCENES.forEach(S => { set(S.layer, { display: 'none' }); set(S.ui, { display: 'none' }); });
let lastScene = -1;
function renderFrame(fr) {
  const t = fr / FPS;
  let ci = TL.clips.findIndex(c => t >= c.start - 1e-6 && t < c.start + c.dur - 1e-6); if (ci < 0) ci = TL.clips.length - 1;
  const clip = TL.clips[ci], lt = t - clip.start, S = SCENES[ci];
  if (ci !== lastScene) { SCENES.forEach((s, i) => { set(s.layer, { display: i === ci ? 'inline' : 'none' }); set(s.ui, { display: i === ci ? 'inline' : 'none' }); }); lastScene = ci; }
  const st = { shake: 0, flash: 0, tint: 0, tintColor: '#3d5a8a', zoom: 1, dim: 0 };
  S.update(lt, t, fr, st);
  const z = (ci > 0 ? 1 + .05 * (1 - eOut(lt / .3)) : 1) * st.zoom;
  const sx = st.shake ? noise(t * 38) * st.shake : 0, sy = st.shake ? noise(t * 38 + 50) * st.shake : 0;
  set(stage, { transform: `translate(${r1(540 + sx)},${r1(960 + sy)}) scale(${r3(z)}) translate(-540,-960)` });
  set(ui, { transform: st.shake > 4 ? `translate(${r1(sx * .4)},${r1(sy * .4)})` : '' });
  set(flashR, { opacity: r3(clamp(st.flash + (ci > 0 ? .12 * (1 - inv(0, .12, lt)) : 0))) });
  gTint.stops.forEach(s => set(s, { 'stop-color': st.tintColor }));
  set(bgTint, { opacity: r3(st.tint) });
  for (const m of motes) { const y = ((m.y - t * m.sp) % 1920 + 1920) % 1920, x = m.x + Math.sin(t * .4 + m.ph) * 20; set(m.e, { cx: r1(x), cy: r1(y), opacity: r3(m.op * (.6 + .4 * Math.sin(t * .8 + m.ph))) }); }
  updCaptions(t, (S.capHide && S.capHide(lt)) || window.NO_CAPS);
}
window.renderFrame = renderFrame;
window.READY = true;
