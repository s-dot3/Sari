// v16 floor diagrams, painted on the court under the players like a coach's telestrator:
//  rings     - under every player: red for the defence, white for the offence
//  matchups  - a line from each defender to the man he has; when they switch, the old line pulls back into him and
//              the new one runs out to his new man
//  arrows    - where someone is about to go (the drive, the roll, the cut, the switch), drawn along his real path
//  screens   - a T across the screener's body
import * as THREE from 'three';

const Y = 0.014;
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const mat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
export const COLORS = { X: 0xffb02e, O: 0xf4f4f1, line: 0xffc23a, off: 0xf4f4f1, def: 0xffc23a, bad: 0xff3b4e, good: 0x2fe377 };

// a flat ribbon along a polyline with an arrowhead at the end, revealed from the start by u (0..1)
function ribbon(points, width, head = 0.34) {
  const n = points.length, pos = [], idx = [];
  // cumulative length, for the reveal
  const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = L[n - 1] || 1, body = Math.max(0, total - head * 0.9);
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)], d = b.clone().sub(a).setY(0).normalize(), nrm = new THREE.Vector3(-d.z, 0, d.x);
    // (the shaft tapers in at the start)
    const w = width * (0.55 + 0.45 * smooth(L[i] / Math.min(1, total * 0.3)));
    pos.push(points[i].x + nrm.x * w / 2, Y, points[i].z + nrm.z * w / 2, points[i].x - nrm.x * w / 2, Y, points[i].z - nrm.z * w / 2);
  }
  for (let i = 0; i + 1 < n; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return { g, L, total, body };
}

export class Floor16 {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.renderOrder = 2; scene.add(this.group);
    this.rings = {}; this.lines = {}; this.arrows = [];
    this.ringGeo = new THREE.RingGeometry(0.36, 0.45, 56).rotateX(-Math.PI / 2);
    this.lineGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0);
  }
  ring(name, team) {
    if (!this.rings[name]) { const m = new THREE.Mesh(this.ringGeo, mat(COLORS[team], team === 'X' ? 0.7 : 0.5)); m.renderOrder = 3; this.group.add(m); this.rings[name] = m; }
    return this.rings[name];
  }
  line(key) {
    if (!this.lines[key]) { const m = new THREE.Mesh(this.lineGeo, mat(COLORS.line, 0.85)); m.renderOrder = 3; this.group.add(m); this.lines[key] = m; }
    return this.lines[key];
  }
  // a rep's arrows, built once from the players' real paths: [{ who, from, to, color, width }]
  setArrows(list, pathOf) {
    for (const a of this.arrows) { this.group.remove(a.mesh); a.shaft.geometry.dispose(); a.head.geometry.dispose(); }
    this.arrows = list.map(a => {
      const pts = []; for (let t = a.from; t <= a.to + 1e-6; t += 0.04) { const p = pathOf(a.who, t); pts.push(new THREE.Vector3(p.x, Y, p.z)); }
      // (trimmed so it starts outside his ring and stops short of where he ends up)
      const keep = pts.filter((p, i) => i === pts.length - 1 || p.distanceTo(pts[0]) > 0.5);
      const r = ribbon(keep.length > 1 ? keep : pts, a.width ?? 0.13);
      const col = COLORS[a.color] ?? a.color ?? COLORS.off;
      const head = new THREE.Mesh(new THREE.BufferGeometry(), mat(col, 0.92));
      const mesh = new THREE.Mesh(r.g, mat(col, 0.92)); mesh.renderOrder = 4; head.renderOrder = 4;
      const g = new THREE.Group(); g.add(mesh, head); this.group.add(g);
      return { ...a, mesh: g, shaft: mesh, head, r, pts: keep.length > 1 ? keep : pts };
    });
  }
  // arrowhead at the reveal point
  drawArrow(a, u, alpha) {
    const { r } = a, want = r.total * u, n = r.L.length;
    let i = 0; while (i + 1 < n && r.L[i + 1] < want) i++;
    a.shaft.geometry.setDrawRange(0, Math.max(0, i) * 6);
    // head: a triangle at the tip pointing along the path
    const P = this._at(a, want), Q = this._at(a, Math.max(0, want - 0.3)), d = P.clone().sub(Q).setY(0); if (d.lengthSq() < 1e-8) d.set(0, 0, 1); d.normalize();
    const nrm = new THREE.Vector3(-d.z, 0, d.x), w = (a.width ?? 0.13) * 2.6, tip = P.clone().addScaledVector(d, 0.16);
    const b = P.clone().addScaledVector(d, -0.26);
    const verts = [tip.x, Y, tip.z, b.x + nrm.x * w / 2, Y, b.z + nrm.z * w / 2, b.x - nrm.x * w / 2, Y, b.z - nrm.z * w / 2];
    a.head.geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); a.head.geometry.setIndex([0, 1, 2]);
    a.head.visible = u > 0.02;
    a.shaft.material.opacity = 0.92 * alpha; a.head.material.opacity = 0.95 * alpha;
    a.mesh.visible = alpha > 0.01 && u > 0.01;
  }
  _at(a, s) {
    const { r } = a, n = r.L.length; s = Math.min(r.total, Math.max(0, s));
    let i = 0; while (i + 1 < n && r.L[i + 1] < s) i++;
    const j = Math.min(n - 1, i + 1), u = r.L[j] > r.L[i] ? (s - r.L[i]) / (r.L[j] - r.L[i]) : 0;
    return a.pts[i].clone().lerp(a.pts[j], u);
  }
  // where: { name: {x,z} } for everyone on the floor; teams: { name: 'O'|'X' }; links: [{ from, to, u (0..1 drawn), alpha }]
  update(where, teams, links, st, freeze) {
    for (const [n, m] of Object.entries(this.rings)) m.visible = false;
    for (const [n, p] of Object.entries(where)) { if (!teams[n]) continue; const m = this.ring(n, teams[n]); m.visible = true; m.position.set(p.x, 0, p.z); }
    for (const m of Object.values(this.lines)) m.visible = false;
    links.forEach((l, k) => {
      const a = where[l.from], b = where[l.to]; if (!a || !b || l.u <= 0.001) return;
      const d = new THREE.Vector3(b.x - a.x, 0, b.z - a.z), L = d.length(); if (L < 0.95) return;
      d.normalize();
      // ring edge to ring edge, drawn out from the defender
      const s0 = 0.46, s1 = s0 + (L - 0.92) * l.u, m = this.line('l' + k);
      const c = new THREE.Vector3(a.x, Y, a.z).addScaledVector(d, (s0 + s1) / 2);
      m.position.copy(c); m.rotation.set(0, Math.atan2(d.x, d.z), 0); m.scale.set(l.width ?? 0.075, 1, s1 - s0);
      m.material.color.setHex(l.color ?? COLORS.line); m.material.opacity = 0.9 * (l.alpha ?? 1); m.visible = true;
    });
  }
}
