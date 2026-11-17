// v16 HUD (portrait), v9's film-room HUD for a team: the possession's title, slow-mo / freeze pill, coaching captions,
// and the panel at the bottom on the defender with the contest - his job right now and a timing strip of it over the
// possession, revealed as it plays (green: in front, he can contest; amber: getting there; red: beat), with the
// release marked on it at the closest-defender distance. On top of v9: call-outs pinned over the players
// ("SWITCH!", "JUMP IT!", "SCRAM!") and the shot clock running down. Plus intro and outro cards.
import { clamp, smooth } from './motion.js';
import { REP_TITLES } from './timeline16.js';

const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
const KIND = {
  level: ['AT THE LEVEL', 'Up with the screen, not back'],
  switch: ['SWITCH', 'Take the ball, no gap'],
  wall: ['WALL UP', 'Chest in front, no reach'],
  down: ['WITH HIM', 'Down with the screener'],
  jump: ['JUMP IT', 'Beat him to the spot'],
  closing: ['CLOSING OUT', 'Short steps, hand high'],
  balanced: ['IN FRONT', 'Balanced: you can contest'],
  slide: ['SLIDING', 'Beat him to the spot'],
  cushion: ['CUSHION', 'Big on a guard: give him room'],
  contest: ['CONTEST', 'High hand, straight up'],
};
const GOOD = new Set(['level', 'switch', 'wall', 'down', 'jump', 'balanced', 'slide', 'cushion', 'contest']), WARN = new Set(['closing']);
const RED = [255, 59, 78], GREEN = [47, 227, 119], AMBER = [255, 194, 58];
const col = (open) => (open < 0.5 ? GREEN.map((g, i) => Math.round(g + (AMBER[i] - g) * open * 2)) : AMBER.map((a, i) => Math.round(a + (RED[i] - a) * (open - 0.5) * 2)));

