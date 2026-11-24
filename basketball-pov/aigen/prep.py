"""Frames and sound of each generated rep, ready for the film page (aigen/film.html).

  python3 aigen/prep.py open square

gen/<rep>.mp4 ->
  work/<rep>/o_00001.jpg ...  every frame of the clip, scaled to cover 1080x1920 (lanczos)
  work/<rep>/m_00001.jpg ...  the same at twice the frame rate, the in-between frames motion-interpolated, for 0.5x slow motion
  work/<rep>/audio.wav        its sound, 48 kHz stereo (if the clip has any)
  work/<rep>/frames.json      {fps, n, n2, dur, audio}
"""
import argparse
import json
import os
import pathlib
import shutil
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
GEN = HERE / os.environ.get('AIGEN_GEN', 'gen')
WORK = HERE / os.environ.get('AIGEN_WORK', 'work')
SCALE = 'scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920'


def probe(src):
    out = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(src)]))
    v = next(s for s in out['streams'] if s['codec_type'] == 'video')
    num, den = map(int, v['r_frame_rate'].split('/'))
    return num / den, any(s['codec_type'] == 'audio' for s in out['streams'])


def ff(*args):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)


def prep(rep):
    src, out = GEN / f'{rep}.mp4', WORK / rep
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    fps, audio = probe(src)
    ff('-i', str(src), '-vf', SCALE, '-q:v', '2', str(out / 'o_%05d.jpg'))
    ff('-i', str(src), '-vf', f'minterpolate=fps={2 * fps:g}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,{SCALE}', '-q:v', '2',
       str(out / 'm_%05d.jpg'))
    if audio:
        ff('-i', str(src), '-vn', '-ac', '2', '-ar', '48000', str(out / 'audio.wav'))
    n, n2 = len(list(out.glob('o_*.jpg'))), len(list(out.glob('m_*.jpg')))
    meta = {'fps': fps, 'n': n, 'n2': n2, 'dur': n / fps, 'audio': audio}
    (out / 'frames.json').write_text(json.dumps(meta))
    print(rep, meta)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('reps', nargs='+')
    for rep in ap.parse_args().reps:
        prep(rep)
