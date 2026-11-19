"""AI pose tracking of a generated clip: the players (whole-body keypoints), the ball and the camera, frame by frame.

  python3 aigen/track.py <clip.mp4> <workdir> [--players 2]

Pass 1 (slow, cached in <workdir>/detect.pkl): YOLO11x-seg finds the people (with masks) and the ball in every frame;
RTMW reads each person's whole-body pose inside his box - 133 keypoints: body, feet, face and both hands.
Pass 2: the players are followed through the clip by position, pose and jersey colour; left/right limb swaps are
undone; outliers dropped, short gaps filled, everything smoothed. The camera is followed on the background (a
similarity per frame), and the empty court is rebuilt from the frames with the players masked out (a median), so
the players can be drawn back in as skeletons. Writes <workdir>/track.json and <workdir>/plate.png.
"""
import argparse
import json
import pathlib
import pickle
import time

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d, median_filter
from scipy.optimize import linear_sum_assignment

YOLO_W = '/root/.cache/aigen/yolo11x-seg.pt'
RTMW_W = str(pathlib.Path.home() / '.cache/rtmlib/hub/checkpoints/rtmw-dw-x-l_simcc-cocktail14_270e-384x288_20231122.onnx')
RTMW_URL = 'https://download.openmmlab.com/mmpose/v1/projects/rtmw/onnx_sdk/rtmw-dw-x-l_simcc-cocktail14_270e-384x288_20231122.zip'

# COCO-WholeBody: 0-16 body, 17-22 feet, 23-90 face, 91-111 left hand, 112-132 right hand
L_SH, R_SH, L_EL, R_EL, L_WR, R_WR, L_HIP, R_HIP, L_KN, R_KN, L_AN, R_AN = 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
LEG = ([L_KN, L_AN, 17, 18, 19], [R_KN, R_AN, 20, 21, 22])
ARM = ([L_EL, L_WR] + list(range(91, 112)), [R_EL, R_WR] + list(range(112, 133)))
HIPS, SHOULDERS = ([L_HIP], [R_HIP]), ([L_SH], [R_SH])
KP_OK = 2.0     # RTMW's SimCC scores run ~0-10: below this a keypoint is a guess


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# ---------------------------------------------------------------- pass 1: detection
def torso_colour(img, lab, mask, kp, sc):
    """Mean Lab colour of the jersey: the person's mask inside the torso (shoulders to hips), pulled in a little."""
    P = kp[[L_SH, R_SH, R_HIP, L_HIP]]
    c = P.mean(0)
    h = np.linalg.norm(P[:2].mean(0) - P[2:].mean(0))
    poly = c + (P - c) * 0.7
    m = np.zeros(mask.shape, np.uint8)
    if np.linalg.norm(P[0] - P[1]) < 0.25 * h:   # side-on: a strip along the spine instead
        a, b = P[:2].mean(0), P[2:].mean(0)
        n = np.array([-(b - a)[1], (b - a)[0]]) / (np.linalg.norm(b - a) + 1e-6) * 0.12 * h
        poly = np.array([a + n, a - n, b - n, b + n])
    cv2.fillPoly(m, [poly.astype(np.int32)], 1)
    sel = (m > 0) & mask
    if sel.sum() < 30:
        return None
    return lab[sel].mean(0).tolist()


