// Stills of a portrait page at given rep sim times, with a contact sheet: node tools/simstill.mjs <outPrefix> rep:st[:mode] ...
// (PAGE=src/index18.html by default; st may be a mark like @bite; Q is the page query, default half-res, one sub-frame)
import { startServer, openPage } from './harness.mjs';
import { execFileSync } from 'node:child_process';
const [,, out, ...shots] = process.argv;
const server = await startServer();
const { browser, page } = await openPage(server, process.env.PAGE || 'src/index18.html', process.env.Q || 'half&sub=1', { width: 1080, height: 1920 });
const files = [];
for (const s of shots) {
  const [rep, st, mode] = s.split(':');
  await page.evaluate(([r, t, m]) => window.renderSim(r, t.startsWith('@') ? t : +t, m || (window.reps[r].plan.drill ? 'side' : 'shot')), [rep, st, mode]);
  const f = `${out}_${rep}_${st.replace('@', 'at-')}.jpg`;
  await page.screenshot({ path: f, type: 'jpeg', quality: 82 }); files.push(f);
}
const log = await page.evaluate(() => Object.fromEntries(Object.entries(window.reps).map(([k, r]) => [k, { release: +r.plan.release.toFixed(3), takeoff: +(r.plan.takeoff ?? -1).toFixed(3), land: +(r.plan.land ?? -1).toFixed(3), rim: +r.plan.rim.toFixed(3), bounces: (r.flights || []).map(f => +f.tb.toFixed(2)) }])));
console.log(JSON.stringify(log));
await browser.close(); server.close();
execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
fs=sys.argv[2:]; ims=[Image.open(f).resize((360,640)) for f in fs]
cols=min(6,len(ims)); rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(360*cols,640*rows))
for i,(im,f) in enumerate(zip(ims,fs)):
    S.paste(im,((i%cols)*360,(i//cols)*640)); ImageDraw.Draw(S).text(((i%cols)*360+5,(i//cols)*640+5), f.rsplit('/',1)[-1], fill=(255,255,0))
S.save(sys.argv[1])`, `${out}_sheet.jpg`, ...files]);
console.log('sheet', `${out}_sheet.jpg`);
