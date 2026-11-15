# Your Voice = 4 Things — 9:16 short (48s)

Explainer, no drills: what **energy**, **resonance**, **tone** and **rhythm** are, shown on real 3D human anatomy.

- `voice-four-things.mp4` — finished cut with AI scratch voiceover, word-by-word captions, music and SFX. 1080×1920, 30fps, −14 LUFS.
- `voice-four-things_record-your-own-VO.mp4` — same video with music + SFX only; captions stay on screen to read from.

| Part | What's on screen |
|---|---|
| Hook | 3D bust; ENERGY, RESONANCE, TONE, RHYTHM tagged on the body |
| Energy | Diaphragm drops, lungs fill, air rises up the windpipe; weak vs steady air |
| Resonance | Small buzz at the vocal cords, then throat, mouth and nose light up as the speakers |
| Tone | Looking down at the vocal cords: pressed, breathy, clean close, with matching waveforms |
| Rhythm | The narration's real word timing as a track (fast, slow, stress, pause) over a talking skull |
| Close | Fuel, speaker, color, timing → "that's your real voice" |

## Credit (required when you post)

The anatomy models come from BodyParts3D, licensed CC BY 4.0. The credit is burned into the video; also put it in the post caption:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

## Re-rendering (`source/`)

1. `make_vo2.py` — Kokoro TTS (`am_puck`) → per-part WAVs + `timeline.json`; wrap it as `tl.js` (`window.TL = …;`).
2. `build_mesh2.py` — merges BodyParts3D OBJ parts into `anatomy.bin` / `anatomy.json` (separate jaw and left/right vocal cords so they can move).
3. Serve `source/` over HTTP (`python3 -m http.server 8767`), put `three.module.js` (three@0.169.0) in `source/lib/`, then `node render.js video out.mp4 <startFrame> <endFrame>`. `anat.js` is the WebGL anatomy layer; `anim.js` draws titles, labels, captions and graphics.
4. `audio2.py` → `master.sh` — synthesized beat + SFX, ducked under the voice, limited and loudness-normalized.