def detect(video, out):
    from ultralytics import YOLO
    from rtmlib import RTMPose
    if not pathlib.Path(RTMW_W).exists():
        from rtmlib.tools.file import download_checkpoint
        download_checkpoint(RTMW_URL)
    seg = YOLO(YOLO_W)
    pose = RTMPose(RTMW_W, model_input_size=(288, 384))
    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS)
    W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frames, masks, t0 = [], [], time.time()
    while True:
        ok, img = cap.read()
        if not ok:
            break
        r = seg.predict(img, imgsz=1280, conf=0.05, classes=[0, 32], retina_masks=True, verbose=False)[0]
        cls = r.boxes.cls.cpu().numpy().astype(int)
        conf = r.boxes.conf.cpu().numpy()
        xyxy = r.boxes.xyxy.cpu().numpy()
        mk = r.masks.data.cpu().numpy() > 0.5 if r.masks is not None else np.zeros((0, H, W), bool)
        people = [i for i in range(len(cls)) if cls[i] == 0 and conf[i] > 0.25]
        union = np.zeros((H, W), bool)
        for i in people:
            union |= mk[i]
        F = {'people': [], 'balls': []}
        if people:
            kp, sc = pose(img, bboxes=[xyxy[i] for i in people])
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
            for j, i in enumerate(people):
                F['people'].append({'box': xyxy[i].tolist(), 'conf': float(conf[i]), 'kp': kp[j].astype(np.float32),
                                    'sc': sc[j].astype(np.float32), 'col': torso_colour(img, lab, mk[i], kp[j], sc[j]),
                                    'area': float(mk[i].sum())})
        for i in range(len(cls)):
            if cls[i] == 32:
                x1, y1, x2, y2 = xyxy[i]
                F['balls'].append([float((x1 + x2) / 2), float((y1 + y2) / 2), float((x2 - x1 + y2 - y1) / 4), float(conf[i])])
        frames.append(F)
        masks.append(np.packbits(union, axis=None))
        if len(frames) % 24 == 0:
            log(f'  detect {len(frames)} frames, {(time.time() - t0) / len(frames):.2f} s/frame')
    pickle.dump({'fps': fps, 'W': W, 'H': H, 'frames': frames, 'masks': masks}, open(out, 'wb'))
    return pickle.load(open(out, 'rb'))


def unpack(m, W, H):
    return np.unpackbits(m, count=W * H).reshape(H, W).astype(bool)


# ---------------------------------------------------------------- camera
def follow_camera(video, D, step=1):
    """A[t]: frame t -> frame 0 (3x3, similarity), from background corners tracked frame to frame."""
    W, H = D['W'], D['H']
    cap = cv2.VideoCapture(str(video))
    A = [np.eye(3)]
    prev = None
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))
    t = 0
    while True:
        ok, img = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        fg = cv2.dilate(unpack(D['masks'][t], W, H).astype(np.uint8), k)
        for b in D['frames'][t]['balls']:
            cv2.circle(fg, (int(b[0]), int(b[1])), int(b[2] * 2 + 6), 1, -1)
        bg = (fg == 0).astype(np.uint8) * 255
        if prev is not None:
            pg, pbg = prev
            pts = cv2.goodFeaturesToTrack(pg, maxCorners=900, qualityLevel=0.005, minDistance=7, mask=pbg)
            M = None
            if pts is not None and len(pts) > 20:
                nxt, st, _ = cv2.calcOpticalFlowPyrLK(pg, g, pts, None, winSize=(21, 21), maxLevel=3)
                ok_ = st.ravel() == 1
                p0, p1 = pts[ok_].reshape(-1, 2), nxt[ok_].reshape(-1, 2)
                inside = (p1[:, 0] >= 0) & (p1[:, 0] < W) & (p1[:, 1] >= 0) & (p1[:, 1] < H)
                p0, p1 = p0[inside], p1[inside]
                keep = bg[p1[:, 1].astype(int), p1[:, 0].astype(int)] > 0
                p0, p1 = p0[keep], p1[keep]
                if len(p0) > 15:
                    if np.median(np.linalg.norm(p1 - p0, axis=1)) < 0.12:
                        M = np.eye(3)
                    else:
                        m, inl = cv2.estimateAffinePartial2D(p1, p0, method=cv2.RANSAC, ransacReprojThreshold=1.2)
                        if m is not None and inl.sum() > 12:
                            M = np.vstack([m, [0, 0, 1]])
            A.append(A[-1] @ (M if M is not None else np.eye(3)))
        prev = (g, bg)
        t += 1
    return A[:t]


