"""Cuts the Reclaimer (the final boss, art-src/bosses/reclaimer.webp) into rig parts.

  python tools/reclaimer-cut.py        (needs Pillow, NumPy and SciPy, like tools/iggy-cut.py, whose paper removal it reuses)

Writes art-src/spine/reclaimer/images/<part>.png and parts.json (box and pivot of each part, in sheet pixels), and the
wrecking ball on its own to public/foes/reclaimer-ball.png for the game to swing in code.
The sheet draws it front-on: the claw arm on the left (towards Iggy, who comes from the left) and the wrecking ball on the right.
"""
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / 'art-src/bosses/reclaimer.webp'
OUT = ROOT / 'art-src/spine/reclaimer'
FIG = (60, 90, 745, 800)  # the big drawing; callouts and the smaller drawings sit outside or float free of it

spec = importlib.util.spec_from_file_location('iggy_cut', ROOT / 'tools/iggy-cut.py')
iggy_cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iggy_cut)

# polygons (sheet pixels) and pivots. The body is everything the other parts leave behind.
PARTS = {
    'legL':     ([(252, 572), (398, 572), (392, 738), (384, 795), (246, 795)], (330, 580)),  # (not the callout arrow by its foot)
    'legR':     ([(458, 572), (614, 572), (622, 795), (452, 795)], (530, 580)),
    'armUpper': ([(150, 412), (302, 412), (302, 472), (210, 545), (150, 528)], (262, 445)),
    'armClaw':  ([(62, 478), (212, 478), (218, 540), (208, 690), (62, 690)], (186, 512)),
    'ball':     ([(612, 548), (740, 548), (740, 692), (612, 692)], (684, 552)),
}
BODY = ([(205, 92), (725, 92), (725, 548), (612, 548), (612, 572), (252, 572), (252, 545), (302, 472), (302, 412), (205, 412)], (430, 575))


def main():
    sheet = Image.open(SHEET).convert('RGB')
    x0, y0, x1, y1 = FIG
    rgb = np.array(sheet.crop(FIG))
    mask = iggy_cut.figure_mask(rgb, FIG, 10**6, light_min=158, flat_max=50, pocket=2.2)  # the right of this sheet is stained darker
    (OUT / 'images').mkdir(parents=True, exist_ok=True)
    meta = {}
    taken = np.zeros_like(mask)
    for name, (poly, pivot) in {**PARTS, 'body': BODY}.items():
        pm = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(pm).polygon([(x - x0, y - y0) for x, y in poly], fill=255)
        m = mask & (np.array(pm) > 0)
        if name == 'body':
            m &= ~taken  # whatever the limbs didn't take
        else:
            taken |= m
        ys, xs = np.nonzero(m)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        part = Image.fromarray(rgb[by0:by1, bx0:bx1]).convert('RGBA')
        part.putalpha(Image.fromarray((m[by0:by1, bx0:bx1] * 255).astype(np.uint8)))
        part.save(OUT / 'images' / f'{name}.png')
        meta[name] = {'x': int(bx0 + x0), 'y': int(by0 + y0), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'pivot': list(pivot)}
    full = Image.fromarray(rgb).convert('RGBA')
    full.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))
    full.save(OUT / 'cutout-preview.png')
    (OUT / 'parts.json').write_text(json.dumps(meta, indent=1))
    # the ball also on its own, at game size x2 (the game swings it in code on a drawn chain)
    ball = Image.open(OUT / 'images/ball.png')
    (ROOT / 'public/foes').mkdir(parents=True, exist_ok=True)
    ball.resize((round(ball.width * 0.7 * 2), round(ball.height * 0.7 * 2)), Image.LANCZOS).save(ROOT / 'public/foes/reclaimer-ball.png')
    print(f'wrote {len(meta)} parts to {OUT}')


if __name__ == '__main__':
    main()
