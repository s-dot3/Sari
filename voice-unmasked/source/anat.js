import * as THREE from 'three';
/* Real-anatomy layer. Meshes: BodyParts3D (c) DBCLS, CC BY 4.0.
   Units: cm, larynx near the origin, +Y up, +Z toward the viewer's front. */
const W = 1080, H = 1920;
const canvas = document.getElementById('gl');
const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
R.setPixelRatio(1); R.setSize(W, H, false); R.setClearColor(0x000000, 0);
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 1, 1000);
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x251a16, 1.1));
const key = new THREE.DirectionalLight(0xfff1e0, 2.6); key.position.set(-40, 60, 80); scene.add(key);
const rim = new THREE.DirectionalLight(0x9cc8ff, 2.2); rim.position.set(60, 30, -80); scene.add(rim);
const fill = new THREE.DirectionalLight(0xffd9c0, .6); fill.position.set(50, -20, 60); scene.add(fill);

const man = await (await fetch('anatomy.json')).json();
const buf = await (await fetch('anatomy.bin')).arrayBuffer();
const MAT = {
  bone: { color: 0xeadcc2, roughness: .55, clearcoat: .25, clearcoatRoughness: .5 },
  teeth: { color: 0xf4efe2, roughness: .3, clearcoat: .6 },
  cart: { color: 0xc9e2ea, roughness: .32, clearcoat: .5, sheen: .4, sheenColor: 0xffffff },
  lig: { color: 0xf8f3ea, roughness: .25, clearcoat: .8 },
  muscle: { color: 0xb23a36, roughness: .42, clearcoat: .45, clearcoatRoughness: .35 },
  softp: { color: 0xd9706d, roughness: .4, clearcoat: .5 },
  lip: { color: 0xc4575a, roughness: .38, clearcoat: .5 },
  lung: { color: 0xf0a0a0, roughness: .6, clearcoat: .2, transparent: true, opacity: .5, depthWrite: false },
  dia: { color: 0xd0605a, roughness: .5, transparent: true, opacity: .28, depthWrite: false },
  trach: { color: 0xd8c3b0, roughness: .4, clearcoat: .4 },
  eso: { color: 0xc46a62, roughness: .5, transparent: true, opacity: .5, depthWrite: false },
};
const KIND = { skull: 'bone', spine: 'bone', ribs: 'bone', teeth: 'teeth', thyroid: 'cart', cricoid: 'cart', epiglottis: 'cart', arytenoid: 'cart',
  vligL: 'lig', vligR: 'lig', vocalis: 'muscle', cricothyroid: 'muscle', pharynx: 'muscle', tongue: 'softp', softpal: 'softp', lip: 'lip',
  trachea: 'trach', esophagus: 'eso', lungs: 'lung', diaphragm: 'dia' };
