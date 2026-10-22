import json, os, sys, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
DIRS = [os.path.join(HERE, 'isa', 'isa_BP3D_4.0_obj_99'), os.path.join(HERE, 'obj', 'partof_BP3D_4.0_obj_99')]
name2fj = {}
for fn in ['partof_element_parts.txt', 'isa_element_parts.txt']:
    for i, line in enumerate(open(os.path.join(HERE, fn), encoding='utf-8', errors='ignore')):
        if i == 0: continue
        a = line.rstrip('\n').split('\t')
        if len(a) >= 3: name2fj.setdefault(a[1].strip().lower(), set()).add(a[2].strip())
allnames = sorted(name2fj)
ribs = [f'{s} {n} rib' for s in ('left', 'right') for n in ('first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh')]
tverts = [f'{n} thoracic vertebra' for n in ('first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh')]
teeth = [n for n in allnames if 'secondary' in n and 'tooth' in n and (n.startswith('left') or n.startswith('right'))]
phar = [n for n in allnames if n.endswith('pharyngeal constrictor') and (n.startswith('left') or n.startswith('right'))]
GROUPS = {
  'skin': ['skin'], 'skull': ['skull'], 'mandible': ['mandible'], 'hyoid': ['hyoid bone'], 'teeth': teeth,
  'spine': ['cervical vertebral column'] + tverts, 'ribs': ribs + ['sternum', 'left clavicle', 'right clavicle'],
  'eyes': ['left eyeball', 'right eyeball'],
  'thyroid': ['thyroid cartilage'], 'cricoid': ['cricoid cartilage'], 'epiglottis': ['epiglottis'],
  'arytenoid': ['left arytenoid cartilage', 'right arytenoid cartilage'],
  'vligL': ['left vocal ligament'], 'vligR': ['right vocal ligament'],
  'vocalis': ['left vocalis', 'right vocalis', 'left thyro-arytenoid', 'right thyro-arytenoid'],
  'cricothyroid': [n for n in allnames if 'cricothyroid' in n and ('left' in n or 'right' in n) and 'part' in n],
  'pharynx': phar, 'tongue': ['tongue'], 'softpal': ['soft palate'], 'lip': ['lip'],
  'trachea': ['trachea', 'left main bronchus', 'right main bronchus'], 'esophagus': ['esophagus'],
  'lungs': ['left lung', 'right lung'], 'diaphragm': ['diaphragm'],
}
def find(fj):
    for d in DIRS:
        p = os.path.join(d, fj + '.obj')
        if os.path.exists(p): return p
def load(p):
    V, F = [], []
    for line in open(p, errors='ignore'):
        if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('f '):
            idx = [int(t.split('/')[0]) - 1 for t in line.split()[1:]]
            for k in range(1, len(idx) - 1): F.append([idx[0], idx[k], idx[k + 1]])
    return np.array(V, np.float64), np.array(F, np.int64)
used = set(); out = {}; blob = bytearray(); manifest = {}
for g, names in GROUPS.items():
    fjs = set()
    for n in names:
        s = name2fj.get(n.lower())
        if not s: print('WARN missing name', g, n); continue
        fjs |= s
    Vs, Fs, base = [], [], 0
    for fj in sorted(fjs):
        if g != 'skin' and fj in used: continue
        p = find(fj)
        if not p: print('WARN missing file', g, fj); continue
        V, F = load(p)
        if g == 'skin':
            keep = (V[:, 2] > 985) & ((np.abs(V[:, 0]) < 182) | (V[:, 2] > 1455))
            F = F[keep[F].all(1)]
        used.add(fj); Vs.append(V); Fs.append(F + base); base += len(V)
    if not Vs: continue
    V = np.concatenate(Vs); F = np.concatenate(Fs)
    # drop unused vertices
    u, inv = np.unique(F.ravel(), return_inverse=True); V = V[u]; F = inv.reshape(-1, 3)
    P = np.stack([V[:, 0] / 10, (V[:, 2] - 1400) / 10, -(V[:, 1] + 100) / 10], 1).astype(np.float32)
    I = F.astype(np.uint32)
    manifest[g] = dict(pos=[len(blob), len(P)], idx=[len(blob) + P.nbytes, len(I)], files=len(Vs), bbox=[P.min(0).round(2).tolist(), P.max(0).round(2).tolist()])
    blob += P.tobytes() + I.tobytes()
    print(f'{g:12s} files={len(Vs):3d} verts={len(P):7d} tris={len(I):7d} bbox={manifest[g]["bbox"]}')
dst = sys.argv[1]
open(os.path.join(dst, 'anatomy.bin'), 'wb').write(bytes(blob)); json.dump(manifest, open(os.path.join(dst, 'anatomy.json'), 'w'))
print('total MB', len(blob) / 1e6)
