"""Cuts the Magpie Drone (art-src/enemies/MagpieDrone.webp) into body and wings and builds its flight frames.

  python tools/magpie-cut.py [--check]     (needs Pillow, NumPy and SciPy, like tools/iggy-cut.py, whose paper removal it reuses)

The sheet draws it at the top of a wingbeat. Each frame swings both wings down about their shoulders, foreshortening them as
they come towards the viewer (the far wing tucks behind the body, the near one sweeps in front), so the game can flap it by
swapping pictures. Writes public/foes/magpie-f0..f5.png (one wingbeat, wings up to down and back) and magpie-glide.png (wings
held out level, for swoops), all on one canvas so the body never jumps between frames, at twice the size the game draws them.
--check also writes art-src/enemies/magpie-parts.png (each part tinted) to check the cut lines.
"""
import importlib.util
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('iggy_cut', ROOT / 'tools/iggy-cut.py')
iggy_cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iggy_cut)

SHEET = ROOT / 'art-src/enemies/MagpieDrone.webp'
OUT = ROOT / 'public/foes'
BOX = (50, 115, 704, 725)  # the main drawing on the sheet (same box as tools/foes-cut.py)
HEIGHT = 44  # the body without its wings, in game px (the files are twice this)

# polygon on the sheet, shoulder pivot, how far it swings down (degrees, + = tip down) and how much it foreshortens at the bottom
WINGS = {
    'far': ([(92, 140), (300, 140), (338, 230), (345, 300), (318, 338), (276, 336), (236, 322), (190, 318), (150, 300), (92, 262)], (318, 330), 80, 0.35),
    'near': ([(352, 402), (346, 336), (424, 214), (560, 96), (728, 84), (728, 372), (604, 398), (504, 408), (422, 410)], (378, 382), 58, 0.45),
}
KEEP = 34  # the body keeps the wing's pixels this close to the shoulder, so a swung wing never leaves a hole in the back
FRAMES = 6
GLIDE = 0.4  # how far through the downstroke the glide pose holds the wings


def poly_mask(shape, poly):
    pm = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(pm).polygon(poly, fill=255)
    return np.array(pm) > 0


def swing(part: Image.Image, pivot, deg, squash, side):
    """The part rotated `deg` about the pivot (tip down: clockwise for the near wing on the right, anticlockwise for the far one
    on the left), after squashing it to `squash` of its height about the pivot."""
    px, py = pivot
    a = math.radians(deg) * (1 if side == 'near' else -1)  # + = clockwise in image space (y down)
    c, s = math.cos(a), math.sin(a)
    # forward: q = P + R(S(p - P)), S = diag(1, squash), R = clockwise rotation; Pillow wants the inverse, output -> input
    # inverse: p = P + S^-1 R^-1 (q - P)
    ia, ib = c, s
    ic, id_ = -s / squash, c / squash
    return part.transform(part.size, Image.AFFINE, (ia, ib, px - ia * px - ib * py, ic, id_, py - ic * px - id_ * py), resample=Image.BICUBIC)


def main():
    rgb = np.array(Image.open(SHEET).convert('RGB'))
    x0, y0, x1, y1 = BOX
    fig = np.zeros(rgb.shape[:2], bool)
    fig[y0:y1, x0:x1] = iggy_cut.figure_mask(rgb[y0:y1, x0:x1], BOX, 10**6)
    yy, xx = np.mgrid[:rgb.shape[0], :rgb.shape[1]]

    def layer(mask):
        im = Image.fromarray(rgb).convert('RGBA')
        im.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))
        return im

    body = fig.copy()
    parts = {}
    for name, (poly, pivot, _, _) in WINGS.items():
        wm = fig & poly_mask(fig.shape, poly)
        parts[name] = layer(wm)
        near_shoulder = (xx - pivot[0]) ** 2 + (yy - pivot[1]) ** 2 < KEEP ** 2
        body &= ~(wm & ~near_shoulder)
    body_im = layer(body)

    if '--check' in sys.argv:
        chk = Image.new('RGBA', body_im.size, (255, 255, 255, 255))
        for im, tint in ((body_im, (255, 255, 255)), (parts['far'], (90, 140, 255)), (parts['near'], (255, 120, 90))):
            t = Image.new('RGBA', im.size, tint + (110,))
            t.putalpha(Image.fromarray((np.array(im)[..., 3] > 0).astype(np.uint8) * 110))
            chk.alpha_composite(im)
            chk.alpha_composite(t)
        chk.crop((40, 60, 740, 760)).save(ROOT / 'art-src/enemies/magpie-parts.png')

    def frame(k):
        out = Image.new('RGBA', body_im.size, (0, 0, 0, 0))
        f_poly, f_piv, f_deg, f_sq = WINGS['far']
        n_poly, n_piv, n_deg, n_sq = WINGS['near']
        out.alpha_composite(swing(parts['far'], f_piv, f_deg * k, 1 - (1 - f_sq) * k, 'far'))
        out.alpha_composite(body_im)
        out.alpha_composite(swing(parts['near'], n_piv, n_deg * k, 1 - (1 - n_sq) * k, 'near'))
        return out

    frames = {f'magpie-f{i}': frame((1 - math.cos(2 * math.pi * i / FRAMES)) / 2) for i in range(FRAMES)}
    frames['magpie-glide'] = frame(GLIDE)
    # one canvas for all of them, scaled so the body is HEIGHT game px tall
    boxes = [np.array(im)[..., 3].nonzero() for im in frames.values()]
    cx0 = min(int(b[1].min()) for b in boxes) - 4
    cy0 = min(int(b[0].min()) for b in boxes) - 4
    cx1 = max(int(b[1].max()) for b in boxes) + 5
    cy1 = max(int(b[0].max()) for b in boxes) + 5
    bys = np.array(body_im)[..., 3].nonzero()[0]
    scale = HEIGHT * 2 / (bys.max() - bys.min() + 1)
    size = (round((cx1 - cx0) * scale), round((cy1 - cy0) * scale))
    for name, im in frames.items():
        im.crop((cx0, cy0, cx1, cy1)).resize(size, Image.LANCZOS).save(OUT / f'{name}.png', optimize=True)
    print(f'{len(frames)} frames, {size[0]}x{size[1]}')


if __name__ == '__main__':
    main()