const LARYNX = ['thyroid', 'cricoid', 'epiglottis', 'arytenoid', 'vligL', 'vligR', 'vocalis', 'cricothyroid'];
const parts = {};
const larynxG = new THREE.Group(); scene.add(larynxG);
function skinMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(0x8fd0ff) }, uBase: { value: .04 }, uRim: { value: .7 }, uStone: { value: 0 }, uCrack: { value: 0 },
      uDis: { value: 0 }, uTension: { value: 0 }, uTenP: { value: new THREE.Vector3(0, 0, 3) }, uOp: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor, uTenP; uniform float uBase, uRim, uStone, uCrack, uDis, uTension, uOp; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){
        float dn = n3(vP*.45)*.6 + n3(vP*1.7)*.4;
        if (uDis > 0. && dn < uDis * 1.15 - .08) discard;
        float edge = uDis > 0. ? smoothstep(.09, 0., dn - (uDis * 1.15 - .08)) : 0.;
        float fr = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2);
        vec3 ghost = uColor * (uBase + uRim * fr); float ga = clamp(uBase + uRim * fr, 0., 1.);
        float st = n3(vP*1.3)*.55 + n3(vP*4.1)*.3 + n3(vP*11.)*.15;
        float lit = .3 + .7 * clamp(dot(normalize(vN), normalize(vec3(-.45,.55,.7))), 0., 1.);
        vec3 stone = vec3(.6,.61,.63) * (.62 + .5*st) * lit;
        float cr = smoothstep(.016, 0., abs(n3(vP*.9) - .5)) * uCrack;
        stone = mix(stone, vec3(.08,.08,.09), cr);
        float ten = uTension * smoothstep(7., 0., length(vP - uTenP));
        stone = mix(stone, vec3(.95,.2,.15), ten * .65);
        vec3 col = mix(ghost, stone, uStone) + vec3(1.,.55,.15) * edge * 2.5;
        float a = mix(ga, 1., uStone); a = max(a, edge);
        gl_FragColor = vec4(col, a * uOp); }`,
  });
}
for (const [name, m] of Object.entries(man)) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, m.pos[0], m.pos[1] * 3), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, m.idx[0], m.idx[1] * 3), 1));
  g.computeVertexNormals();
  const mat = name === 'skin' ? skinMaterial() : new THREE.MeshPhysicalMaterial({ ...MAT[KIND[name] || 'bone'], emissive: 0x000000 });
  const mesh = new THREE.Mesh(g, mat);
  if (name === 'skin') mesh.renderOrder = 10;
  if (['lungs', 'diaphragm', 'esophagus'].includes(name)) mesh.renderOrder = 5;
  (LARYNX.includes(name) ? larynxG : scene).add(mesh); parts[name] = mesh;
  mesh.userData.base = { color: mat.color ? mat.color.clone() : null, opacity: mat.opacity ?? 1, transparent: mat.transparent };
}
// lip trill pivot
parts.lip.geometry.computeBoundingBox(); const lipC = parts.lip.geometry.boundingBox.getCenter(new THREE.Vector3());
parts.lip.geometry.translate(-lipC.x, -lipC.y, -lipC.z); parts.lip.position.copy(lipC);

// airway paths (from the chest up)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const LOW = [V(0, -17, -1.6), V(0, -12, -1.8), V(0, -9, -1.1), V(0, -6, -.45), V(0, -3, 0), V(0, -1, .15), V(0, .45, .85), V(0, 1.7, 1.0), V(0, 3.6, .9), V(0, 5.6, 1.0)];
const PATHS = {
  nose: new THREE.CatmullRomCurve3([...LOW, V(0, 7.8, 1.0), V(0, 9.3, 1.5), V(0, 9.8, 3.8), V(0, 9.5, 6.6), V(0, 8.4, 10.2), V(0, 7.8, 12.6)]),
  mouth: new THREE.CatmullRomCurve3([...LOW, V(0, 6.4, 2.2), V(0, 6.6, 4.2), V(0, 6.1, 6.6), V(0, 5.7, 8.7), V(0, 5.7, 11.8)]),
};
function flowMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uHead: { value: 1 }, uTail: { value: 0 }, uT: { value: 0 }, uA: { value: 0 }, uC1: { value: new THREE.Color(0x7febff) }, uC2: { value: new THREE.Color(0xffd43b) }, uDir: { value: 1 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform float uHead, uTail, uT, uA, uDir; uniform vec3 uC1, uC2; varying vec2 vU;
      void main(){ float u = vU.x; if (u > uHead || u < uTail) discard;
        float s = .55 + .45 * sin((u * 46. - uT * 9. * uDir));
        float fade = smoothstep(uTail, uTail + .05, u) * smoothstep(uHead, uHead - .04, u);
        vec3 c = mix(uC1, uC2, u); gl_FragColor = vec4(c * s * 1.4, uA * fade); }`,
  });
}
const flows = {};
for (const [k, c] of Object.entries(PATHS)) {
  const core = new THREE.Mesh(new THREE.TubeGeometry(c, 220, .32, 10, false), flowMat());
  const halo = new THREE.Mesh(new THREE.TubeGeometry(c, 220, .9, 10, false), flowMat());
  core.renderOrder = halo.renderOrder = 30; scene.add(halo, core); flows[k] = { core, halo, curve: c };
}
// glow sprites
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const GT = glowTex();
const sprites = [...Array(8)].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GT, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true })); s.renderOrder = 40; s.visible = false; scene.add(s); return s; });
// air particles
const NP = 90;
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: GT, size: .9, color: 0xbff6ff, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
pts.renderOrder = 35; scene.add(pts);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const tmp = new THREE.Vector3();

