"""Contact sheet of a clip with each frame's time on it, for reading the beats (marks.json) by eye.

  python3 aigen/sheet.py <clip.mp4> <out.jpg> [--from 0] [--to 99] [--every 3] [--cols 6] [--width 400]
"""
import argparse

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('video')
ap.add_argument('out')
ap.add_argument('--from', dest='t0', type=float, default=0)
ap.add_argument('--to', dest='t1', type=float, default=1e9)
ap.add_argument('--every', type=int, default=3)
ap.add_argument('--cols', type=int, default=6)
ap.add_argument('--width', type=int, default=400)
a = ap.parse_args()
cap = cv2.VideoCapture(a.video)
fps = cap.get(cv2.CAP_PROP_FPS)
tiles, i = [], 0
while True:
    ok, img = cap.read()
    if not ok:
        break
    t = i / fps
    if a.t0 <= t <= a.t1 and i % a.every == 0:
        h = int(img.shape[0] * a.width / img.shape[1])
        im = cv2.resize(img, (a.width, h), interpolation=cv2.INTER_AREA)
        cv2.rectangle(im, (0, 0), (150, 26), (0, 0, 0), -1)
        cv2.putText(im, f'{t:5.2f}s #{i}', (4, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
        tiles.append(im)
    i += 1
if not tiles:
    raise SystemExit('no frames in range')
h, w = tiles[0].shape[:2]
rows = (len(tiles) + a.cols - 1) // a.cols
sheet = np.zeros((rows * h, a.cols * w, 3), np.uint8)
for k, im in enumerate(tiles):
    r, c = divmod(k, a.cols)
    sheet[r * h:(r + 1) * h, c * w:(c + 1) * w] = im
cv2.imwrite(a.out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])
print(a.out, len(tiles), 'frames', f'{fps:.3f} fps')
