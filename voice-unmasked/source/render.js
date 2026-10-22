// usage: node render.js preview out_dir f1 f2 ...   |   node render.js video out.mp4 startFrame endFrame [noCaps]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.waitForFunction(() => window.READY === true || window.__err, null, { timeout: 30000 }).catch(() => {});
  if (errs.length) { console.error('PAGE ERRORS:', errs.join('\n')); }
  if (mode === 'preview') {
    fs.mkdirSync(out, { recursive: true });
    for (const f of rest.map(Number)) {
      await page.evaluate(f => window.renderFrame(f), f);
      await page.screenshot({ path: path.join(out, `f${String(f).padStart(5, '0')}.png`) });
    }
  } else {
    const [a, b, noCaps] = rest; const s = +a, e = +b;
    if (noCaps === '1') await page.evaluate(() => { window.NO_CAPS = true; });
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = s; f < e; f++) {
      await page.evaluate(f => window.renderFrame(f), f);
      const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - s) % 100 === 0) console.log(`${out}: ${f - s}/${e - s} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  if (errs.length) console.error('ERRORS', errs.slice(0, 5));
  await browser.close();
})();