function setPart(name, o) {
  const m = parts[name]; if (!m) return;
  const mat = m.material, b = m.userData.base;
  if (o.visible !== undefined) m.visible = o.visible;
  if (o.emissive !== undefined) { mat.emissive.setHex(o.emissive); mat.emissiveIntensity = o.ei ?? 1; }
  if (o.opacity !== undefined) { mat.opacity = o.opacity; mat.transparent = o.opacity < .999 || b.transparent; mat.depthWrite = !mat.transparent; }
}
function reset() {
  for (const [n, m] of Object.entries(parts)) {
    m.visible = n !== 'lip';
    if (n === 'skin') continue;
    const b = m.userData.base; m.material.emissive.setHex(0); m.material.emissiveIntensity = 1;
    m.material.opacity = b.opacity; m.material.transparent = b.transparent; m.material.depthWrite = !b.transparent;
  }
  larynxG.position.set(0, 0, 0);
  parts.vligL.position.set(0, 0, 0); parts.vligR.position.set(0, 0, 0); parts.lip.scale.set(1, 1, 1);
  for (const f of Object.values(flows)) { f.core.visible = f.halo.visible = false; }
  sprites.forEach(s => s.visible = false); pts.visible = false;
}
window.ANAT = {
  clear() { R.clear(); },
  render(s) {
    reset();
    cam.fov = s.fov || 30; cam.updateProjectionMatrix();
    cam.position.set(...s.cam); cam.lookAt(...s.target);
    const sk = parts.skin.material.uniforms;
    sk.uStone.value = s.stone || 0; sk.uCrack.value = s.crack || 0; sk.uDis.value = s.dissolve || 0; sk.uTension.value = s.tension || 0;
    sk.uOp.value = s.skinOp ?? 1; sk.uRim.value = s.skinRim ?? .7;
    const solid = (s.stone || 0) > .5, smat = parts.skin.material;
    smat.side = solid ? THREE.FrontSide : THREE.DoubleSide; smat.depthWrite = solid; smat.transparent = !solid || (s.dissolve || 0) > 0;
    if (s.hideAll) for (const [n, m] of Object.entries(parts)) if (n !== 'skin') m.visible = false;
    if (s.hide) for (const n of s.hide) if (parts[n]) parts[n].visible = false;
    if (s.parts) for (const [n, o] of Object.entries(s.parts)) setPart(n, o);
    if (s.larynxDrop) larynxG.position.y = -s.larynxDrop;
    if (s.vibrate) { const a = .055 * s.vibrate * ((s.frame % 2) ? 1 : -1); parts.vligL.position.x = a; parts.vligR.position.x = -a; }
    if (s.trill) { const k = 1 + .09 * s.trill * ((s.frame % 2) ? 1 : -1); parts.lip.scale.set(1, k, 1 + (k - 1) * .6); }
    if (s.flow) for (const f of s.flow) {
      const F = flows[f.path]; F.core.visible = F.halo.visible = f.a > 0;
      for (const [mesh, mul] of [[F.core, 1], [F.halo, .35]]) {
        const u = mesh.material.uniforms; u.uHead.value = f.head ?? 1; u.uTail.value = f.tail ?? 0; u.uT.value = s.t; u.uA.value = f.a * mul; u.uDir.value = f.dir ?? 1;
        u.uC1.value.setHex(f.c1 ?? 0x7febff); u.uC2.value.setHex(f.c2 ?? 0xffd43b);
      }
    }
    if (s.particles) {
      const p = s.particles, C = flows[p.path].curve, arr = pGeo.attributes.position.array;
      for (let i = 0; i < NP; i++) {
        const f = (hash(i) + s.t * (p.speed ?? .35)) % 1, u = (p.from ?? 0) + f * ((p.to ?? 1) - (p.from ?? 0));
        C.getPointAt(Math.min(.999, Math.max(0, u)), tmp);
        arr[i * 3] = tmp.x + (hash(i * 3.1) - .5) * .7; arr[i * 3 + 1] = tmp.y + (hash(i * 5.3) - .5) * .5; arr[i * 3 + 2] = tmp.z + (hash(i * 7.7) - .5) * .7;
      }
      pGeo.attributes.position.needsUpdate = true; pts.visible = p.a > 0; pts.material.opacity = p.a; pts.material.size = p.size ?? .9;
    }
    (s.glows || []).forEach((g, i) => { const sp = sprites[i]; sp.visible = g.a > 0; sp.position.set(...g.p); sp.scale.setScalar(g.r); sp.material.opacity = g.a; sp.material.color.setHex(g.c ?? 0xffd43b); });
    R.render(scene, cam);
    const out = {};
    for (const [k, p] of Object.entries(s.anchors || {})) {
      tmp.set(...p); if (k.startsWith('lx')) tmp.y -= s.larynxDrop || 0;
      tmp.project(cam); out[k] = [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H];
    }
    return out;
  },
  pathPoint(path, u) { flows[path].curve.getPointAt(u, tmp); return [tmp.x, tmp.y, tmp.z]; },
};
window.ANAT_READY = true;
if (window.ANIM_READY) window.READY = true;
