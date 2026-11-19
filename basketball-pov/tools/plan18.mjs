// v18 tracks without a browser (from tools/plan16.mjs): builds the reps from the mocap JSON and prints each player's footwork log, where
// everyone is at the marked moments, and the closest any two players come (hips) - to catch collisions before
// rendering.
// usage: node tools/plan18.mjs [rep ...]
import fs from 'node:fs';
import path from 'node:path';
import { setClipSource, loadClip } from '../src/mocap.js';
import { CLIPS18 as CLIPS16, REPS, buildRep } from '../src/play18.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
setClipSource(async (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/mocap/json', name + '.json'), 'utf8')));
const LEGS = { you: 0.934, d1: 0.9386 };
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
// (the shooter's facing against the line to his man, through each rep: the moves should happen square to him)
for (const name of names) {
  const T = buildRep(name, clips, LEGS); if (!T.players.d1) continue;
  const rows = [];
  for (let t = 0; t <= REPS[name].simEnd - 1.4; t += 0.25) {
    const y = T.you.hip(t), d = T.d1.hip(t), yaw = T.you.at(t).yaw, to = Math.atan2(d.x - y.x, d.z - y.z);
    let a = (yaw - to) * 180 / Math.PI; while (a > 180) a -= 360; while (a < -180) a += 360;
    rows.push(`${t.toFixed(2)}:${a.toFixed(0)}/${Math.hypot(d.x - y.x, d.z - y.z).toFixed(1)}`);
  }
  console.log(`${name} facing-vs-him (deg/m): ${rows.join(' ')}`);
}
