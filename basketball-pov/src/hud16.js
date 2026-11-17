// v16 HUD (portrait): the possession's title, slow-mo / freeze pill, coaching captions, call-outs pinned over the
// players ("SWITCH!", "SCREEN", "MISMATCH"...), the shot clock running down, and the intro and outro cards.
import { clamp, smooth } from './motion.js';
import { REP_TITLES } from './timeline16.js';

const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };

export class Hud16 {
  constructor(root, reps, frames, fps) {
    this.root = root; this.reps = reps; this.frames = frames; this.fps = fps;
    root.innerHTML = '';
    this.top = el('div', 'top', '<div class="kick">NO OPEN LOOKS</div><div class="title"><span></span></div>'); root.appendChild(this.top);
    this.mode = el('div', 'mode', '<span></span>'); root.appendChild(this.mode);
    this.cap = el('div', 'cap', '<div class="box"></div>'); root.appendChild(this.cap);
    this.clock = el('div', 'clock', '<div class="l">SHOT CLOCK</div><div class="n"></div>'); root.appendChild(this.clock);
    this.tagLayer = el('div', 'tags'); root.appendChild(this.tagLayer);
    this.card = el('div', 'card'); root.appendChild(this.card);
    this.tags = [];
    this.seg = {}; this.repStart = {};
    frames.forEach((f) => { const s = this.seg[f.seg] || (this.seg[f.seg] = { v0: f.vt, v1: f.vt }); s.v1 = f.vt + 1 / fps; if (!f.card && this.repStart[f.rep] === undefined) this.repStart[f.rep] = f.vt; });
  }
  tag(i) {
    while (this.tags.length <= i) { const e = el('div', 'tag', '<span></span>'); this.tagLayer.appendChild(e); this.tags.push(e); }
    return this.tags[i];
  }
  // fr: frame; st: sim time; tags: [{ x, y, text, kind, a }] on screen (already placed)
  update(fr, st, tags = []) {
    const rep = this.reps[fr.rep], P = rep.plan, S = this.seg[fr.seg], e = fr.vt - S.v0, r = S.v1 - fr.vt;
    if (fr.card) {
      const k = fr.card;
      if (this.cardKind !== k) {
        this.cardKind = k;
        this.card.innerHTML = k === 'intro'
          ? `<div class="k">FILM ROOM · TEAM DEFENCE</div><div class="h">NO OPEN<br>LOOKS</div><div class="s">Kill the action. Make them take a bad one.</div>
             <div class="list"><div>1 · Switch the ball screen</div><div>2 · Kill the pin-down</div><div>3 · No backdoor</div><div>4 · Scram the mismatch</div></div>
             <div class="key"><b class="r">Red</b> rings: the defence · <b>White</b>: the offence<br><b class="a">Gold</b> line: who's got who</div>`
          : `<div class="big">Talk early.<br><em>Switch on time.</em></div><div class="big" style="margin-top:46px">Every shot<br><em>contested.</em></div>
             <div class="src">Motion: CMU Graphics Lab Motion Capture Database · Players: Microsoft Rocketbox</div>`;
      }
      const o = k === 'intro' ? 1 - smooth((e - (S.v1 - S.v0 - 0.35)) / 0.35) : smooth(e / 0.4);
      this.card.style.opacity = String(o);
      for (const x of [this.top, this.mode, this.cap, this.clock, this.tagLayer]) x.style.opacity = '0';
      if (k === 'intro') this.top.style.opacity = '0';
      return;
    }
    this.card.style.opacity = '0';
    this.tagLayer.style.opacity = '1';
    const title = REP_TITLES[fr.rep];
    if (this.curTitle !== title) { this.curTitle = title; this.top.querySelector('.title span').textContent = title; }
    const u = smooth((fr.vt - this.repStart[fr.rep]) / 0.35);
    this.top.style.opacity = String(u); this.top.style.transform = `translateY(${(1 - u) * -30}px)`;
    const ms = this.mode.querySelector('span');
    if (fr.freeze) { ms.className = 'fz'; ms.textContent = '❚❚  FREEZE'; this.mode.style.opacity = '1'; }
    else if (fr.rate < 0.7) { ms.className = ''; ms.textContent = `SLOW-MO  ${fr.rate.toFixed(2).replace(/0$/, '')}×`; this.mode.style.opacity = '1'; }
    else this.mode.style.opacity = '0';
    // shot clock: running down with the possession, stopped at the release
    const sc = P.clock ? Math.max(0, P.clock - Math.min(st, P.release ?? st)) : null;
    if (sc !== null) {
      this.clock.style.opacity = String(u);
      const n = this.clock.querySelector('.n'), txt = sc < 5 ? sc.toFixed(1) : String(Math.ceil(sc));
      if (n.textContent !== txt) n.textContent = txt;
      this.clock.classList.toggle('low', sc < 5);
    } else this.clock.style.opacity = '0';
    if (fr.caption) {
      const text = fr.caption.replace(/\{(\w+)\.(\w+)\}/g, (m, rr, k) => (this.reps[rr] && this.reps[rr].plan.vals && this.reps[rr].plan.vals[k]) ?? m);
      const box = this.cap.querySelector('.box'); if (box.innerHTML !== text) box.innerHTML = text;
      const o = smooth(e / 0.18) * smooth(r / 0.14);
      this.cap.style.opacity = String(o); this.cap.style.transform = fr.freeze ? `scale(${1.06 - 0.06 * smooth(e / 0.25)})` : 'none';
    } else this.cap.style.opacity = '0';
    // call-outs
    tags.forEach((t, i) => {
      const x = this.tag(i), sp = x.querySelector('span');
      if (sp.textContent !== t.text) sp.textContent = t.text;
      x.className = 'tag ' + (t.kind || '');
      Object.assign(x.style, { left: t.x.toFixed(1) + 'px', top: t.y.toFixed(1) + 'px', opacity: String(t.a), display: 'block' });
      x.style.transform = `translate(-50%, -100%) scale(${(0.85 + 0.15 * smooth(t.pop ?? 1)).toFixed(3)})`;
    });
    for (let i = tags.length; i < this.tags.length; i++) this.tags[i].style.display = 'none';
  }
}
