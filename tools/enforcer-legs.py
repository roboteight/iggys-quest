"""Splits Enforcer Nine's lower legs (public/art/enforcer-rig/lowerL.png and lowerR.png, one piece from knee to toes) into the
shin (knee pad, the strut back to the hock and the leg down to the ankle) and the foot, so the toes can stay flat or curl. Writes them, and copies the other parts, into art-src/spine/enforcer/images/, with art-src/spine/enforcer/parts.json.
The drawn rig in the game keeps using the untouched files in public/art/enforcer-rig/.

  python tools/enforcer-legs.py      (then node tools/enforcer-spine.mjs)
"""
import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'public/art/enforcer-rig', ROOT / 'art-src/spine/enforcer'

# piece -> (lower part it comes from, polygon in sheet px, pivot in sheet px). Cut in order; the last piece takes what is left.
SPLIT = {
    'footL': ('lowerL', [(100, 842), (400, 842), (400, 930), (100, 930)], (205, 842)),
    'shinL': ('lowerL', None, (255, 640)),
    'footR': ('lowerR', [(360, 790), (600, 790), (600, 860), (360, 860)], (460, 788)),
    'shinR': ('lowerR', None, (470, 640)),
}


def main():
    meta = json.loads((SRC / 'parts.json').read_text())
    (OUT / 'images').mkdir(parents=True, exist_ok=True)
    for f in [*(OUT / 'images').glob('lower*.png'), *(OUT / 'images').glob('shank*.png'), *(OUT / 'images').glob('tarsus*.png')]:
        f.unlink()
    out = {k: v for k, v in meta.items() if not k.startswith('lower')}
    for k in out:
        shutil.copyfile(SRC / f'{k}.png', OUT / 'images' / f'{k}.png')
    left = {}
    for piece, (lower, poly, pivot) in SPLIT.items():
        m = meta[lower]
        img = np.array(Image.open(SRC / f'{lower}.png').convert('RGBA'))
        alpha = left.setdefault(lower, img[..., 3] > 0)
        if poly is None:
            sel = alpha.copy()
        else:
            pm = Image.new('L', (m['w'], m['h']), 0)
            ImageDraw.Draw(pm).polygon([(x - m['x'], y - m['y']) for x, y in poly], fill=255)
            sel = alpha & (np.array(pm) > 0)
        alpha &= ~sel
        ys, xs = np.nonzero(sel)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        part = img[y0:y1, x0:x1].copy()
        part[..., 3] = np.where(sel[y0:y1, x0:x1], part[..., 3], 0)
        Image.fromarray(part).save(OUT / 'images' / f'{piece}.png')
        out[piece] = {'x': int(m['x'] + x0), 'y': int(m['y'] + y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'pivot': list(pivot)}
    (OUT / 'parts.json').write_text(json.dumps(out, indent=1))
    print(f'wrote {len(out)} parts to {OUT}')


if __name__ == '__main__':
    main()
