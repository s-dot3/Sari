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
const bg = el('g', null, document.getElementById('back'));
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

/* ---------------- real-anatomy helpers ---------------- */
function makeLabel(parent, txt, col, txtCol = '#0b0b0e', size = 31) {
  const L = {};
  L.line = el('path', { fill: 'none', stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0 }, parent);
  L.ring = el('circle', { r: 10, fill: 'none', stroke: col, 'stroke-width': 3, opacity: 0 }, parent);
  L.dot = el('circle', { r: 8, fill: col, stroke: '#0b0b0e', 'stroke-width': 3, opacity: 0 }, parent);
  L.g = el('g', { opacity: 0 }, parent);
  L.r = el('rect', { height: size + 28, rx: (size + 28) / 2, fill: col }, L.g);
  L.t = el('text', { x: 24, y: size + 6, 'font-size': size, fill: txtCol, 'letter-spacing': 2 }, L.g); L.t.textContent = txt;
  L.w = L.t.getComputedTextLength() + 48; L.h = size + 28; set(L.r, { width: r1(L.w) });
  return L;
}
function placeLabel(L, x, y, ax, ay, op, t, align = 'left') {
  op = clamp(op); const k = back(op), lx = align === 'left' ? x : x - L.w;
  set(L.g, { opacity: r3(op), transform: `translate(${r1(lx)},${r1(y)}) translate(${r1(L.w / 2)},${r1(L.h / 2)}) scale(${r3(.7 + .3 * k)}) translate(${r1(-L.w / 2)},${r1(-L.h / 2)})` });
  const ex = ax < lx + L.w / 2 ? lx : lx + L.w, ey = y + L.h / 2;
  set(L.line, { d: `M ${r1(ex)},${r1(ey)} L ${r1(ax)},${r1(ay)}`, opacity: r3(op * .9) });
  set(L.dot, { cx: r1(ax), cy: r1(ay), opacity: r3(op) });
  const pr = (t * 1.4) % 1; set(L.ring, { cx: r1(ax), cy: r1(ay), r: r1(10 + pr * 26), opacity: r3(op * (1 - pr) * .8) });
}
function makeCredit(parent) { const c = el('text', { x: 540, y: 1895, 'text-anchor': 'middle', 'font-size': 18, fill: '#fff', opacity: .55, 'font-weight': 700 }, parent); c.textContent = 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International'; return c; }
function makeRipples(parent, n, col) { return [...Array(n)].map(() => el('circle', { fill: 'none', stroke: col, 'stroke-width': 4, opacity: 0, filter: 'url(#gl5)' }, parent)); }
function updRipples(arr, x, y, t, on, ra = 20, rb = 140, per = .5) {
  arr.forEach((c, i) => { const ph = ((t / per) + i / arr.length) % 1; set(c, { cx: r1(x), cy: r1(y), r: r1(ra + ph * (rb - ra)), opacity: r3(clamp(on) * (1 - ph) * .8), 'stroke-width': r1(5 * (1 - ph) + 1) }); });
}
function makePiP(parent, cx = 182, cy = 1296, r = 136) {
  const P = { cx, cy, r, g: el('g', { opacity: 0 }, parent) };
  const cid = 'pip' + (++UID); const cp = el('clipPath', { id: cid }, defs); el('circle', { cx, cy, r }, cp);
  el('circle', { cx, cy: cy + 8, r: r + 6, fill: '#000', opacity: .55, filter: 'url(#b12)' }, P.g);
  el('circle', { cx, cy, r, fill: '#1b2030' }, P.g);
  const inner = el('g', { 'clip-path': `url(#${cid})` }, P.g);
  el('circle', { cx, cy: cy - 20, r: r * 1.05, fill: 'url(#gHalo)', opacity: .22 }, inner);
  P.ch = makeChar(inner); set(P.ch.shadow, { opacity: 0 });
  el('circle', { cx, cy, r, fill: 'none', stroke: '#FFD43B', 'stroke-width': 6 }, P.g);
  const tr = el('rect', { y: cy - r - 30, height: 46, rx: 23, fill: '#FFD43B' }, P.g);
  const tt = el('text', { x: cx, y: cy - r + 2, 'text-anchor': 'middle', 'font-size': 25, fill: '#0b0b0e', 'letter-spacing': 3 }, P.g); tt.textContent = 'YOU DO THIS';
  const tw = tt.getComputedTextLength() + 36; set(tr, { x: r1(cx - tw / 2), width: r1(tw) });
  return P;
}
function updPiP(P, s, fr, op) {
  s.x = P.cx; s.y = P.cy + 22; s.sc = .5; updChar(P.ch, s, fr);
  set(P.g, { opacity: r3(clamp(op)), transform: `translate(${P.cx},${P.cy}) scale(${r3(.8 + .2 * back(clamp(op)))}) translate(${-P.cx},${-P.cy})` });
}
function titleBar(parent) {
  const g = el('g', null, parent);
  el('rect', { x: 330, y: 486, width: 420, height: 14, rx: 7, fill: '#fff', opacity: .16 }, g);
  const f = el('rect', { x: 330, y: 486, width: 0, height: 14, rx: 7, fill: '#FFD43B' }, g);
  const d = el('circle', { cy: 493, r: 13, fill: '#FFD43B', filter: 'url(#gl5)' }, g);
  return (p, on) => { set(f, { width: r1(420 * p) }); set(d, { cx: r1(330 + 420 * p), opacity: on ? 1 : 0 }); };
}


/* =========================================================
   WHAT YOUR VOICE IS MADE OF — energy · resonance · tone · rhythm
   ========================================================= */
const C_E = '#3be3ff', C_R = '#FFD43B', C_T = '#ff5fd2', C_H = '#3ddc84';
const HX = c => parseInt(c.slice(1), 16);
const A_LUNG = [-7.5, -15, 4.5], A_NOSE = [0, 9.4, 8.8], A_CORD = [0, .8, 2.3], A_MOUTH = [0, 5.2, 9.2];
const FOUR = [['ENERGY', C_E], ['RESONANCE', C_R], ['TONE', C_T], ['RHYTHM', C_H]];
function bustRender(lt, fr, ang, dist, k, extra = {}) {
  const pulse = v => v * (.75 + .25 * Math.sin(lt * 6));
  return ANAT.render(Object.assign({ frame: fr, t: lt, fov: 30, cam: [Math.sin(ang) * dist, 6, Math.cos(ang) * dist], target: [0, -5, 0],
    parts: { lungs: { emissive: HX(C_E), ei: .55 * pulse(k[0]), opacity: .5 + .2 * k[0] }, thyroid: { emissive: HX(C_T), ei: .45 * k[2] },
      vligL: { emissive: HX(C_T), ei: 1.4 * k[2] }, vligR: { emissive: HX(C_T), ei: 1.4 * k[2] }, lip: { visible: false } },
    glows: [{ p: A_NOSE, r: 9, a: .8 * pulse(k[1]), c: HX(C_R) }, { p: [0, .8, 1.4], r: 8, a: .8 * pulse(k[2]), c: HX(C_T) }, { p: A_MOUTH, r: 7, a: .7 * pulse(k[3]), c: HX(C_H) }],
    anchors: { e: A_LUNG, r: A_NOSE, t: A_CORD, h: A_MOUTH } }, extra));
}

/* ===== 1 · HOOK: your voice = 4 things ===== */
(() => {
  const S = newScene(1), L = S.layer; S.uses3D = true;
  const W4 = [WD(1, 'energy'), WD(1, 'resonance'), WD(1, 'tone'), WD(1, 'rhythm')], wHere = WD(1, "here's");
  const labs = FOUR.map(([n, c]) => makeLabel(L, n, c));
  makeCredit(S.ui);
  S.title = makeTitle(S.ui, { lines: ['YOUR VOICE', '= 4 THINGS'], colors: { '4': '#FFD43B', 'THINGS': '#FFD43B' }, y: 392 });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt + .5);
    const D = S.clip.dur, k = W4.map(w => eOut(inv(w.t0 - .05, w.t0 + .25, lt))), all = eOut(inv(wHere.t0, wHere.t0 + .5, lt));
    const A = bustRender(lt, fr, lerp(.78, .36, eIO(lt / D)), lerp(150, 126, eIO(lt / D)), k, {
      flow: [{ path: 'mouth', head: all, a: .7 * all, c1: HX(C_E), c2: HX(C_R) }], particles: { path: 'mouth', a: .7 * all, speed: .5 } });
    placeLabel(labs[0], 50, 1250, A.e[0], A.e[1], k[0], lt);
    placeLabel(labs[1], 1030, 640, A.r[0], A.r[1], k[1], lt, 'right');
    placeLabel(labs[2], 1030, 1000, A.t[0], A.t[1], k[2], lt, 'right');
    placeLabel(labs[3], 50, 860, A.h[0], A.h[1], k[3], lt);
    st.tintColor = '#4b6cff'; st.tint = .18 + .12 * all;
  };
})();