export class Hud16 {
  constructor(root, reps, frames, fps) {
    this.root = root; this.reps = reps; this.frames = frames; this.fps = fps;
    root.innerHTML = '';
    this.top = el('div', 'top', '<div class="kick">NO OPEN LOOKS</div><div class="title"><span></span></div>'); root.appendChild(this.top);
    this.mode = el('div', 'mode', '<span></span>'); root.appendChild(this.mode);
    this.cap = el('div', 'cap', '<div class="box"></div>'); root.appendChild(this.cap);
    this.clock = el('div', 'clock', '<div class="l">SHOT CLOCK</div><div class="n"></div>'); root.appendChild(this.clock);
    this.tagLayer = el('div', 'tags'); root.appendChild(this.tagLayer);
    this.strip = el('div', 'strip', `<div class="row"><span class="state"><span class="lbl"></span><b class="pill"></b><span class="sub"></span></span><span class="legend"></span></div><div class="bar"><canvas width="960" height="34"></canvas><div class="mask"></div></div>`);
    root.appendChild(this.strip);
    this.card = el('div', 'card'); root.appendChild(this.card);
    this.tags = [];
    this.seg = {}; this.repStart = {};
    frames.forEach((f) => { const s = this.seg[f.seg] || (this.seg[f.seg] = { v0: f.vt, v1: f.vt }); s.v1 = f.vt + 1 / fps; if (!f.card && this.repStart[f.rep] === undefined) this.repStart[f.rep] = f.vt; });
    // per rep: strip range and colours, the release marker (closest-defender distance, banded like NBA tracking)
    this.R = {};
    for (const [name, rep] of Object.entries(reps)) {
      const P = rep.plan, a = Math.min(...frames.filter(f => f.rep === name && !f.card).map(f => f.st)), b = P.release + 0.35;
      const cv = document.createElement('canvas'); cv.width = 960; cv.height = 34; const g = cv.getContext('2d');
      for (let x = 0; x < 960; x++) { const [r, gg, bb] = col(rep.balance(a + (x + 0.5) / 960 * (b - a)).open); g.fillStyle = `rgb(${r},${gg},${bb})`; g.fillRect(x, 0, 1, 34); }
      const y = rep.frame('you', P.release).p, d = rep.frame('d1', P.release).p, ft = y.distanceTo(d) / 0.3048;
      const band = ft < 2 ? 'VERY TIGHT' : ft < 4 ? 'TIGHT' : ft < 6 ? 'OPEN' : 'WIDE OPEN';
      P.vals = { ...(P.vals || {}), sep: ft.toFixed(1) };
      this.R[name] = { a, b, cv, marks: [{ t: P.release, label: `CONTEST · ${ft.toFixed(1)} FT`, band }] };
    }
    this.marks = [];
  }
  tag(i) {
    while (this.tags.length <= i) { const e = el('div', 'tag', '<span></span>'); this.tagLayer.appendChild(e); this.tags.push(e); }
    return this.tags[i];
  }
  setRep(name) {
    if (this.cur === name) return; this.cur = name;
    const R = this.R[name], rep = this.reps[name];
    this.top.querySelector('.title span').textContent = REP_TITLES[name];
    this.strip.querySelector('canvas').getContext('2d').drawImage(R.cv, 0, 0);
    this.strip.querySelector('.lbl').textContent = rep.plan.who || 'D';
    this.strip.querySelector('.legend').innerHTML = '<span><i style="background:var(--green)"></i>IN FRONT</span><span><i style="background:var(--red)"></i>BEAT</span>';
    for (const m of this.marks) m.e.remove();
    const bar = this.strip.querySelector('.bar');
    this.marks = R.marks.map(m => {
      const e = el('div', 'mk right', `<span>${m.label}</span>`), x = (m.t - R.a) / (R.b - R.a) * 960;
      e.style.left = x + 'px';
      const good = m.band === 'VERY TIGHT' || m.band === 'TIGHT', s = e.querySelector('span');
      s.style.background = good ? 'var(--green)' : 'var(--red)'; s.style.color = good ? '#04150a' : '#fff';
      bar.appendChild(e); return { ...m, e };
    });
    if (!this.ph) { this.ph = el('div', 'ph'); bar.appendChild(this.ph); }
  }
  // fr: frame; st: sim time; tags: [{ x, y, text, kind, a, pop }] on screen
  update(fr, st, tags = []) {
    const rep = this.reps[fr.rep], P = rep.plan, S = this.seg[fr.seg], e = fr.vt - S.v0, r = S.v1 - fr.vt;
    this.setRep(fr.rep);
    if (fr.card) {
      const k = fr.card;
      if (this.cardKind !== k) {
        this.cardKind = k;
        this.card.innerHTML = k === 'intro'
          ? `<div class="k">FILM ROOM · TEAM DEFENCE</div><div class="h">NO OPEN<br>LOOKS</div><div class="s">Kill the action. Make them take a bad one.</div>
             <div class="list"><div>1 · Switch it</div><div>2 · Kill the pin-down</div><div>3 · No backdoor</div><div>4 · Scram the mismatch</div></div>
             <div class="key">Ring on the floor = his feet · Arrow = where his weight is going<br><b class="g">Green</b>: in front, he can contest · <b class="r">Red</b>: beat<br><b class="a">Gold</b> line: who's got who</div>`
          : `<div class="big">Talk early.<br><em>Switch on time.</em></div><div class="big" style="margin-top:56px">Every shot<br><em>contested.</em></div>
             <div class="src">Motion: CMU Graphics Lab Motion Capture Database</div>`;
      }
      const o = k === 'intro' ? 1 - smooth((e - (S.v1 - S.v0 - 0.35)) / 0.35) : smooth(e / 0.4);
      this.card.style.opacity = String(o);
      for (const x of [this.top, this.mode, this.cap, this.clock, this.tagLayer, this.strip]) x.style.opacity = '0';
      if (k === 'intro') { for (const x of [this.top, this.strip]) x.style.opacity = String(1 - o); }
      return;
    }
    this.card.style.opacity = '0';
    this.tagLayer.style.opacity = '1';
    const u = smooth((fr.vt - this.repStart[fr.rep]) / 0.35);
    this.top.style.opacity = String(u); this.top.style.transform = `translateY(${(1 - u) * -30}px)`;
    const ms = this.mode.querySelector('span');
    if (fr.freeze) { ms.className = 'fz'; ms.textContent = '❚❚  FREEZE'; this.mode.style.opacity = '1'; }
    else if (fr.rate < 0.7) { ms.className = ''; ms.textContent = `SLOW-MO  ${fr.rate.toFixed(2).replace(/0$/, '')}×`; this.mode.style.opacity = '1'; }
    else this.mode.style.opacity = '0';
    // shot clock: running down with the possession, stopped at the release
    if (P.clock) {
      const sc = Math.max(0, P.clock - Math.min(st, P.release));
      this.clock.style.opacity = String(u);
      const n = this.clock.querySelector('.n'), txt = sc < 5 ? sc.toFixed(1) : String(Math.ceil(sc));
      if (n.textContent !== txt) n.textContent = txt;
      this.clock.classList.toggle('low', sc < 5);
    } else this.clock.style.opacity = '0';
    // his job right now, in the panel over the strip (held through the shot)
    const b = rep.balance(Math.min(st, P.release)), [txt, sub] = KIND[b.kind] || KIND.balanced;
    const pill = this.strip.querySelector('.pill'); pill.textContent = txt; pill.classList.toggle('open', GOOD.has(b.kind)); pill.classList.toggle('warn', WARN.has(b.kind));
    this.strip.querySelector('.sub').textContent = sub;
    if (fr.caption) {
      const text = fr.caption.replace(/\{(\w+)\.(\w+)\}/g, (m, rr, k) => (this.reps[rr] && this.reps[rr].plan.vals && this.reps[rr].plan.vals[k]) ?? m);
      const box = this.cap.querySelector('.box'); if (box.innerHTML !== text) box.innerHTML = text;
      // (live captions get out of the way of the ball going up)
      const o = smooth(e / 0.18) * smooth(r / 0.14) * (fr.freeze ? 1 : 1 - smooth((st - (P.release - 0.14)) / 0.1));
      this.cap.style.opacity = String(o); this.cap.style.transform = fr.freeze ? `scale(${1.06 - 0.06 * smooth(e / 0.25)})` : 'none';
    } else this.cap.style.opacity = '0';
    // timing strip: revealed up to the playhead
    const R = this.R[fr.rep];
    this.strip.style.opacity = '1';
    const x = clamp((st - R.a) / (R.b - R.a), 0, 1) * 960;
    Object.assign(this.strip.querySelector('.mask').style, { position: 'absolute', top: '0', bottom: '0', left: x + 'px', right: '0', background: 'rgba(28,30,38,0.93)', borderRadius: '0 4px 4px 0' });
    this.ph.style.left = x + 'px'; this.ph.style.opacity = st > R.b + 0.05 ? '0.35' : '1';
    for (const m of this.marks) m.e.style.opacity = String(smooth((st - m.t) / 0.06));
    // call-outs
    tags.forEach((t, i) => {
      const xEl = this.tag(i), sp = xEl.querySelector('span');
      if (sp.textContent !== t.text) sp.textContent = t.text;
      xEl.className = 'tag ' + (t.kind || '');
      Object.assign(xEl.style, { left: t.x.toFixed(1) + 'px', top: t.y.toFixed(1) + 'px', opacity: String(t.a), display: 'block' });
      xEl.style.transform = `translate(-50%, -100%) scale(${(0.85 + 0.15 * smooth(t.pop ?? 1)).toFixed(3)})`;
    });
    for (let i = tags.length; i < this.tags.length; i++) this.tags[i].style.display = 'none';
  }
}
