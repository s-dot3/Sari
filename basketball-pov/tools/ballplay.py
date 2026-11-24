"""SkillMimic BallPlay-M basketball mocap (Apache-2.0, https://github.com/wyhuai/SkillMimic) -> our clip JSON.

The BallPlay-M sample is optical mocap of a player with the ball tracked (60 fps, Z-up): per frame the root, 52x3
joint angles, the world positions of the humanoid's 53 bodies (SMPL-X-like, with fingers), the ball's position and
rotation and a hand-ball contact flag. This writes the same JSON as tools/mocap.py (CMU joint names, meters, Y-up,
positions of the bone ends and world rotations relative to the T-pose for the bones the rig reads), plus the ball
track, so the rest of the pipeline can play these takes like the CMU ones.

The .pt files are read without torch and without unpickling anything but the tensor itself: a restricted unpickler
that only knows the tensor-rebuild call and the storage types, the raw storage read straight from the zip.

usage: python3 -I tools/ballplay.py <repo dir> <out dir> [skill/file.pt ...]
"""
import io, json, os, pickle, re, sys, zipfile
import numpy as np

BODIES = None  # from the MJCF, in file order (= body_pos order)
DIFF = {}
DT = {'FloatStorage': np.float32, 'DoubleStorage': np.float64, 'HalfStorage': np.float16, 'LongStorage': np.int64,
      'IntStorage': np.int32, 'BoolStorage': np.bool_, 'ByteStorage': np.uint8}


class _Storage:
    def __init__(self, kind, key):
        self.kind, self.key = kind, key


def _rebuild(storage, offset, size, stride, *rest):
    return ('tensor', storage, offset, tuple(size), tuple(stride))


class SafeUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module == 'torch._utils' and name == '_rebuild_tensor_v2': return _rebuild
        if module == 'torch' and name in DT: return name
        if module == 'collections' and name == 'OrderedDict': return dict
        raise pickle.UnpicklingError(f'refusing {module}.{name}')

    def persistent_load(self, pid):
        if not (isinstance(pid, tuple) and pid[0] == 'storage'): raise pickle.UnpicklingError('bad persistent id')
        kind = pid[1] if isinstance(pid[1], str) else str(pid[1])
        if kind not in DT: raise pickle.UnpicklingError(f'storage {kind}')
        return _Storage(kind, str(pid[2]))


def read_pt(path):
    z = zipfile.ZipFile(path)
    names = z.namelist()
    pk = [n for n in names if n.endswith('data.pkl')][0]
    base = pk[:-len('data.pkl')]
    obj = SafeUnpickler(io.BytesIO(z.read(pk))).load()
    if not (isinstance(obj, tuple) and obj and obj[0] == 'tensor'): raise ValueError('not a single tensor')
    _, st, off, size, stride = obj
    raw = np.frombuffer(z.read(base + 'data/' + st.key), dtype=DT[st.kind])
    it = raw.itemsize
    a = np.lib.stride_tricks.as_strided(raw[off:], shape=size, strides=tuple(s * it for s in stride))
    return np.array(a, dtype=np.float64)


def bodies(xml):
    return re.findall(r'<body name="([^"]+)"', open(xml).read())


def tree(xml):
    """body names in file order with each one's parent index"""
    names, parent, stack = [], [], []
    for m in re.finditer(r'<body name="([^"]+)"|</body>', open(xml).read()):
        if m.group(0) == '</body>': stack.pop(); continue
        names.append(m.group(1)); parent.append(stack[-1] if stack else -1); stack.append(len(names) - 1)
    return names, parent


def expmap(v):
    """(n, 3) exp maps -> (n, 3, 3) rotations (Rodrigues)"""
    th = np.linalg.norm(v, axis=-1)[:, None, None]
    k = v / np.maximum(th[:, :, 0], 1e-12)
    K = np.zeros(v.shape[:-1] + (3, 3))
    K[:, 0, 1], K[:, 0, 2], K[:, 1, 0], K[:, 1, 2], K[:, 2, 0], K[:, 2, 1] = -k[:, 2], k[:, 1], k[:, 2], -k[:, 0], -k[:, 1], k[:, 0]
    return np.eye(3) + np.sin(th) * K + (1 - np.cos(th)) * K @ K


