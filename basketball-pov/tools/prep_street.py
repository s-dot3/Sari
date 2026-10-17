"""v14 court under the el: texture sets for the two defenders and the crowd, from the Rocketbox athletes.

The defenders: a royal-blue tank top over black shorts (model 04) and a gold tee over charcoal shorts (model 02). The
crowd: a summer afternoon's clothes - tees and tanks, shorts, some jeans and joggers, varied skin and hair -
recoloured over the same bodies, at half resolution (they are 6 m and more from the camera).

usage: python3 tools/prep_street.py [name ...]
Output: assets/players/<name>/{body_color.jpg, body_rough.jpg, head_color.jpg, head_rough.jpg[, opacity_color.png]}
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prep_textures import (RAW, OUT, load, save_rgb, luma, hexrgb, rough_from_spec, skin_mask, tone_skin, feather,
                           classify_body)

CODES = {'02': 'm301', '03': 'm300', '04': 'm026'}


def shade_of(col, sel, lo=0.78, hi=1.12, blur=3):
    """Relative brightness inside a region, blurred: with a wide blur it keeps the baked shading and drops the kit's
    stripes, numbers and logos (the folds come from the normal map)."""
    L = luma(col)
    m = L[sel].mean() if sel.any() else 1
    r = np.clip(L / (m + 1e-6), lo, hi)
    if blur:
        r = np.asarray(Image.fromarray((r / hi * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255 * hi
    return r


def fabric(shape, seed, k=0.03):
    return 1 - k + 2 * k * np.random.default_rng(seed).random(shape).astype(np.float32)


def build(name, model, cfg, size=2048):
    code = CODES[model]
    out = os.path.join(OUT, name); os.makedirs(out, exist_ok=True)
    col = load(model, 'body_color').copy()
    info = classify_body(model, code, col)
    M, P, G, cls, skin0 = info['M'], info['P'], info['G'], info['cls'], info['skin']
    skin = skin_mask(col) & M
    y = P[..., 1]
    newc = col.copy()
    hand = (G == 'hand')
    # top: the shirt as modelled, plus the arms down to the wrists for long sleeves (not the neck above the collar)
    top = ((cls == 'shirt') | (cls == 'sleeve')) & M
    if cfg.get('sleeves') == 'short':
        # (a tank top's bare shoulders covered down to mid upper arm: a tee)
        top |= (G == 'upper') & M & (np.abs(P[..., 0]) < 0.34)
    if cfg.get('sleeves') == 'long':
        top |= ((G == 'upper') | (G == 'fore')) & M & ~hand
        top |= (G == 'torso') & M & ~(skin & (y > 1.43))
        top &= ~(hand | (cls == 'shoe'))
    # (a tank top keeps its bare arms; the 04 kit's blue panels and piping all go to the one colour)
    if 'top' in cfg:
        sh = shade_of(col, top, 0.92, 1.05, 40)
        newc[top] = hexrgb(cfg['top']) * (sh[top] * fabric(sh.shape, 3)[top])[:, None]
    # bottoms: shorts as modelled, or trousers down to the shoes (thigh, knee, shin, sock)
    bottom = (cls == 'shorts') & M & ~skin0
    if cfg.get('pants'):
        bottom = (((G == 'thigh') | (G == 'calf') | ((G == 'pelvis') & (y < 1.0))) & M) | ((cls == 'calf') & M)
        bottom &= ~(cls == 'shoe') & ~(G == 'foot')
    if 'bottom' in cfg:
        sh = shade_of(col, bottom, 0.92, 1.05, 40)
        c = hexrgb(cfg['bottom']) * (sh[bottom] * fabric(sh.shape, 4, 0.05 if cfg.get('denim') else 0.025)[bottom])[:, None]
        newc[bottom] = c
    socks = (cls == 'calf') & M & ~skin0 & ~bottom
    if 'socks' in cfg:
        newc[socks] = hexrgb(cfg['socks']) * shade_of(col, socks, 0.92, 1.05, 30)[socks][:, None]
    shoes = (cls == 'shoe') & M
    if 'shoes' in cfg:
        newc[shoes] = hexrgb(cfg['shoes']) * shade_of(col, shoes, 0.75, 1.2, 1)[shoes][:, None]
    if cfg.get('skin'):
        clothes = top | bottom | socks | shoes
        newc = tone_skin(newc, skin & ~clothes, cfg['skin'], 1.0)
    save_rgb(newc if size == 2048 else np.asarray(Image.fromarray((np.clip(newc, 0, 1) * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)).astype(np.float32) / 255,
             os.path.join(out, 'body_color.jpg'))
    spec = load(model, 'body_specular')
    rough = rough_from_spec(spec)
    cloth = top | bottom | socks
    rough[cloth] = 0.86 + 0.04 * np.random.default_rng(5).random(cloth.sum()).astype(np.float32)
    r3 = np.repeat(rough[..., None], 3, -1)
    if size != 2048: r3 = np.asarray(Image.fromarray((r3 * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)).astype(np.float32) / 255
    save_rgb(r3, os.path.join(out, 'body_rough.jpg'), 88)
    if model != '04':
        nm = load(model, 'body_normal')
        if size != 2048: nm = np.asarray(Image.fromarray((nm * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)).astype(np.float32) / 255
        save_rgb(nm, os.path.join(out, 'body_normal.jpg'), 95)
    # head: skin tone and hair colour
    hc = load(model, 'head_color').copy()
    z = np.load(os.path.join(RAW, f'm{model}', 'bake.npz'))
    Mh = z[f'M_{code}_head']; Ph = z[f'P_{code}_head']
    Lh = luma(hc)
    hair = Mh & (Lh < 0.3) & (Ph[..., 1] > 1.55)
    if cfg.get('skin'):
        hc = tone_skin(hc, skin_mask(hc) & ~hair, cfg['skin'], 1.0)
    if cfg.get('hair'):
        hw = feather(hair.astype(np.float32), 1.5)[..., None]
        hc = hc * (1 - hw) + (hexrgb(cfg['hair']) * (Lh / 0.22)[..., None] ** 0.8) * hw
    hspec = rough_from_spec(load(model, 'head_specular'), 0.42, 0.9)
    if size != 2048:
        hc = np.asarray(Image.fromarray((np.clip(hc, 0, 1) * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)).astype(np.float32) / 255
        hspec = np.asarray(Image.fromarray((hspec * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)).astype(np.float32) / 255
    save_rgb(hc, os.path.join(out, 'head_color.jpg'))
    save_rgb(np.repeat(hspec[..., None], 3, -1), os.path.join(out, 'head_rough.jpg'), 88)
    if os.path.exists(os.path.join(RAW, f'm{model}', 'opacity_color.png')):
        a = np.asarray(Image.open(os.path.join(RAW, f'm{model}', 'opacity_color.png')).convert('RGBA')).astype(np.float32) / 255
        if cfg.get('hair'):
            Lo = luma(a[..., :3]); a[..., :3] = hexrgb(cfg['hair']) * (Lo / 0.2)[..., None] ** 0.8
        im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
        if size != 2048: im = im.resize((size, size), Image.LANCZOS)
        im.save(os.path.join(out, 'opacity_color.png'))
    print('built', name)


SETS = {
    # the two defenders
    'd_blue': ('04', dict(top='#2152c4', bottom='#151517', socks='#f2f2f0', shoes='#e9e7e2', skin='#5a3726', hair='#0f0d0c')),
    'd_gold': ('02', dict(top='#d6a531', bottom='#3a3d42', socks='#f2f2f0', shoes='#202124', skin='#c99a74', hair='#2a1d14')),
    # the crowd: tees and tanks, shorts, a few in jeans or joggers
    'c01': ('03', dict(top='#f1f0ec', bottom='#4a5f86', shoes='#e8e6e0', skin='#8a5a3c', hair='#141010')),
    'c02': ('04', dict(top='#18191b', bottom='#8e9196', socks='#efefed', shoes='#e9e7e2', skin='#e0b391', hair='#3b2a1c')),
    'c03': ('02', dict(top='#e46f5c', bottom='#b5a68a', pants=True, shoes='#f0eeea', skin='#5a3726', hair='#121010')),
    'c04': ('03', dict(top='#24304a', bottom='#3b4f6e', pants=True, denim=True, shoes='#1d1d1f', skin='#c68e6a', hair='#22180f')),
    'c05': ('04', dict(top='#2a8c8c', sleeves='short', bottom='#1b1c1f', socks='#f2f2f0', shoes='#1d1d1f', skin='#9c6646', hair='#0e0c0b')),
    'c06': ('02', dict(top='#9a9ea3', bottom='#1b1c1f', shoes='#d8d4cc', skin='#e8bf9e', hair='#6b4f33')),
    'c07': ('04', dict(top='#ecebe7', bottom='#2c3448', socks='#f2f2f0', shoes='#1a1a1c', skin='#4d2f22', hair='#0f0d0c')),
    'c08': ('03', dict(top='#5d6b3e', bottom='#c9b99a', shoes='#7c6a55', skin='#a8714e', hair='#1a1410')),
    'c09': ('02', dict(top='#7fb2e0', bottom='#2c3448', pants=True, denim=True, shoes='#f0efea', skin='#7a4e34', hair='#100e0d')),
    'c10': ('04', dict(top='#e8c547', sleeves='short', bottom='#1b1c1f', socks='#efefed', shoes='#e6e3dc', skin='#c99a74', hair='#2a1d14')),
    'c11': ('03', dict(top='#141517', bottom='#1d1e21', pants=True, shoes='#ecebe7', skin='#d9a882', hair='#3a2618')),
    'c12': ('02', dict(top='#6b4c9a', bottom='#7d8085', pants=True, shoes='#ecebe7', skin='#3f2618', hair='#0c0b0a')),
}

if __name__ == '__main__':
    for n in sys.argv[1:] or list(SETS):
        m, cfg = SETS[n]
        build(n, m, cfg, 2048 if n.startswith('d_') else 1024)