/* ===== 2 · ENERGY: breath is the fuel ===== */
(() => {
  const S = newScene(2), L = S.layer; S.uses3D = true;
  const wDia = WD(2, 'diaphragm'), wLungs = WD(2, 'lungs'), wAnd = WD(2, 'and'), wPowers = WD(2, 'powers'), wWeak = WD(2, 'weak'), wSteady = WD(2, 'steady');
  const labD = makeLabel(L, 'DIAPHRAGM DROPS', C_E), labL = makeLabel(L, 'LUNGS FILL', C_E), labA = makeLabel(L, 'AIR = FUEL', C_E);
  const labW = makeLabel(L, 'WEAK AIR', '#8b93a8'), labS = makeLabel(L, 'STEADY AIR', C_E);
  const rip = makeRipples(L, 4, C_E);
  const MX = 988, MT = 690, MB = 1290;
  const meter = el('g', null, L);
  el('rect', { x: MX - 26, y: MT - 6, width: 52, height: MB - MT + 12, rx: 26, fill: '#0d1018', stroke: '#2c3346', 'stroke-width': 3, opacity: .9 }, meter);
  const mFill = el('rect', { x: MX - 16, width: 32, rx: 16, fill: C_E, filter: 'url(#gl5)' }, meter);
  const mTxt = el('text', { x: MX, y: MT - 20, 'text-anchor': 'middle', 'font-size': 24, fill: '#c7cfe2', 'letter-spacing': 2 }, meter); mTxt.textContent = 'AIR';
  makeCredit(S.ui);
  S.title = makeTitle(S.ui, { pill: 'THE FUEL', pillColor: C_E, lines: ['ENERGY'] });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const D = S.clip.dur;
    const inh = eIO(inv(wDia.t0 - .1, wLungs.t1 + .1, lt)), exh = eIO(inv(wAnd.t0 - .05, wPowers.t1 + .2, lt));
    const weak = win(lt, wWeak.t0 - .05, .2, wSteady.t0 - .1, .2), steady = eOut(inv(wSteady.t0 - .05, wSteady.t0 + .2, lt));
    const ang = lerp(.36, .2, eIO(lt / D)), dist = lerp(156, 146, eIO(lt / D));
    const inhaling = inh > 0 && exh <= 0;
    const A = ANAT.render({ frame: fr, t: lt, fov: 30, cam: [Math.sin(ang) * dist, -4, Math.cos(ang) * dist], target: [0, -8.3, 0], breath: inh * (1 - .75 * exh),
      parts: { lungs: { emissive: HX(C_E), ei: .4 * inh * (1 - exh) + .25 * steady, opacity: .5 + .2 * inh }, diaphragm: { emissive: HX(C_E), ei: .5 * win(lt, wDia.t0 - .1, .2, wLungs.t1, .3) } },
      flow: [{ path: 'mouth', head: Math.min(1, exh * 1.2), a: exh > 0 ? .8 * (1 - .6 * weak) : 0, c1: HX(C_E), c2: 0xbff6ff }],
      particles: inhaling ? { path: 'mouth', a: .7 * win(lt, wDia.t0, .2, wLungs.t1 + .1, .2), speed: -.45, c: 0xbff6ff }
        : { path: 'mouth', a: exh > 0 ? .85 - .45 * weak : 0, speed: lerp(.55, .16, weak) + .25 * steady, count: Math.round(90 - 65 * weak), c: weak > .5 ? 0x8b93a8 : 0xbff6ff },
      glows: [{ p: [0, .8, 1.2], r: 7, a: .6 * exh * (1 - .6 * weak), c: HX(C_E) }],
      anchors: { dia: [-6, -30, 4], lung: [7.5, -14, 4.5], trach: [0, -6, .5], mouth: [0, 5.7, 9.6] } });
    updRipples(rip, A.mouth[0], A.mouth[1], lt, (lt > wPowers.t0 ? 1 : 0) * (1 - .7 * weak), 20, 140 + 110 * steady - 60 * weak, .45);
    placeLabel(labD, 50, 1370, A.dia[0], A.dia[1], win(lt, wDia.t0 - .05, .2, wAnd.t0, .3), lt);
    placeLabel(labL, 600, 820, A.lung[0], A.lung[1], win(lt, wLungs.t0 - .05, .2, wAnd.t0 + .2, .3), lt);
    placeLabel(labA, 50, 760, A.trach[0], A.trach[1], win(lt, wPowers.t0 - .1, .2, wWeak.t0 - .1, .2), lt);
    placeLabel(labW, 50, 760, A.mouth[0], A.mouth[1], weak, lt);
    placeLabel(labS, 50, 760, A.mouth[0], A.mouth[1], steady, lt);
    const lvl = clamp(.12 + .5 * inh + .25 * exh - .55 * weak + .45 * steady, .07, 1);
    set(mFill, { y: r1(MB - 10 - (MB - MT - 20) * lvl), height: r1((MB - MT - 20) * lvl), fill: weak > .5 ? '#8b93a8' : C_E });
    st.tintColor = '#2f7fa0'; st.tint = .2 + .12 * steady;
  };
})();