def sim_params(A):
    s = np.hypot(A[0, 0], A[1, 0])
    return np.array([A[0, 2], A[1, 2], np.log(s), np.arctan2(A[1, 0], A[0, 0])])


def sim_from(p):
    s, a = np.exp(p[2]), p[3]
    return np.array([[s * np.cos(a), -s * np.sin(a), p[0]], [s * np.sin(a), s * np.cos(a), p[1]], [0, 0, 1]])


# ---------------------------------------------------------------- players
def associate(D, nplayers):
    """Follow the main players: per frame, the candidates (the biggest people) are matched to the tracks by where
    they should be (constant velocity), their pose and their jersey colour (Hungarian); a track with no good match
    that frame is left empty (hidden behind the other)."""
    n = len(D['frames'])
    KP = np.full((nplayers, n, 133, 2), np.nan, np.float32)
    SC = np.zeros((nplayers, n, 133), np.float32)
    BOX = np.full((nplayers, n, 4), np.nan, np.float32)
    tracks = None
    for t, F in enumerate(D['frames']):
        ppl = sorted(F['people'], key=lambda p: -p['area'])
        if not ppl:
            continue
        ppl = [p for p in ppl[:nplayers + 2] if p['area'] > 0.2 * ppl[0]['area']]
        if tracks is None:
            if len(ppl) < nplayers:
                continue
            tracks = []
            for k, p in enumerate(ppl[:nplayers]):
                tracks.append({'kp': p['kp'], 'sc': p['sc'], 'vel': np.zeros(2), 'col': np.array(p['col'] or [128, 128, 128], float),
                               'h': p['box'][3] - p['box'][1], 'last': t})
        C = np.full((nplayers, len(ppl)), 1e6)
        for i, T in enumerate(tracks):
            dt = t - T['last']
            pred = T['kp'] + T['vel'] * min(dt, 4)
            for j, p in enumerate(ppl):
                ok = (p['sc'][:23] > KP_OK) & (T['sc'][:23] > KP_OK)
                if ok.sum() < 4:
                    ok = np.ones(23, bool)
                dk = np.median(np.linalg.norm(p['kp'][:23][ok] - pred[:23][ok], axis=1)) / max(T['h'], 1)
                dc = np.linalg.norm(np.array(p['col']) - T['col']) / 40 if p['col'] is not None else 0.5
                C[i, j] = dk * 3 + dc * 0.6 + (dt - 1) * 0.02
        ri, cj = linear_sum_assignment(C)
        for i, j in zip(ri, cj):
            if C[i, j] > 2.5:
                continue
            p, T = ppl[j], tracks[i]
            dt = t - T['last']
            hip = lambda kp: kp[[L_HIP, R_HIP]].mean(0)
            v = (hip(p['kp']) - hip(T['kp'])) / max(dt, 1)
            T.update(vel=0.6 * v + 0.4 * T['vel'], kp=p['kp'], sc=p['sc'], h=0.8 * T['h'] + 0.2 * (p['box'][3] - p['box'][1]), last=t)
            if p['col'] is not None:
                T['col'] = 0.95 * T['col'] + 0.05 * np.array(p['col'])
            KP[i, t], SC[i, t], BOX[i, t] = p['kp'], p['sc'], p['box']
    cols = [T['col'].tolist() for T in tracks]
    return KP, SC, BOX, cols


