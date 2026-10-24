// v15 "Snatch crossover": an X-ray skeleton alone on an arena floor at night - hard right-hand pound dribbles walking
// it up, the snatch back left in a low crossover, a dead stop on a 1-2, straight up with no drift, the jumper at the
// top, swish. Real takes (CMU mocap) at the speed they were played: 06_13's walk-up dribbles and its crossover at
// 3.5, cut where the poses match (tools/transit.py) into 124_05's 1-2, dip and rise - with the jump's drift taken
// out so it goes straight up.
// Court: rim at (0,0), offense attacks -z.
import { anchoredTrack, RIM } from './play5.js';
import { Track } from './animator.js';
import { findPushes } from './rep5.js';

export const CLIPS15 = ['06_13', '124_05', '78_30'];
const yawTo = (p, q) => Math.atan2(q.x - p.x, q.z - p.z);
const simOf = (sg, ct) => sg.at + (ct - sg.from) / (sg.rate ?? 1);
// 124_05's jump drifts ~0.35 m in the air; keep a tenth of it: straight up, straight down
const JUMP_STRAIGHT = { from: 3.15, to: 3.72, k: 0.1, ramp: 0.12 };

export const REPS = {
  snatch: {
    simEnd: 7.2,
    plan: { gatherDur: 0.2, shotClip: 3.38, flight: 1.2 },
    build(clips, legs) {
      const P = this.plan;
      // 06_13 from 0.35: the first dribble, then walking it up behind right-hand pounds and crossovers (0.8, 1.6),
      // the snatch back left at 3.5 - and on the way up from it into 124_05 (its own dribble just caught): the 1-2,
      // the dip at 3.0, takeoff 3.17, release 3.38
      const A = { clip: '06_13', from: 0.35, at: 0 };
      const tStop = simOf(A, 3.583);
      const B = { clip: '124_05', from: 2.733, at: tStop, inert: 0.3, shot: true, unwind: { from: 3.17, to: 3.72, ramp: 0.08 }, compress: JUMP_STRAIGHT };
      const pushes = findPushes(clips['06_13'], 2.8, 3.583), last = pushes[pushes.length - 1];
      P.hold = [0, 0.15]; P.dribble = [0.15, simOf(A, last.c1) + 0.02]; P.gatherAt = Math.max(simOf(A, last.c1) + 0.2, tStop - 0.02);
      const SPOT = { x: 0.6, z: 5.6 };
      const you = anchoredTrack(clips, [A, B], legs.you, simOf(B, 3.17), { ...SPOT, yaw: yawTo(SPOT, RIM) });
      // nobody guards him: the engine's second player stands in his stance far off the floor, never in the picture
      const d1 = new Track(clips, [{ clip: '78_30', from: 0.93, at: 0, idle: { amp: 0.1, period: 1.6 }, place: { x: 40, z: 40, yaw: 0 } }], legs.d1);
      return { you, d1 };
    },
  },
};

export function buildRep(name, clips, legs) { return REPS[name].build(clips, legs); }
