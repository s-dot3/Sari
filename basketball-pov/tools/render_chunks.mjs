// Render a page's timeline in chunks that survive a restart: each run of frames is its own MP4 in --dir (a chunk that
// is already there is skipped), and they are joined at the end - so a long render that gets cut off picks up where
// it stopped instead of starting over.
// usage: node tools/render_chunks.mjs --page src/index16.html --out out/x.mp4 --dir frames16 [--chunk 300]
//        [--step 1] [--workers 3] [--q ...] [--viewport WxH] [--size WxH] [--crf N]   (the rest go to tools/render.mjs)
import { startServer, openPage, ROOT } from './harness.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.reduce((a, v, i, arr) => (v.startsWith('--') ? a.push([v.slice(2), arr[i + 1]]) : 0, a), []));
const dir = path.resolve(ROOT, args.dir || 'frames_chunks'); fs.mkdirSync(dir, { recursive: true });
const chunk = +(args.chunk || 300), step = +(args.step || 1);
const [vw, vh] = (args.viewport || '1920x1080').split('x').map(Number);
const FF = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
// (how many frames: from the page itself)
const server = await startServer();
const probe = await openPage(server, args.page, args.q || '', { width: vw, height: vh });
const total = await probe.page.evaluate(() => window.__frames);
await probe.browser.close(); server.close();
const pass = []; for (const k of ['page', 'q', 'workers', 'viewport', 'size', 'crf', 'step']) if (args[k] !== undefined) pass.push('--' + k, args[k]);
const parts = [], t0 = Date.now();
for (let a = 0; a < total; a += chunk) {
  const b = Math.min(total, a + chunk), part = path.join(dir, `c_${String(a).padStart(5, '0')}.mp4`);
  parts.push(part);
  if (fs.existsSync(part) && fs.statSync(part).size > 1000) { console.log('have', path.basename(part)); continue; }
  const tmp = path.join(dir, 'tmp'), work = part + '.part.mp4';
  const r = spawnSync('node', [path.join(ROOT, 'tools/render.mjs'), ...pass, '--from', String(a), '--to', String(b), '--out', work, '--tmp', path.relative(ROOT, tmp)], { stdio: 'inherit', cwd: ROOT });
  if (r.status !== 0) { console.error('chunk failed', a, b); process.exit(1); }
  fs.renameSync(work, part);
  console.log(`chunk ${a}-${b} of ${total} done, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
const list = path.join(dir, 'list.txt');
fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
fs.mkdirSync(path.dirname(path.resolve(ROOT, args.out)), { recursive: true });
execFileSync(FF, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.resolve(ROOT, args.out)]);
console.log('wrote', args.out, total, 'frames');
