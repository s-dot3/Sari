// Two Moves Max on the Seedance footage: work/timeline.json (timeline.py) frame by frame, each frame the generated clip's
// own picture, under v20's film-room HUD: the rep title, the full speed / freeze / slow motion pill, the captions, the
// contact burst and the cards. The render protocol is the repo's usual one (tools/render.mjs): __ready, __frames,
// __fps, renderFrame(i).
const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

try {
  const work = new URLSearchParams(location.search).get('work') || 'work';
  const TL = await (await fetch(`${work}/timeline.json`)).json();
  const { fps, frames, segs, titles, kicker, cards, hits } = TL;
  const g = document.getElementById('bg').getContext('2d');
  g.imageSmoothingQuality = 'high';
  const root = document.getElementById('hud');
  const shade = el('div', 'shade'); root.appendChild(shade);
  const top = el('div', 'top', `<div class="kick">${kicker}</div><div class="title"><span></span></div>`); root.appendChild(top);
  const mode = el('div', 'mode', '<span></span>'); root.appendChild(mode);
  const cap = el('div', 'cap', '<div class="box"></div>'); root.appendChild(cap);
  const hit = el('div', 'hit', '<div class="ring"></div><div class="ring r2"></div><span>CONTACT</span>'); root.appendChild(hit);
  const card = el('div', 'card'); root.appendChild(card);

  // where each rep's first played (not card) frame is, for the title's slide-in
  const repStart = {};
  for (const s of segs) if (!s.card && repStart[s.rep] === undefined) repStart[s.rep] = s.vt0;

  const cache = new Map();
  const load = src => {
    if (!cache.has(src)) {
      const im = new Image(); im.src = src;
      cache.set(src, im.decode().then(() => im));
      if (cache.size > 48) cache.delete(cache.keys().next().value);
    }
    return cache.get(src);
  };

  let cardKind = null;
  window.renderFrame = async i => {
    const f = frames[i], S = segs[f.seg];
    g.drawImage(await load(f.src), 0, 0, 1080, 1920);
    const e = f.vt - S.vt0, r = S.vt1 - f.vt - 1 / fps; // seconds into this segment, and left of it

    // cards
    if (S.card) {
      if (cardKind !== S.card) { cardKind = S.card; card.innerHTML = cards[S.card] || ''; }
      const o = S.card === 'intro' ? 1 - smooth((e - (S.vt1 - S.vt0 - 0.4)) / 0.4) : smooth(e / 0.45);
      card.style.opacity = String(o);
      for (const x of [mode, cap, hit]) x.style.opacity = '0';
      top.style.opacity = String(S.card === 'intro' ? 1 - o : 0);
      shade.style.opacity = String(1 - o);
      top.querySelector('.title span').textContent = titles[f.rep] || '';
      return;
    }
    card.style.opacity = '0';
    shade.style.opacity = '1';

    // the rep title slides in as the rep starts
    top.querySelector('.title span').textContent = titles[f.rep] || '';
    const u = smooth((f.vt - repStart[f.rep]) / 0.35);
    top.style.opacity = String(u); top.style.transform = `translateY(${(1 - u) * -30}px)`;

    // full speed / freeze / slow motion
    const ms = mode.querySelector('span');
    if (S.rate === 0) { ms.className = 'fz'; ms.textContent = '❚❚  FREEZE'; mode.style.opacity = '1'; }
    else if (S.rate < 1) { ms.className = ''; ms.textContent = `SLOW-MO  ${S.rate}×`; mode.style.opacity = '1'; }
    else if (S.live) { ms.className = 'live'; ms.textContent = '▶  FULL SPEED'; mode.style.opacity = String(smooth(e / 0.2)); }
    else mode.style.opacity = '0';

    // caption: in, held, out with the segment; a freeze pops it in
    if (S.caption) {
      const box = cap.querySelector('.box'); if (box.innerHTML !== S.caption) box.innerHTML = S.caption;
      cap.classList.toggle('low', S.cap !== 'top');
      cap.style.opacity = String(smooth(e / 0.18) * smooth(r / 0.14));
      cap.style.transform = S.rate === 0 ? `scale(${1.06 - 0.06 * smooth(e / 0.25)})` : 'none';
    } else cap.style.opacity = '0';

    // contact burst at the bump: on the freeze that sits on it, or playing through it
    const H = hits[f.rep];
    const hu = !H ? -1 : S.rate === 0 ? (Math.abs(f.st - H.t) < 0.1 ? 0.55 : -1) : (f.st - H.t) / 0.4;
    if (hu >= 0 && hu <= 1) {
      Object.assign(hit.style, { left: H.x + 'px', top: H.y + 'px', opacity: String(1 - smooth((hu - 0.55) / 0.45)) });
      hit.querySelector('.ring').style.transform = `translate(-50%,-50%) scale(${0.35 + 1.1 * Math.sqrt(hu)})`;
      hit.querySelector('.r2').style.transform = `translate(-50%,-50%) scale(${0.2 + 0.8 * Math.sqrt(Math.max(0, hu - 0.12))})`;
      hit.querySelector('span').style.transform = `translate(-50%,0) scale(${1.25 - 0.25 * smooth(hu / 0.2)})`;
    } else hit.style.opacity = '0';
  };

  await document.fonts.ready;
  await load(frames[0].src);
  window.__fps = fps;
  window.__frames = frames.length;
  window.__ready = true;
} catch (err) {
  window.__error = String((err && err.stack) || err);
}
