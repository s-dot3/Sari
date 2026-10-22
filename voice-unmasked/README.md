# Voice Unmasked — 9:16 short (57s)

- `voice-unmasked.mp4` — finished cut: real 3D anatomy for the hook and drills 1–3, cartoon host for drills 4–8, word-by-word captions, AI scratch voiceover, music, SFX. 1080×1920, 30fps, −14 LUFS.
- `voice-unmasked_record-your-own-VO.mp4` — same video with music + SFX only. Captions stay on screen as a teleprompter so you can record the voiceover yourself.

## Credit (required when you post)

The anatomy models come from BodyParts3D, licensed CC BY 4.0. The credit is burned into those scenes; also put it in the post caption:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

## Re-rendering (`source/`)

1. `make_vo.py` — Kokoro TTS (`am_puck`) → per-clip WAVs + `timeline.json` (word timings drive captions, lip-sync and every animation beat). Wrap it as `tl.js` (`window.TL = …;`).
2. `build_mesh.py` — merges the BodyParts3D OBJ parts (skull, larynx cartilages, vocal ligaments, airway, lungs, skin…) into `anatomy.bin` / `anatomy.json` (cm units, larynx at the origin).
3. Serve `source/` over HTTP (`python3 -m http.server 8766`), put `three.module.js` (three@0.169.0) in `source/lib/`, then `render.js` renders `index.html` frame by frame: `node render.js video out.mp4 <startFrame> <endFrame>`. `anat.js` draws the WebGL anatomy layer; `anim.js` draws titles, labels, captions and the host.
4. `audio.py` → `master.sh` — synthesized beat + SFX, ducked under the voice, limited and loudness-normalized.
