// v16 tracks without a browser: builds the reps from the mocap JSON and prints each player's footwork log, where
// everyone is at the marked moments, and the closest any two players come (hips) - to catch collisions before
// rendering.
// usage: node tools/plan16.mjs [rep ...]
import fs from 'node:fs';
import path from 'node:path';
import { setClipSource, loadClip } from '../src/mocap.js';
import { CLIPS16, REPS, buildRep, LEGS } from '../src/play16.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
setClipSource(async (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/mocap/json', name + '.json'), 'utf8')));
const clips = {}; for (const c of CLIPS16) clips[c] = await loadClip(c);
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(REPS);
const f2 = (p) => `(${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
for (const name of names) {
  const T = buildRep(name, clips, LEGS), P = REPS[name].plan;
  console.log(`\n=== ${name}  simEnd ${REPS[name].simEnd}`);
  for (const l of T.log || []) console.log('  ' + l);
  const who = T.players; // name -> track
  const marks = Object.entries(P.marks || {}).sort((a, b) => a[1] - b[1]);
  for (const [k, t] of [['start', 0], ...marks]) console.log(`  @${k} ${t.toFixed(2)}: ` + Object.entries(who).map(([n, tr]) => `${n} ${f2(tr.hip(t))}`).join('  '));
  // closest approach per pair
  const keys = Object.keys(who), end = REPS[name].simEnd;
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    let best = { d: 1e9, t: 0 };
    for (let t = 0; t <= end; t += 0.05) { const a = who[keys[i]].hip(t), b = who[keys[j]].hip(t), d = Math.hypot(a.x - b.x, a.z - b.z); if (d < best.d) best = { d, t }; }
    if (best.d < 0.9) console.log(`  close: ${keys[i]}-${keys[j]} ${best.d.toFixed(2)} m at ${best.t.toFixed(2)}`);
  }
  if (P.release !== undefined) console.log(`  release ${P.release.toFixed(2)}`);
}
