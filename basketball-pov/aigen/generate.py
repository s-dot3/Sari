"""Generate the film's footage with fal: the opening still (every rep starts from the same frame, so the players,
the court and the camera match), then each rep with Seedance 2.5 image-to-video.

  python3 aigen/generate.py still                # candidates -> aigen/gen/still_<i>.png
  python3 aigen/generate.py reps [--still 0] [rep ...]   # -> aigen/gen/<rep>.mp4
"""
import argparse
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import fal  # noqa: E402

GEN = HERE / 'gen'


def still(film):
    S = film['still']
    out = fal.run('still', S['endpoint'], S['args'], GEN)
    for i, im in enumerate(out['images']):
        p = GEN / f'still_{i}.png'
        if not p.exists():
            fal.download(im['url'], p)
        print(p, im.get('width'), im.get('height'))


def reps(film, pick, names):
    st = json.loads((GEN / 'still.result.json').read_text())['images'][pick]
    for name in names or film['reps']:
        R = film['reps'][name]
        args = {**R['args'], 'image_url': st['url']}
        out = fal.run(name, R['endpoint'], args, GEN)
        p = GEN / f'{name}.mp4'
        if not p.exists():
            fal.download(out['video']['url'], p)
        print(p, out.get('seed'))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('what', choices=['still', 'reps'])
    ap.add_argument('names', nargs='*')
    ap.add_argument('--still', type=int, default=0)
    a = ap.parse_args()
    film = json.loads((HERE / 'film.json').read_text())
    still(film) if a.what == 'still' else reps(film, a.still, a.names)
