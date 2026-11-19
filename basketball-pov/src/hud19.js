// v19 HUD (portrait), v16's: the possession's title, slow-mo / freeze pill, coaching captions, call-outs pinned over
// the players, and the panel at the bottom on the ball - what you're doing with it right now, over a strip of ball
// security through the possession, revealed as it plays: how close any defender's hand is to the ball (green: out of
// his reach; amber: close; red: he can get a hand on it), the closest he ever got marked on it - or, on a pass, how
// far it went by his hands. Plus intro and outro cards.
import { clamp, smooth } from './motion.js';
import { REP_TITLES } from './timeline19.js';

const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
const KIND = {
  attack: ['ATTACK', 'His lead foot - go by him close'],
  hip: ['HIP TO HIP', 'Shoulder past his hip: he\'s behind you'],
  shield: ['BALL OUTSIDE', 'Your body between him and it'],
  glass: ['OFF THE GLASS', 'Far hand from him, up soft'],
  help: ['THE HELP', 'Big stepping up at the rim'],
  spin: ['SPIN AWAY', 'Ball goes away from the help'],
  early: ['HE LEFT EARLY', 'No block till he lands'],
  twofeet: ['TWO FEET', 'Balance - up as he comes down'],
  set: ['HE\'S SET', 'Feet down: no way round him'],
  hit: ['HIT FIRST', 'Shoulder in his chest, ball high'],
  and1: ['AND-ONE', 'Up through the contact'],
  stop: ['JUMP STOP', 'Two feet: no charge, no travel'],
  commit: ['HE COMMITTED', 'Second foot in the paint'],
  kick: ['THE KICK', 'Behind him, away from his hands'],
  pocket: ['CATCH & SHOOT', 'In the pocket, straight up'],
};
const GOOD = new Set(['attack', 'hip', 'shield', 'glass', 'spin', 'early', 'twofeet', 'hit', 'and1', 'stop', 'commit', 'kick', 'pocket']), WARN = new Set(['help', 'set']);
const RED = [255, 59, 78], GREEN = [47, 227, 119], AMBER = [255, 194, 58];
const col = (open) => (open < 0.5 ? GREEN.map((g, i) => Math.round(g + (AMBER[i] - g) * open * 2)) : AMBER.map((a, i) => Math.round(a + (RED[i] - a) * (open - 0.5) * 2)));

export class Hud19 {
  constructor(root, reps, frames, fps) {
    this.root = root; this.reps = reps; this.frames = frames; this.fps = fps;
    root.innerHTML = '';
    this.top = el('div', 'top', '<div class="kick">DOWNHILL</div><div class="title"><span></span></div>'); root.appendChild(this.top);
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
      const P = rep.plan, a = Math.min(...frames.filter(f => f.rep === name && !f.card).map(f => f.st)), b = P.release + 0.02, S = P.sec;
      const at = (t) => S.d[Math.max(0, Math.min(S.d.length - 1, Math.round(t / S.dt)))];
      const cv = document.createElement('canvas'); cv.width = 960; cv.height = 34; const g = cv.getContext('2d');
      for (let x = 0; x < 960; x++) { const [r, gg, bb] = col(Math.min(1, Math.max(0, (0.6 - at(a + (x + 0.5) / 960 * (b - a))) / 0.45))); g.fillStyle = `rgb(${r},${gg},${bb})`; g.fillRect(x, 0, 1, 34); }
      // the mark: the closest his hand got (and when) - or, on a pass, how far it went by his hands
      let tm = a, dm = 9; for (let t = a; t <= b; t += S.dt) if (at(t) < dm) { dm = at(t); tm = t; }
      const mk = P.pass ? { t: (P.pass.t0 + P.pass.t1) / 2, label: `PASS · ${P.vals.lane} FT FROM HIS HANDS`, good: true }
        : { t: tm, label: `CLOSEST HAND · ${P.vals.close} FT`, good: dm > 0.3 };
      this.R[name] = { a, b, cv, marks: [mk] };
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
    this.strip.querySelector('.lbl').textContent = 'THE BALL';
    this.strip.querySelector('.legend').innerHTML = '<span><i style="background:var(--green)"></i>SAFE</span><span><i style="background:var(--red)"></i>IN HIS REACH</span>';
    for (const m of this.marks) m.e.remove();
    const bar = this.strip.querySelector('.bar');
    this.marks = R.marks.map(m => {
      const x = (m.t - R.a) / (R.b - R.a) * 960, e = el('div', 'mk', `<span>${m.label}</span>`);
      e.style.left = x + 'px';
      // (label centred on the mark, slid along so it stays over the strip at either end)
      e.querySelector('span').style.transform = `translateX(${x < 260 ? -Math.max(0, x - 8) : x > 700 ? -(520 - Math.max(0, 952 - x)) : -260}px)`;
      const good = m.good, s = e.querySelector('span');
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
          ? `<div class="k">FILM ROOM · ATTACK THE RIM</div><div class="h">DOWN&#8203;HILL</div><div class="s">Get there. Keep it. Finish it - or find him.</div>
             <div class="list"><div>1 · Hip to hip</div><div>2 · The crowd</div><div>3 · Hit first</div><div>4 · The kick</div></div>
             <div class="key">Ring on the floor = his feet · <b class="a">Gold</b>: defence · White: offence<br>Strip = how close his hands are to the ball<br><b class="g">Green</b>: out of his reach · <b class="r">Red</b>: he can get a hand on it</div>`
          : `<div class="big">Keep it<br><em>away from his hands.</em></div><div class="big" style="margin-top:56px">Finish<br><em>through him.</em></div>
             <div class="src">Ball handlers: real basketball mocap with the ball tracked - SkillMimic BallPlay-M (Wang et al., CVPR 2025)<br>Defence: CMU Graphics Lab Motion Capture Database · Reaction time: Singh 2020</div>`;
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
    const b = rep.balance(Math.min(st, P.release)), [txt, sub] = KIND[b.kind] || KIND.attack;
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
