"""Cuts Grandfather Gloom (level 2's boss, art-src/bosses/grandfather-gloom.webp) into rig parts.

  python tools/gloom-cut.py        (needs Pillow, NumPy and SciPy, like tools/iggy-cut.py, whose paper removal it reuses)

Writes art-src/spine/gloom/images/<part>.png and parts.json (box and pivot of each part, in sheet pixels).
The sheet draws it striding to the left, towards Iggy: the gear-launcher cannon in its near hand, a wind-up key in the far one.
Parts are cut in the order listed: each takes its pixels first, so the cannon keeps the bit of it that crosses the near thigh.
"""
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / 'art-src/bosses/grandfather-gloom.webp'
OUT = ROOT / 'art-src/spine/gloom'
FIG = (40, 30, 760, 1000)  # the big drawing; the back view and the details float free of it and are dropped

spec = importlib.util.spec_from_file_location('iggy_cut', ROOT / 'tools/iggy-cut.py')
iggy_cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iggy_cut)

# (polygon, pivot) in sheet pixels, in cutting order; whatever is left over is the body
PARTS = {
    'cannonFore': ([(60, 430), (210, 430), (218, 485), (252, 560), (300, 612), (318, 632), (380, 800), (338, 812), (280, 740), (252, 690), (240, 645), (150, 655), (60, 612)], (150, 455)),
    'cannonUpper': ([(205, 285), (300, 285), (300, 330), (255, 380), (205, 450), (192, 482), (108, 482), (108, 420), (150, 370), (205, 330)], (255, 330)),
    'keyFore': ([(470, 455), (742, 455), (742, 602), (470, 602)], (500, 482)),
    'keyUpper': ([(440, 328), (512, 328), (532, 470), (526, 505), (470, 505), (458, 420)], (470, 355)),
    'shinL': ([(150, 760), (252, 760), (242, 930), (232, 992), (118, 992), (128, 900)], (210, 765)),
    'shinR': ([(410, 728), (542, 728), (522, 880), (584, 898), (584, 962), (428, 962)], (495, 735)),
    'thighL': ([(225, 652), (322, 652), (302, 760), (242, 805), (178, 805), (178, 720)], (290, 665)),
    'thighR': ([(400, 658), (470, 658), (540, 705), (536, 765), (472, 775), (405, 690)], (425, 665)),
}
# parts that something in front of them hides a piece of: the hidden piece is filled in from the part's own nearest pixels, so no
# hole shows when the thing in front moves away (the near thigh and the hip, behind the cannon)
FILL_BEHIND = {'thighL': None, 'body': [(232, 592), (338, 592), (338, 708), (232, 708)]}  # part -> area to fill (None = all of it)
BODY = ([(150, 40), (565, 40), (565, 600), (470, 690), (300, 690), (250, 600), (150, 600)], (350, 620))


def main():
    sheet = Image.open(SHEET).convert('RGB')
    x0, y0, x1, y1 = FIG
    rgb = np.array(sheet.crop(FIG))
    mask = iggy_cut.figure_mask(rgb, FIG, 905, pocket=1.6)  # below y 905, pale grey touching the paper is the pencil shadow
    (OUT / 'images').mkdir(parents=True, exist_ok=True)
    meta, taken = {}, np.zeros_like(mask)
    for name, (poly, pivot) in {**PARTS, 'body': BODY}.items():
        pm = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(pm).polygon([(x - x0, y - y0) for x, y in poly], fill=255)
        inside = mask & (np.array(pm) > 0)
        m = inside & ~taken
        taken |= m
        src = rgb
        if name in FILL_BEHIND:
            hidden = inside & ~m  # covered by a part cut earlier
            if FILL_BEHIND[name]:
                lim = Image.new('L', (x1 - x0, y1 - y0), 0)
                ImageDraw.Draw(lim).polygon([(x - x0, y - y0) for x, y in FILL_BEHIND[name]], fill=255)
                hidden &= np.array(lim) > 0
            if hidden.any():
                _, (iy, ix) = ndimage.distance_transform_edt(~m, return_indices=True)
                src = rgb.copy()
                src[hidden] = rgb[iy[hidden], ix[hidden]]
                m = m | hidden
        ys, xs = np.nonzero(m)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        part = Image.fromarray(src[by0:by1, bx0:bx1]).convert('RGBA')
        part.putalpha(Image.fromarray((m[by0:by1, bx0:bx1] * 255).astype(np.uint8)))
        part.save(OUT / 'images' / f'{name}.png')
        meta[name] = {'x': int(bx0 + x0), 'y': int(by0 + y0), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'pivot': list(pivot)}
    full = Image.fromarray(rgb).convert('RGBA')
    full.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))
    full.save(OUT / 'cutout-preview.png')
    seg = np.zeros((*mask.shape, 4), np.uint8)  # each part in its own colour, to check the cut lines
    cols = [(230, 80, 80), (80, 200, 90), (80, 120, 230), (230, 200, 60), (200, 90, 220), (60, 210, 210), (240, 140, 40), (150, 150, 150), (120, 80, 40)]
    for i, (name, (poly, _)) in enumerate({**PARTS, 'body': BODY}.items()):
        pm = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(pm).polygon([(x - x0, y - y0) for x, y in poly], fill=255)
        seg[(np.array(pm) > 0) & mask & (seg[..., 3] == 0)] = (*cols[i % len(cols)], 255)
    Image.alpha_composite(full, Image.fromarray(seg).point(lambda v: v)).save(OUT / 'cutout-parts.png')
    (OUT / 'parts.json').write_text(json.dumps(meta, indent=1))
    print(f'wrote {len(meta)} parts to {OUT}')


if __name__ == '__main__':
    main()
