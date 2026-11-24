// v13 HUD (portrait): the play's name at the top as it starts (then out of the way), a play counter, and intro and
// outro cards. No captions, no meters: the plays run at full speed and speak for themselves.
import { smooth } from './motion.js';
import { REP_TITLES } from './timeline13.js';

const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };

export class Hud13 {
  constructor(root, reps, frames, fps) {
    this.root = root; this.frames = frames; this.fps = fps;
    root.innerHTML = '';
    this.top = el('div', 'top', '<div class="kick">GAME SPEED</div><div class="title"><span></span></div>'); root.appendChild(this.top);
    this.count = el('div', 'count'); root.appendChild(this.count);
    this.card = el('div', 'card'); root.appendChild(this.card);
    this.order = Object.keys(REP_TITLES);
    this.seg = {}; this.repStart = {};
    frames.forEach((f) => { const s = this.seg[f.seg] || (this.seg[f.seg] = { v0: f.vt, v1: f.vt }); s.v1 = f.vt + 1 / fps; if (!f.card && this.repStart[f.rep] === undefined) this.repStart[f.rep] = f.vt; });
  }
  update(fr) {
    const S = this.seg[fr.seg], e = fr.vt - S.v0;
    if (fr.card) {
      if (this.cardKind !== fr.card) {
        this.cardKind = fr.card;
        this.card.innerHTML = fr.card === 'intro'
          ? `<div class="k">FULL SPEED · ONE TAKE</div><div class="h">GAME<br>SPEED</div><div class="s">Four plays, start to finish,<br>no cuts and no slow motion.</div>
             <div class="list">${this.order.map((n, i) => `<div>${i + 1} · ${REP_TITLES[n]}</div>`).join('')}</div>`
          : `<div class="big">Real moves.</div><div class="big" style="margin-top:30px">Real <em>speed.</em></div><div class="big" style="margin-top:30px">Every one <em>in.</em></div>
             <div class="src">Motion: CMU Graphics Lab Motion Capture Database (subjects 6, 78 and 124: dribbling, offensive moves, jump shot, layup), played at the
             speed it was captured · Ball: thrown from the release point on a real arc, off the glass on the layup · Bones: OpenSim full-body model (Rajagopal et al. 2016)</div>`;
      }
      const o = fr.card === 'intro' ? 1 - smooth((e - (S.v1 - S.v0 - 0.3)) / 0.3) : smooth(e / 0.35);
      this.card.style.opacity = String(o);
      this.top.style.opacity = '0'; this.count.style.opacity = '0';
      return;
    }
    this.card.style.opacity = '0';
    if (this.repShown !== fr.rep) {
      this.repShown = fr.rep;
      this.top.querySelector('.title span').textContent = REP_TITLES[fr.rep];
      this.count.textContent = `${this.order.indexOf(fr.rep) + 1} / ${this.order.length}`;
    }
    // the name slides in as the play starts and gets out of the way once it's moving
    const t = fr.vt - this.repStart[fr.rep], u = smooth(t / 0.3) * (1 - smooth((t - 1.9) / 0.4));
    this.top.style.opacity = String(u); this.top.style.transform = `translateY(${(1 - smooth(t / 0.3)) * -30}px)`;
    this.count.style.opacity = String(0.85 * smooth(t / 0.3));
  }
}
