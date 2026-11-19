// v15 at 30 fps, 8 s: one take. Real time through the dribbles and the stop; from just before he leaves the floor to
// just after the swish the clip eases down to 0.55x (a speed ramp, not a cut) and back up; it ends a beat after the
// ball is through. A short fade in and out.
export const FPS = 30, DUR = 8.0;
export const SEQ = [{ rep: 'snatch', cam: 'x', from: 0 }];
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

export function buildTimeMap(reps, fps = FPS) {
  const P = reps.snatch.plan, a = P.takeoff - 0.35, b = P.rim + 0.25;
  // playback rate against sim time: 1 outside [a, b], down to 0.55 inside, eased over 0.3 s at each end
  const rate = (st) => 1 - 0.45 * smooth((st - (a - 0.3)) / 0.3) * (1 - smooth((st - b) / 0.3));
  const frames = []; let st = 0;
  for (let i = 0; i < Math.round(DUR * fps); i++) {
    const r = rate(st);
    frames.push({ seg: 0, rep: 'snatch', cam: 'x', st, vt: i / fps, rate: r });
    // advance by one frame of video at this rate (midpoint step)
    st += rate(st + r / (2 * fps)) / fps;
  }
  SEQ[0].to = st;
  return frames;
}