def world_rots(d, xml):
    """each body's world rotation (Z-up world <- the model's Y-up rest frame): the root's exp map, then the 52 joints'
    local exp maps down the tree (this reproduces the recorded body positions to a few cm)"""
    names, parent = tree(xml)
    G = [None] * len(names)
    for i, p in enumerate(parent):
        G[i] = expmap(d[:, 3:6]) if p < 0 else G[p] @ expmap(d[:, 9 + 3 * (i - 1): 9 + 3 * i])
    return dict(zip(names, G))


# Z-up (x, y, z) -> our Y-up: x stays, up = z, forward = -y
W = np.array([[1.0, 0, 0], [0, 0, 1], [0, -1, 0]])


def unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def frame(x, y):
    """rotation whose columns are x (left), y (up), z = x cross y (forward), y kept, x orthogonalized"""
    y = unit(y); x = unit(x - (x * y).sum(-1, keepdims=True) * y); z = np.cross(x, y)
    return np.stack([x, y, z], axis=-1)


def convert(pt, xml):
    global BODIES
    BODIES = BODIES or bodies(xml)
    d = read_pt(pt)
    n = d.shape[0]
    B = d[:, 165:165 + 53 * 3].reshape(n, 53, 3) @ W.T
    J = {name: B[:, i] for i, name in enumerate(BODIES)}
    ball = d[:, 324:327] @ W.T
    contact = np.round(d[:, 336]) if d.shape[1] > 336 else np.zeros(n)
    P = {}
    P['root'] = J['Pelvis']
    for s, S in (('l', 'L'), ('r', 'R')):
        P[s + 'hipjoint'] = J[S + '_Hip']; P[s + 'femur'] = J[S + '_Knee']; P[s + 'tibia'] = J[S + '_Ankle']
        P[s + 'foot'] = J[S + '_Toe']
        # toe tip: ~5 cm on from the ball of the foot, along the foot (ankle -> ball, flattened toward the floor)
        f = J[S + '_Toe'] - J[S + '_Ankle']; fh = f.copy(); fh[:, 1] *= 0.3
        P[s + 'toes'] = J[S + '_Toe'] + 0.05 * unit(fh)
        P[s + 'clavicle'] = J[S + '_Shoulder']; P[s + 'humerus'] = J[S + '_Elbow']; P[s + 'radius'] = J[S + '_Wrist']
        knuck = (J[S + '_Index1'] + J[S + '_Middle1'] + J[S + '_Ring1'] + J[S + '_Pinky1']) / 4
        P[s + 'wrist'] = J[S + '_Wrist'] + 0.35 * (knuck - J[S + '_Wrist'])
        P[s + 'hand'] = knuck
        tip = J[S + '_Middle3'] + 0.7 * (J[S + '_Middle3'] - J[S + '_Middle2'])
        P[s + 'fingers'] = tip
        P[s + 'thumb'] = J[S + '_Thumb3'] + 0.7 * (J[S + '_Thumb3'] - J[S + '_Thumb2'])
    P['lowerback'] = J['Torso']; P['upperback'] = J['Spine2']; P['thorax'] = J['Chest']
    P['lowerneck'] = J['Neck']; P['upperneck'] = J['Neck'] + 0.5 * (J['Head'] - J['Neck'])
    # rotations (world, relative to the T-pose) from the joint positions: hips, spine, chest, neck, hands, feet
    hipL = J['L_Hip'] - J['R_Hip']
    shL = J['L_Shoulder'] - J['R_Shoulder']
    M = {}
    M['root'] = frame(hipL, J['Torso'] - J['Pelvis'] + 0.0)
    M['lowerback'] = frame(hipL + shL, J['Spine2'] - J['Torso'])
    M['thorax'] = frame(shL, J['Neck'] - J['Spine2'])
    up_head = J['Head'] - J['Neck']
    M['upperneck'] = frame(shL, up_head)
    M['head'] = M['upperneck']  # (the yaw of the head isn't in the positions; refined below from the joint angles)
    P['head'] = J['Head'] + 0.12 * unit(up_head)
    for s, S, sg in (('l', 'L', 1), ('r', 'R', -1)):
        wr = J[S + '_Wrist']; knuck = P[s + 'hand']
        along = unit(knuck - wr) * sg  # T-pose: +x for the left hand, -x for the right -> local x
        across = J[S + '_Index1'] - J[S + '_Pinky1']  # T-pose: +z (thumb side forward)
        # T-pose palm down: x = along (left), z = across (forward), y = z cross x (up)
        y = np.cross(unit(across), along)
        R = frame(along, y)
        M[s + 'hand'] = R; M[s + 'wrist'] = R
        ft = J[S + '_Toe'] - J[S + '_Ankle']  # T-pose: mostly +z, a little down
        side = hipL  # foot's left, from the hips (its roll isn't in the positions)
        z = unit(ft); x = unit(np.cross(np.array([0, 1.0, 0]), z) + 0 * side)
        M[s + 'foot'] = frame(x, np.cross(z, x))
    # the rig reads world rotations relative to the T-pose for the hips, spine, neck, head, hands and feet; the
    # model's rest is a T-pose facing +z with palms down, like the CMU skeleton's, so they are the FK's, in our axes
    R = world_rots(d, xml)
    for k, b in (('root', 'Pelvis'), ('lowerback', 'Torso'), ('thorax', 'Chest'), ('upperneck', 'Neck'), ('head', 'Head'),
                 ('lhand', 'L_Wrist'), ('rhand', 'R_Wrist'), ('lwrist', 'L_Wrist'), ('rwrist', 'R_Wrist'), ('lfoot', 'L_Ankle'), ('rfoot', 'R_Ankle')):
        Mk = W @ R[b]
        # (how far the FK's frame is from the one the positions give, for the log)
        if k in ('root', 'thorax', 'lhand', 'rhand'):
            c = np.clip((np.trace(np.swapaxes(Mk, 1, 2) @ M[k], axis1=1, axis2=2) - 1) / 2, -1, 1)
            DIFF[k] = float(np.degrees(np.arccos(c)).mean())
        M[k] = Mk
    return d, J, P, M, ball, contact