def unswap(KP, SC):
    """Pose models swap left and right limbs now and then (side-on, legs crossing): compare each limb pair with
    where both were a frame ago, and swap back when the crossed pairing fits much better."""
    n = KP.shape[0]
    for pairs in (LEG, ARM, HIPS, SHOULDERS):
        L, R = pairs
        d = [L[0], R[0]]
        ref = None
        for t in range(n):
            cur = KP[t]
            if np.isnan(cur[d]).any():
                continue
            if ref is not None:
                same = np.linalg.norm(cur[L[0]] - ref[0]) + np.linalg.norm(cur[R[0]] - ref[1])
                swap = np.linalg.norm(cur[L[0]] - ref[1]) + np.linalg.norm(cur[R[0]] - ref[0])
                if len(L) > 1:
                    same += np.linalg.norm(cur[L[1]] - ref[2]) + np.linalg.norm(cur[R[1]] - ref[3])
                    swap += np.linalg.norm(cur[L[1]] - ref[3]) + np.linalg.norm(cur[R[1]] - ref[2])
                if swap < 0.55 * same:
                    KP[t, L], KP[t, R] = KP[t, R].copy(), KP[t, L].copy()
                    SC[t, L], SC[t, R] = SC[t, R].copy(), SC[t, L].copy()
            ref = [KP[t, L[0]].copy(), KP[t, R[0]].copy()] + ([KP[t, L[1]].copy(), KP[t, R[1]].copy()] if len(L) > 1 else [])
    return KP, SC


def clean(KP, SC, height):
    """Per keypoint: drop guesses and outliers (far off a running median), fill gaps up to 10 frames, then a
    zero-lag Gaussian (lighter on hands and feet, which move fastest)."""
    n = KP.shape[0]
    out = np.full_like(KP, np.nan)
    sig = np.full(133, 1.2)
    sig[[L_WR, R_WR] + list(range(91, 133))] = 0.9
    sig[[L_AN, R_AN] + list(range(17, 23))] = 0.9
    sig[list(range(23, 91)) + [0, 1, 2, 3, 4]] = 1.6
    t = np.arange(n)
    for k in range(133):
        x = KP[:, k].copy()
        good = (SC[:, k] > (1.2 if k < 23 else KP_OK)) & ~np.isnan(x).any(1)
        if good.sum() < 3:
            continue
        for c in range(2):
            v = x[:, c].copy()
            v[~good] = np.interp(t[~good], t[good], v[good])
            med = median_filter(v, size=5, mode='nearest')
            bad = np.abs(v - med) > 0.06 * height
            g2 = good & ~bad
            v[~g2] = np.interp(t[~g2], t[g2], v[g2]) if g2.sum() > 2 else v[~g2]
            out[:, k, c] = gaussian_filter1d(v, sig[k], mode='nearest')
        # (a gap longer than 10 frames, or before the first / after the last sighting, stays empty)
        gaps = ~good
        start = None
        for i in range(n + 1):
            if i < n and gaps[i]:
                start = i if start is None else start
            elif start is not None:
                if start == 0 or i == n or i - start > 10:
                    out[start:i, k] = np.nan
                start = None
    return out


# ---------------------------------------------------------------- ball
def ball_track(D, KP, height):
    """The ball through the clip: a constant-velocity gate picks it among the detections; short gaps filled."""
    n = len(D['frames'])
    B = np.full((n, 4), np.nan)
    best = max(range(n), key=lambda t: max([b[3] for b in D['frames'][t]['balls']] or [0]))
    if not D['frames'][best]['balls']:
        return B

    def run(order):
        last, vel, miss = None, np.zeros(2), 0
        for t in order:
            cands = D['frames'][t]['balls']
            pick = None
            if last is not None:
                pred = last[:2] + vel * (miss + 1)
                gate = 0.12 * height + 0.05 * height * miss
                ds = [(np.hypot(b[0] - pred[0], b[1] - pred[1]), b) for b in cands]
                ds = [d for d in ds if d[0] < gate and d[1][3] > 0.08]
                if ds:
                    pick = min(ds, key=lambda d: d[0] - 40 * d[1][3])[1]
            if pick is None and cands:
                b = max(cands, key=lambda b: b[3])
                if b[3] > 0.45 and (last is None or miss > 6):
                    pick = b
            if pick is not None:
                if last is not None:
                    vel = 0.5 * vel + 0.5 * (np.array(pick[:2]) - last[:2]) / (miss + 1)
                last, miss = np.array(pick), 0
                if np.isnan(B[t, 0]):
                    B[t] = pick
            else:
                miss += 1
    run(range(best, n))
    run(range(best, -1, -1))
    t = np.arange(n)
    good = ~np.isnan(B[:, 0])
    if good.sum() > 2:
        rr = np.interp(t, t[good], B[good, 2])
        B[:, 2] = gaussian_filter1d(median_filter(rr, size=9, mode='nearest'), 3)
        for c in range(2):
            v = np.interp(t, t[good], B[good, c])
            B[:, c] = v
        gap = np.zeros(n, int)
        last = -100
        for i in range(n):
            last = i if good[i] else last
            gap[i] = i - last
        nxt = n + 100
        for i in range(n - 1, -1, -1):
            nxt = i if good[i] else nxt
            gap[i] = min(gap[i], nxt - i) if not good[i] else 0
        B[(gap > 8) | (t < t[good][0]) | (t > t[good][-1]), :3] = np.nan
        B[:, 3] = np.where(good, B[:, 3], 0)
    return B