/* ===== 3 · RESONANCE: the speakers ===== */
(() => {
  const S = newScene(3), L = S.layer; S.uses3D = true;
  const wYour = WD(3, 'your', 0), wThroat = WD(3, 'throat'), wMouth = WD(3, 'mouth'), wNose = WD(3, 'nose'), wSpeak = WD(3, 'speakers');
  const labC = makeLabel(L, 'VOCAL CORDS: SMALL BUZZ', '#ffffff');
  const labT = makeLabel(L, 'THROAT', C_R), labM = makeLabel(L, 'MOUTH', C_R), labN = makeLabel(L, 'NOSE', C_R);
  const ripC = makeRipples(L, 3, '#ffffff');
  const arcs = [...Array(8)].map(() => el('path', { fill: 'none', stroke: C_R, 'stroke-linecap': 'round', opacity: 0, filter: 'url(#gl5)' }, L));
  makeCredit(S.ui);
  S.title = makeTitle(S.ui, { pill: 'THE SPEAKERS', pillColor: C_R, lines: ['RESONANCE'] });
  const P_CORD = [0, .45, .9], P_THROAT = [0, 3.8, .9], P_MOUTH = [0, 6.3, 4.6], P_NOSE = [0, 9.6, 5.6];
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const D = S.clip.dur;
    const buzz = eOut(inv(wYour.t0 - .05, wYour.t0 + .3, lt));
    const kT = eOut(inv(wThroat.t0 - .05, wThroat.t0 + .2, lt)), kM = eOut(inv(wMouth.t0 - .05, wMouth.t0 + .2, lt)), kN = eOut(inv(wNose.t0 - .05, wNose.t0 + .2, lt));
    const full = eOut(inv(wSpeak.t0 - .1, wSpeak.t0 + .4, lt));
    const ang = lerp(1.44, 1.3, eIO(lt / D)), dist = lerp(112, 100, eIO(lt / D));
    const A = ANAT.render({ frame: fr, t: lt, fov: 30, cam: [Math.sin(ang) * dist, 9, Math.cos(ang) * dist], target: [0, 8.5, 2.5],
      vibrate: buzz, parts: { vligL: { emissive: 0xffffff, ei: 1.3 * buzz }, vligR: { emissive: 0xffffff, ei: 1.3 * buzz }, pharynx: { emissive: HX(C_R), ei: .35 * kT }, tongue: { emissive: HX(C_R), ei: .35 * kM }, softpal: { emissive: HX(C_R), ei: .35 * kN } },
      glows: [{ p: P_CORD, r: 2.5 + 1.5 * buzz, a: .95 * buzz, c: 0xffffff }, { p: P_THROAT, r: 6 + 3 * full, a: .75 * kT, c: HX(C_R) }, { p: P_MOUTH, r: 7 + 3 * full, a: .75 * kM, c: HX(C_R) }, { p: P_NOSE, r: 7 + 3 * full, a: .75 * kN, c: HX(C_R) }],
      flow: [{ path: 'mouth', tail: .5, head: .5 + .5 * Math.max(.35 * kT, kM), a: .85 * kT, c1: 0xffffff, c2: HX(C_R) }, { path: 'nose', tail: .47, head: .47 + .53 * kN, a: .85 * kN, c1: 0xffffff, c2: HX(C_R) }],
      anchors: { cord: P_CORD, throat: P_THROAT, mouth: P_MOUTH, nose: P_NOSE, lips: [0, 5.7, 11], nost: [0, 8.2, 12.6] } });
    updRipples(ripC, A.cord[0], A.cord[1], lt, buzz * (1 - .5 * full), 10, 60, .3);
    placeLabel(labC, 1030, 1280, A.cord[0], A.cord[1], win(lt, wYour.t0 - .05, .2, wThroat.t0 - .1, .25) + .0, lt, 'right');
    placeLabel(labT, 1030, 1080, A.throat[0], A.throat[1], kT, lt, 'right');
    placeLabel(labM, 1030, 900, A.mouth[0], A.mouth[1], kM, lt, 'right');
    placeLabel(labN, 1030, 720, A.nose[0], A.nose[1], kN, lt, 'right');
    arcs.forEach((p, i) => {
      const src = i % 2 ? A.nost : A.lips, on = i % 2 ? kN : kM;
      const per = .5, ph = ((lt / per) + (i >> 1) / 4) % 1, Rm = lerp(110, 360, full), R = 30 + ph * Rm;
      const a0 = Math.PI - .5, a1 = Math.PI + .5;
      set(p, { d: `M ${r1(src[0] + Math.cos(a0) * R)},${r1(src[1] + Math.sin(a0) * R)} A ${r1(R)},${r1(R)} 0 0 1 ${r1(src[0] + Math.cos(a1) * R)},${r1(src[1] + Math.sin(a1) * R)}`,
        opacity: r3(on * (1 - ph) * (.45 + .45 * full)), 'stroke-width': r1((5 + 5 * full) * (1 - ph) + 1) });
    });
    st.tintColor = '#ffb020'; st.tint = .15 + .15 * full;
  };
})();

