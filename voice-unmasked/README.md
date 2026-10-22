# Voice Unmasked — 9:16 short (57s)

- `voice-unmasked.mp4` — finished cut: animated character, AI scratch voiceover, word-by-word captions, music, SFX. 1080×1920, 30fps, −14 LUFS.
- `voice-unmasked_record-your-own-VO.mp4` — same video with music + SFX only. Captions stay on screen as a teleprompter so you can record the voiceover yourself.

## Re-rendering (`source/`)

1. `make_vo.py` — Kokoro TTS (`am_puck`) → per-clip WAVs + `timeline.json` (word timings drive captions, lip-sync and every animation beat). Wrap it as `tl.js` (`window.TL = …;`).
2. `render.js` — Playwright/Chromium renders `index.html` + `anim.js` frame by frame into MP4 segments (`node render.js video out.mp4 <startFrame> <endFrame>`).
3. `audio.py` → `master.sh` — synthesized beat + SFX, ducked under the voice, limited and loudness-normalized.