# ---------------------------------------------------------------- plate
def plate(video, D, A, size, every):
    """The empty court: every frame (a sample of them) laid into the plate's coordinates with the people and the
    ball masked out (dilated; their shadows too), and the median of what's left at each pixel."""
    W, H = D['W'], D['H']
    Wm, Hm = size
    cap = cv2.VideoCapture(str(video))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    stack, valid = [], []
    t = 0
    while True:
        ok, img = cap.read()
        if not ok:
            break
        if t % every == 0:
            fg = unpack(D['masks'][t], W, H).astype(np.uint8)
            for p in D['frames'][t]['people']:
                x1, y1, x2, y2 = p['box']
                h = y2 - y1
                cv2.rectangle(fg, (int(x1 - 0.1 * h), int(y2 - 0.08 * h)), (int(x2 + 0.1 * h), int(y2 + 0.07 * h)), 1, -1)
            for b in D['frames'][t]['balls']:
                if b[3] > 0.1:
                    cv2.circle(fg, (int(b[0]), int(b[1])), int(b[2] * 1.6 + 8), 1, -1)
            fg = cv2.dilate(fg, k)
            M = A[t][:2]
            stack.append(cv2.warpAffine(img, M, (Wm, Hm), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT))
            v = cv2.warpAffine((1 - fg).astype(np.uint8), M, (Wm, Hm), flags=cv2.INTER_NEAREST, borderValue=0)
            v = cv2.erode(v, np.ones((5, 5), np.uint8))
            valid.append(v.astype(bool))
        t += 1
    S, V = np.stack(stack), np.stack(valid)
    out = np.zeros((Hm, Wm, 3), np.uint8)
    for y0 in range(0, Hm, 48):
        s = S[:, y0:y0 + 48].astype(np.float32)
        s[~V[:, y0:y0 + 48]] = np.nan
        with np.errstate(all='ignore'):
            m = np.nanmedian(s, axis=0)
        out[y0:y0 + 48] = np.nan_to_num(m, nan=0).clip(0, 255).astype(np.uint8)
    hole = (V.sum(0) == 0).astype(np.uint8)
    if hole.any():
        out = cv2.inpaint(out, cv2.dilate(hole, np.ones((3, 3), np.uint8)), 6, cv2.INPAINT_TELEA)
    return out, hole


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('work')
    ap.add_argument('--players', type=int, default=2)
    a = ap.parse_args()
    work = pathlib.Path(a.work)
    work.mkdir(parents=True, exist_ok=True)
    det = work / 'detect.pkl'
    if det.exists():
        D = pickle.load(open(det, 'rb'))
    else:
        log('detecting', a.video)
        D = detect(a.video, det)
    n, W, H, fps = len(D['frames']), D['W'], D['H'], D['fps']
    log(f'{n} frames {W}x{H} @ {fps:.3f}')

    log('camera')
    A = follow_camera(a.video, D)
    # (plate coordinates: frame 0's, shifted so every frame lands inside)
    corners = np.array([[0, 0, 1], [W, 0, 1], [W, H, 1], [0, H, 1]], float).T
    pts = np.concatenate([(M @ corners)[:2].T for M in A])
    lo, hi = np.floor(pts.min(0)), np.ceil(pts.max(0))
    O = np.array([[1, 0, -lo[0]], [0, 1, -lo[1]], [0, 0, 1]])
    A = [O @ M for M in A]
    size = (int(hi[0] - lo[0]), int(hi[1] - lo[1]))
    P = gaussian_filter1d(np.array([sim_params(M) for M in A]), 2.0, axis=0, mode='nearest')
    cam = [np.linalg.inv(sim_from(p))[:2].ravel().round(5).tolist() for p in P]   # plate -> frame
    moved = np.abs(P - P[0]).max(0)
    log(f'camera: plate {size}, moves up to {moved[0]:.1f}/{moved[1]:.1f} px, zoom {np.exp(moved[2]):.3f}')

    log('players')
    KP, SC, BOX, cols = associate(D, a.players)
    height = np.nanmedian(BOX[..., 3] - BOX[..., 1])
    players = []
    for i in range(a.players):
        kp, sc = unswap(KP[i], SC[i])
        kp = clean(kp, sc, height)
        # (into plate coordinates)
        ok = ~np.isnan(kp[..., 0])
        for t in range(n):
            M = A[t]
            kp[t, ok[t]] = kp[t, ok[t]] @ M[:2, :2].T + M[:2, 2]
        seen = int((~np.isnan(KP[i, :, L_HIP, 0])).sum())
        players.append({'id': i, 'colour_lab': [round(c, 1) for c in cols[i]], 'seen': seen,
                        'kp': np.round(np.nan_to_num(kp, nan=-1), 1).tolist(), 'score': np.round(sc, 2).tolist()})
        log(f'  player {i}: seen in {seen}/{n} frames, jersey Lab {np.round(cols[i], 0)}')

    log('ball')
    B = ball_track(D, KP, height)
    ok = ~np.isnan(B[:, 0])
    for t in np.where(ok)[0]:
        M = A[t]
        B[t, :2] = M[:2, :2] @ B[t, :2] + M[:2, 2]
        B[t, 2] *= np.hypot(M[0, 0], M[1, 0])
    log(f'  ball in {int(ok.sum())}/{n} frames ({int((B[:, 3] > 0).sum())} detected, the rest filled)')

    # who has it: the player whose hands are nearest the ball over the first second
    near = []
    for p in players:
        kp = np.array(p['kp'])
        d = []
        for t in range(min(n, int(fps * 1.5))):
            if ok[t] and kp[t, L_WR, 0] > 0:
                d.append(min(np.linalg.norm(kp[t, L_WR] - B[t, :2]), np.linalg.norm(kp[t, R_WR] - B[t, :2])))
        near.append(np.median(d) if d else 1e9)
    handler = int(np.argmin(near))
    for p in players:
        p['role'] = 'offense' if p['id'] == handler else 'defense'

    log('plate')
    every = max(1, n // 90)
    img, hole = plate(a.video, D, A, size, every)
    cv2.imwrite(str(work / 'plate.png'), img)
    log(f'  plate {size}, {int(hole.sum())} px never seen (inpainted)')

    json.dump({'video': str(a.video), 'fps': fps, 'n': n, 'frame': [W, H], 'plate': list(size), 'cam': cam,
               'players': players, 'ball': np.round(np.nan_to_num(B, nan=-1), 2).tolist()},
              open(work / 'track.json', 'w'))
    log('wrote', work / 'track.json')


if __name__ == '__main__':
    main()