/* ===== 4 · TONE: the color (view from above the vocal cords) ===== */
(() => {
  const S = newScene(4), L = S.layer; S.uses3D = true;
  const wSq = WD(4, 'squeeze'), wLeave = WD(4, 'leave'), wWhen = WD(4, 'when'), wClean = WD(4, 'clean');
  const CX = 540, CY = 905, CR = 400;
  el('path', { d: `M0,0 H1080 V1920 H0 Z M ${CX - CR},${CY} a ${CR},${CR} 0 1,0 ${2 * CR},0 a ${CR},${CR} 0 1,0 ${-2 * CR},0 Z`, fill: '#0a0c12', 'fill-rule': 'evenodd', opacity: .97 }, L);
  el('circle', { cx: CX, cy: CY, r: CR, fill: 'none', stroke: '#2c3346', 'stroke-width': 10 }, L);
  const ring = el('circle', { cx: CX, cy: CY, r: CR + 12, fill: 'none', 'stroke-width': 5, opacity: .7, filter: 'url(#gl5)' }, L);
  const tag = el('g', null, L);
  const tagR = el('rect', { y: CY - CR - 36, height: 50, rx: 25, fill: '#1a1f2c', stroke: '#3a4256', 'stroke-width': 2 }, tag);
  const tagT = el('text', { x: CX, y: CY - CR - 3, 'text-anchor': 'middle', 'font-size': 25, fill: '#dfe6f2', 'letter-spacing': 2 }, tag); tagT.textContent = 'LOOKING DOWN AT YOUR VOCAL CORDS';
  { const w = tagT.getComputedTextLength() + 44; set(tagR, { x: r1(CX - w / 2), width: r1(w) }); }
  const ST = [['PRESSED', '#ff4d5e', '#fff'], ['BREATHY', '#9fb3c8', '#0b0b0e'], ['CLEAN CLOSE', C_T, '#0b0b0e']].map(([n, c, tc]) => {
    const g = el('g', { opacity: 0 }, L); const r = el('rect', { y: 0, height: 64, rx: 32, fill: c }, g);
    const tx = el('text', { y: 44, 'font-size': 36, fill: tc, 'letter-spacing': 3, 'text-anchor': 'middle' }, g); tx.textContent = n;
    const w = tx.getComputedTextLength() + 56; set(r, { x: r1(-w / 2), width: r1(w) }); return { g, c };
  });
  const wp = el('g', null, L);
  el('rect', { x: 150, y: 1345, width: 780, height: 120, rx: 26, fill: '#0d1117', stroke: '#253041', 'stroke-width': 3, opacity: .92 }, wp);
  const wave = el('polyline', { fill: 'none', 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', filter: 'url(#gl5)' }, wp);
  makeCredit(S.ui);
  S.title = makeTitle(S.ui, { pill: 'THE COLOR', pillColor: C_T, lines: ['TONE'] });
  const HIDE = ['skull', 'mandible', 'teethL', 'teethU', 'tongue', 'softpal', 'pharynx', 'epiglottis', 'ribs', 'lungs', 'diaphragm', 'esophagus', 'spine'];
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    const pr = win(lt, wSq.t0 - .1, .25, wLeave.t0 - .15, .25), br = win(lt, wLeave.t0 - .1, .25, wWhen.t0 - .15, .25), cl = eOut(inv(wWhen.t0 - .1, wWhen.t0 + .2, lt));
    const gap = .08 - .14 * pr + .42 * br - .08 * cl;
    const wob = [Math.sin(lt * 1.3) * .12, Math.sin(lt * 1.7 + 1) * .08];
    const foldCol = pr > .5 ? 0xff2030 : br > .5 ? 0x7f9bb8 : HX(C_T), fe = .25 + .3 * Math.max(pr, cl) + .15 * br;
    ANAT.render({ frame: fr, t: lt, fov: 32, cam: [wob[0], 9.6, 3.0 + wob[1]], target: [-.06, .45, .75], hide: HIDE, skinOp: 0, gap,
      vibrate: .45 + .2 * pr - .15 * br + .45 * cl, jitter: pr > .5,
      parts: { thyroid: { opacity: .3 }, vocL: { emissive: foldCol, ei: fe }, vocR: { emissive: foldCol, ei: fe }, vligL: { emissive: foldCol, ei: .4 + .6 * cl }, vligR: { emissive: foldCol, ei: .4 + .6 * cl } },
      particles: { path: 'glottis', a: .85 * br, speed: .9, size: .16, count: 70, c: 0xdff6ff },
      glows: [{ p: [-.06, .5, .85], r: 2.2, a: .5 * cl * (.8 + .2 * Math.sin(lt * 20)), c: HX(C_T) }] });
    const active = pr > .5 ? 0 : br > .5 ? 1 : cl > .5 ? 2 : -1;
    ST.forEach((s, i) => { const o = [pr, br, cl][i]; set(s.g, { opacity: r3(o), transform: `translate(${CX},${CY + CR - 110}) scale(${r3(.8 + .2 * back(o))})` }); });
    set(ring, { stroke: active < 0 ? '#5a6478' : ST[active].c });
    const pts = [], N = 140, amp = 42;
    for (let i = 0; i <= N; i++) {
      const x = 175 + i / N * 730, ph = i / N * Math.PI * 2 * 6 - lt * 14;
      const clean = (Math.sin(ph) + .45 * Math.sin(2 * ph + .4) + .2 * Math.sin(3 * ph + .8)) / 1.45;
      const pressed = clamp(Math.sin(ph) * 3.2, -1, 1) * .95 + .12 * Math.sin(ph * 9);
      const breathy = .38 * Math.sin(ph) + .38 * noise(i * 1.7 + lt * 40);
      const neutral = .5 * Math.sin(ph);
      const y = neutral * (1 - pr - br - cl) + pressed * pr + breathy * br + clean * cl;
      pts.push(`${r1(x)},${r1(1405 + y * amp)}`);
    }
    set(wave, { points: pts.join(' '), stroke: active < 0 ? '#c7cfe2' : ST[active].c });
    st.tintColor = active === 0 ? '#ff3b4d' : active === 1 ? '#5a7a9a' : '#ff5fd2'; st.tint = .2;
  };
})();

/* ===== 5 · RHYTHM: the timing ===== */
(() => {
  const S = newScene(5), L = S.layer; S.uses3D = true;
  const words = S.clip.words, c0 = S.clip.start;
  const loud = words.map(w => { let s = 0, n = 0; for (let f = Math.round((c0 + w.t0) * FPS); f <= Math.round((c0 + w.t1) * FPS); f++) { s += envAt(f); n++; } return s / Math.max(1, n); });
  const lmax = Math.max(...loud);
  const STRESS = new Set(['matter', 'big', 'one']);
  const TY = 655, PPS = 250, LX = 30, LW = 1020;
  const lane = el('g', null, L);
  el('rect', { x: LX, y: 545, width: LW, height: 220, rx: 28, fill: '#0d1117', stroke: '#253041', 'stroke-width': 3, opacity: .92 }, lane);
  const lcp = el('clipPath', { id: 'laneClip' }, defs); el('rect', { x: LX + 4, y: 549, width: LW - 8, height: 212, rx: 24 }, lcp);
  const inner = el('g', { 'clip-path': 'url(#laneClip)' }, lane);
  el('line', { x1: LX, x2: LX + LW, y1: TY, y2: TY, stroke: '#2b3546', 'stroke-width': 2, 'stroke-dasharray': '6 10' }, inner);
  const blocks = words.map((w, i) => {
    const g = el('g', null, inner);
    const r = el('rect', { rx: 10, fill: STRESS.has(norm(w.w)) ? C_R : C_H }, g);
    const tx = el('text', { 'font-size': 22, fill: '#e9eef7', 'text-anchor': 'middle' }, g); tx.textContent = w.w.replace(/[.,!?…]+$/, '');
    return { w, g, r, tx, h: 24 + 120 * loud[i] / lmax, stress: STRESS.has(norm(w.w)), tw: tx.textContent.length * 11.5 + 8 };
  });
  const gaps = [];
  for (let i = 1; i < words.length; i++) if (words[i].t0 - words[i - 1].t1 > .45) gaps.push({ a: words[i - 1].t1, b: words[i].t0, g: el('g', null, inner) });
  gaps.forEach(G => { G.p = el('path', { fill: 'none', stroke: '#ffffff', 'stroke-width': 3, opacity: .8 }, G.g); G.t = el('text', { 'font-size': 20, fill: '#ffffff', 'text-anchor': 'middle', 'letter-spacing': 2, opacity: .85 }, G.g); G.t.textContent = 'PAUSE'; });
  const speedTags = [[WD(5, 'speed'), WD(5, 'up'), 'FAST >>', C_H], [WD(5, 'slow'), WD(5, 'down'), 'S L O W', C_H], [WD(5, 'matter'), WD(5, 'matter'), 'HIT IT', C_R], [WD(5, 'big'), WD(5, 'one'), 'HIT IT', C_R]].map(([a, b, txt, col]) => {
    const g = el('g', null, inner); const tx = el('text', { 'font-size': 22, fill: col, 'text-anchor': 'middle', 'letter-spacing': 2 }, g); tx.textContent = txt; return { a, b, g, tx };
  });
  el('line', { x1: 540, x2: 540, y1: 552, y2: 758, stroke: C_H, 'stroke-width': 4, filter: 'url(#gl5)' }, lane);
  el('path', { d: 'M 528,549 L 552,549 L 540,563 Z', fill: C_H }, lane);
  const mouthRip = makeRipples(L, 3, C_H);
  makeCredit(S.ui);
  S.title = makeTitle(S.ui, { pill: 'THE TIMING', pillColor: C_H, lines: ['RHYTHM'] });
  S.update = (lt, t, fr, st) => {
    updTitle(S.title, lt);
    set(lane, { opacity: r3(eOut(inv(.1, .4, lt))) });
    blocks.forEach(B => {
      const x = 540 + (B.w.t0 - lt) * PPS, w = Math.max(10, (B.w.t1 - B.w.t0) * PPS - 8), act = lt >= B.w.t0 && lt < B.w.t1;
      const spoken = lt >= B.w.t0;
      set(B.r, { x: r1(x), y: r1(TY - B.h / 2), width: r1(w), height: r1(B.h), opacity: r3(spoken ? 1 : .32), filter: act ? 'url(#gl5)' : null });
      set(B.tx, { x: r1(x + w / 2), y: r1(TY + B.h / 2 + 26), opacity: r3((w >= B.tw || B.stress) ? (spoken ? .95 : .35) : 0) });
    });
    gaps.forEach(G => {
      const xa = 540 + (G.a - lt) * PPS + 4, xb = 540 + (G.b - lt) * PPS - 4, on = lt > G.a ? 1 : .35;
      set(G.p, { d: `M ${r1(xa)},${TY - 30} L ${r1(xa)},${TY - 44} L ${r1(xb)},${TY - 44} L ${r1(xb)},${TY - 30}`, opacity: r3(.85 * on) });
      set(G.t, { x: r1((xa + xb) / 2), y: TY - 54, opacity: r3(.9 * on) });
    });
    speedTags.forEach(T => {
      const xa = 540 + (T.a.t0 - lt) * PPS, xb = 540 + (T.b.t1 - lt) * PPS;
      set(T.tx, { x: r1((xa + xb) / 2), y: 590, opacity: r3(lt > T.a.t0 - .05 ? 1 : .3) });
    });
    const e = envAt(fr);
    const A = ANAT.render({ frame: fr, t: lt, fov: 28, cam: [88, 15, 20], target: [0, 15.5, 2.5], jaw: clamp(e * .26, 0, .2),
      parts: { lip: { visible: false } }, glows: [{ p: [0, 5.6, 9.2], r: 5 + 5 * e, a: .7 * clamp(e * 1.4), c: HX(C_H) }],
      anchors: { mouth: [0, 5.6, 10] } });
    updRipples(mouthRip, A.mouth[0], A.mouth[1], lt, clamp(e * 1.6), 16, 110, .35);
    st.tintColor = '#1f8f5a'; st.tint = .18;
  };
})();

/* ===== 6 · CLOSE: all four = your real voice ===== */
(() => {
  const S = newScene(6), L = S.layer; S.uses3D = true;
  const W4 = [WD(6, 'energy'), WD(6, 'resonance'), WD(6, 'tone'), WD(6, 'rhythm')], wPut = WD(6, 'put'), wThats = WD(6, "that's");
  const DEF = ['= FUEL', '= SPEAKER', '= COLOR', '= TIMING'];
  const labs = FOUR.map(([n, c], i) => makeLabel(L, `${n} ${DEF[i]}`, c));
  makeCredit(S.ui);
  const T1 = makeTitle(S.ui, { lines: ['YOUR VOICE', '= 4 THINGS'], colors: { '4': '#FFD43B', 'THINGS': '#FFD43B' }, y: 392 });
  const T2 = makeTitle(S.ui, { lines: ["THAT'S YOUR", 'REAL VOICE'], colors: { 'REAL': '#FFD43B', 'VOICE': '#FFD43B' }, y: 392 });
  S.update = (lt, t, fr, st) => {
    const sw = eIO(inv(wThats.t0 - .15, wThats.t0 + .15, lt));
    updTitle(T1, lt + .5); updTitle(T2, lt - wThats.t0 + .1);
    set(T1.g, { opacity: r3(1 - sw) }); set(T2.g, { opacity: r3(lt > wThats.t0 - .1 ? 1 : 0) });
    const D = S.clip.dur, k = W4.map(w => eOut(inv(w.t0 - .05, w.t0 + .25, lt))), all = eOut(inv(wPut.t0, wPut.t0 + .5, lt));
    const A = bustRender(lt, fr, lerp(-.3, .25, eIO(lt / D)), lerp(132, 116, eIO(lt / D)), k.map(v => Math.max(v, all)), {
      flow: [{ path: 'mouth', head: all, a: .8 * all, c1: HX(C_E), c2: HX(C_R) }, { path: 'nose', head: all, a: .6 * all, c1: HX(C_E), c2: HX(C_R) }],
      particles: { path: 'mouth', a: .8 * all, speed: .55 } });
    placeLabel(labs[0], 50, 1250, A.e[0], A.e[1], k[0], lt);
    placeLabel(labs[1], 1030, 640, A.r[0], A.r[1], k[1], lt, 'right');
    placeLabel(labs[2], 1030, 1000, A.t[0], A.t[1], k[2], lt, 'right');
    placeLabel(labs[3], 50, 860, A.h[0], A.h[1], k[3], lt);
    st.tintColor = '#ffb020'; st.tint = .12 + .22 * all;
    st.flash = .25 * (1 - inv(0, .3, lt - wThats.t0)) * (lt > wThats.t0 ? 1 : 0);
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
  if (!S.uses3D && window.ANAT) ANAT.clear();
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
window.ANIM_READY = true;
if (window.ANAT_READY) window.READY = true;