KEEP = ['root', 'lhipjoint', 'lfemur', 'ltibia', 'lfoot', 'ltoes', 'rhipjoint', 'rfemur', 'rtibia', 'rfoot', 'rtoes',
        'lowerback', 'upperback', 'thorax', 'lowerneck', 'upperneck', 'head',
        'lclavicle', 'lhumerus', 'lradius', 'lwrist', 'lhand', 'lfingers', 'lthumb',
        'rclavicle', 'rhumerus', 'rradius', 'rwrist', 'rhand', 'rfingers', 'rthumb']
MATS = ['root', 'lowerback', 'thorax', 'upperneck', 'head', 'lhand', 'rhand', 'lfoot', 'rfoot', 'lwrist', 'rwrist']


def to_json(P, M, ball, contact, fps=60):
    n = len(P['root'])
    out = {'fps': fps, 'n': n, 'pos': {}, 'mat': {}, 'src': 'SkillMimic BallPlay-M (Apache-2.0)'}
    for k in KEEP: out['pos'][k] = np.round(P[k], 4).reshape(-1).tolist()
    out['pos']['ball'] = np.round(ball, 4).reshape(-1).tolist()
    for k in MATS: out['mat'][k] = np.round(M[k], 4).reshape(-1).tolist()
    out['contact'] = [int(c) for c in contact]
    return out


if __name__ == '__main__':
    repo, outdir = sys.argv[1], sys.argv[2]
    xml = os.path.join(repo, 'skillmimic', 'data', 'assets', 'mjcf', 'mocap_humanoid.xml')
    mdir = os.path.join(repo, 'skillmimic', 'data', 'motions', 'BallPlay-M')
    files = sys.argv[3:] or sorted(os.path.join(dp, f)[len(mdir) + 1:] for dp, _, fs in os.walk(mdir) for f in fs if f.endswith('.pt'))
    os.makedirs(outdir, exist_ok=True)
    for rel in files:
        d, J, P, M, ball, contact = convert(os.path.join(mdir, rel), xml)
        name = 'bp_' + rel.split('/')[0]
        if os.path.exists(os.path.join(outdir, name + '.json')): name += '_' + re.sub(r'\D', '', rel.split('/')[-1])[-3:]
        json.dump(to_json(P, M, ball, contact), open(os.path.join(outdir, name + '.json'), 'w'), separators=(',', ':'))
        root = P['root']; dist = np.sum(np.linalg.norm(np.diff(root[:, [0, 2]], axis=0), axis=1))
        print(f'{name:28s} {rel:48s} {len(root):4d} fr = {len(root) / 60:5.2f}s  cols {d.shape[1]}  hip {root[:, 1].mean():.2f} m  travel {dist:4.1f} m  ball y {ball[:, 1].min():.2f}..{ball[:, 1].max():.2f}  contact {int(contact.sum())}  FK vs positions (deg) ' + ' '.join(f'{k} {v:.0f}' for k, v in DIFF.items()))
