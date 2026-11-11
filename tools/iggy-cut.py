"""Cuts Iggy's concept sheets (the big front view on each) into parts for the Spine rig.

  python tools/iggy-cut.py [suit...]     (needs Pillow, NumPy and SciPy: pip install pillow numpy scipy)

One sheet per suit (rusty, patchwork, steel, night, gold; the four upgrades are in art-src/spine/iggy/sheets/). Writes
<out>/images/<part>.png and <out>/parts.json (each part's box and pivot, in sheet pixels), and a cutout-preview.png.
The paper is removed by flood-filling the light, unsaturated background in from the edges (the ink outline stops it), keeping
only the figure itself, and trimming the pale anti-aliased rim so no paper colour fringes the edges. Each part is then the
figure inside a hand-placed polygon. Polygons overlap a little at the joints so no gaps open when the parts turn.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'art-src/spine/iggy'

# polygons (sheet pixels) and the pivot each part turns around (where it joins its parent)
RUSTY = {
    'head':      ([(150, 30), (400, 30), (400, 300), (150, 300)], (275, 300)),
    'torso':     ([(96, 288), (445, 288), (445, 330), (398, 330), (398, 512), (177, 512), (177, 330), (96, 330)], (285, 500)),
    'pelvis':    ([(138, 492), (393, 492), (393, 522), (401, 522), (401, 600), (384, 612), (346, 642), (292, 658), (238, 642), (210, 614), (210, 728), (163, 728), (163, 650), (138, 650)], (285, 600)),
    'upperArmL': ([(25, 326), (177, 326), (177, 410), (128, 522), (25, 522)], (150, 372)),
    'foreArmL':  ([(25, 498), (137, 498), (137, 650), (163, 650), (163, 800), (25, 800)], (75, 508)),
    'upperArmR': ([(398, 326), (452, 326), (456, 522), (394, 522)], (414, 372)),
    'foreArmR':  ([(400, 500), (512, 500), (512, 775), (400, 775)], (422, 505)),
    'thighL':    ([(210, 598), (280, 598), (268, 772), (160, 778), (165, 728), (210, 728)], (238, 618)),
    'shinL':     ([(150, 742), (262, 742), (258, 905), (205, 930), (200, 982), (124, 982), (126, 900)], (206, 762)),
    'thighR':    ([(288, 598), (392, 598), (398, 772), (300, 778)], (340, 618)),
    'shinR':     ([(300, 748), (402, 748), (420, 860), (446, 890), (446, 950), (300, 950)], (350, 766)),
}
PATCHWORK = {
    'head':      ([(170, 50), (400, 50), (400, 300), (170, 300)], (280, 300)),
    'torso':     ([(90, 180), (460, 180), (460, 420), (398, 420), (398, 530), (138, 530), (138, 440), (150, 400), (90, 400)], (290, 510)),
    'pelvis':    ([(138, 480), (400, 480), (400, 585), (415, 585), (415, 710), (390, 710), (380, 650), (300, 660), (300, 685), (270, 685), (270, 655), (222, 640), (215, 705), (138, 705)], (290, 600)),
    'upperArmL': ([(20, 395), (150, 395), (138, 440), (138, 530), (20, 530)], (140, 390)),
    'foreArmL':  ([(15, 505), (138, 505), (138, 660), (165, 660), (165, 800), (15, 800)], (72, 505)),
    'upperArmR': ([(398, 415), (470, 415), (470, 520), (398, 520)], (420, 390)),
    'foreArmR':  ([(400, 515), (530, 515), (530, 800), (424, 800), (424, 640), (412, 640), (412, 585), (400, 585)], (420, 505)),
    'thighL':    ([(215, 600), (275, 600), (265, 770), (165, 775), (175, 705), (215, 705)], (232, 620)),
    'shinL':     ([(140, 745), (260, 745), (255, 978), (140, 978)], (215, 765)),
    'thighR':    ([(300, 600), (390, 600), (415, 712), (415, 770), (310, 775)], (350, 625)),
    'shinR':     ([(300, 745), (415, 745), (445, 860), (450, 942), (295, 942)], (355, 770)),
}
# Steel Sentinel, Night Guardian and Gold Circuit are the same armour in three finishes, drawn in the same place on their sheets
ARMOUR = {
    'head':      ([(175, 60), (395, 60), (395, 240), (383, 300), (175, 300), (178, 200)], (280, 300)),
    'torso':     ([(95, 170), (440, 170), (440, 300), (470, 300), (470, 420), (405, 420), (405, 530), (158, 530), (158, 425), (95, 425)], (290, 510)),  # (not the searchlight's beam)
    'pelvis':    ([(136, 480), (405, 480), (405, 640), (300, 660), (220, 640), (186, 600), (136, 600)], (290, 600)),
    'upperArmL': ([(20, 410), (160, 410), (160, 470), (136, 530), (20, 530)], (140, 400)),
    'foreArmL':  ([(15, 505), (133, 505), (133, 660), (165, 660), (165, 800), (15, 800)], (75, 505)),
    'upperArmR': ([(405, 415), (530, 415), (530, 520), (405, 520)], (425, 395)),
    'foreArmR':  ([(400, 515), (560, 515), (560, 800), (422, 800), (422, 640), (400, 640)], (425, 505)),
    'thighL':    ([(165, 595), (290, 595), (280, 770), (165, 775)], (230, 615)),
    'shinL':     ([(135, 750), (262, 750), (258, 985), (135, 985)], (210, 760)),
    'thighR':    ([(295, 595), (410, 595), (422, 770), (300, 775)], (345, 620)),
    'shinR':     ([(295, 750), (425, 750), (470, 860), (475, 948), (290, 948)], (360, 765)),
}
# fig: the front view's box on the sheet (the back view and most callouts are outside it); feet_y: below this, pale grey that
# touches the paper is the pencil shadow, not Iggy. out: where the parts go (Rusty's stay where the first rig put them).
# Iggy's arsenal (art-src/spine/iggy/sheets/arsenal.webp): the four guns, by gun level. Each: its box on the sheet, the top of
# the grip his hand holds, whether it has to be mirrored to point forward (right), and how wide to draw it (skeleton units).
ARSENAL_SHEET = BASE / 'sheets/arsenal.webp'
ARSENAL = {
    'blaster': {'box': (190, 25, 665, 272), 'grip': (590, 195), 'flip': True, 'width': 190},
    'twin':    {'box': (75, 282, 690, 500), 'grip': (625, 405), 'flip': True, 'width': 240},
    'spread':  {'box': (110, 515, 700, 705), 'grip': (595, 612), 'flip': True, 'width': 235},
    'rocket':  {'box': (60, 752, 735, 968), 'grip': (300, 893), 'flip': False, 'width': 330},
}
SUITS = {
    'rusty':     {'sheet': ROOT / 'public/art/iggy.webp', 'parts': RUSTY, 'fig': (20, 25, 520, 990), 'feet_y': 885, 'out': BASE},
    'patchwork': {'sheet': BASE / 'sheets/patchwork.webp', 'parts': PATCHWORK, 'fig': (10, 40, 530, 990), 'feet_y': 880, 'out': BASE / 'patchwork'},
    'steel':     {'sheet': BASE / 'sheets/steel.webp', 'parts': ARMOUR, 'fig': (10, 55, 565, 995), 'feet_y': 880, 'out': BASE / 'steel'},
    'night':     {'sheet': BASE / 'sheets/night.webp', 'parts': ARMOUR, 'fig': (10, 55, 565, 995), 'feet_y': 880, 'out': BASE / 'night'},
    'gold':      {'sheet': BASE / 'sheets/gold.webp', 'parts': ARMOUR, 'fig': (10, 55, 565, 995), 'feet_y': 880, 'out': BASE / 'gold'},
}


def figure_mask(rgb: np.ndarray, fig_box, feet_y: int, light_min: int = 188, flat_max: int = 40, pocket: float = 1.0) -> np.ndarray:
    """light_min / flat_max: how light and how unsaturated paper is (lower light_min for stained or shaded sheets). pocket:
    how far enclosed pockets of paper may stray from the paper colour and still be cleared (2 = twice as far).
    """
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    light = (r + g + b) / 3 > light_min
    flat = (np.max(rgb, axis=2).astype(int) - np.min(rgb, axis=2)) < flat_max
    paper = light & flat
    lab, _ = ndimage.label(paper)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # paper the ink closes in (between the legs above the pencil shadow, inside a hose loop or an antenna coil): bare paper is
    # close to the sheet's paper colour and evenly toned, unlike the cream paint, which is darker and shaded
    paper_col = np.median(rgb[bg & ndimage.binary_dilation(~bg, iterations=25)], axis=0)  # the paper right around him (sheets vignette at the corners)
    for i in range(1, lab.max() + 1):
        if i in edge:
            continue
        m = lab == i
        if m.sum() < 40:
            continue
        px = rgb[m].astype(float)
        dist, sd = np.abs(px.mean(0) - paper_col).mean(), px.std(0).mean()
        if (dist < 9 * pocket and sd < 12 * min(pocket, 1.3)) or (dist < 5 * pocket and sd < 15 * min(pocket, 1.3)):
            bg |= m
    fig = ~bg
    # keep the figure only: drop the handwriting, arrows and specks that float on the paper
    lab, n = ndimage.label(fig)
    sizes = ndimage.sum(fig, lab, range(1, n + 1))
    fig = lab == (1 + int(np.argmax(sizes)))
    # (paper-coloured pockets fully enclosed by ink stay: the cream torso is the same colour as the paper)
    # the pencil shadow under the feet: pale grey streaks that touch the paper directly (the boots' highlights sit inside ink)
    band = np.zeros_like(fig)
    band[feet_y - fig_box[1]:] = True
    lum = (r + g + b) / 3
    grey = band & fig & (lum > 120) & ((np.max(rgb, axis=2).astype(int) - np.min(rgb, axis=2)) < 45)
    lab, n = ndimage.label(grey)
    touching = set(np.unique(lab[ndimage.binary_dilation(~fig) & grey])) - {0}
    fig &= ~np.isin(lab, list(touching))
    lab, n = ndimage.label(fig)
    sizes = ndimage.sum(fig, lab, range(1, n + 1))
    fig = lab == (1 + int(np.argmax(sizes)))
    return ndimage.binary_erosion(fig, iterations=1)  # trim the pale rim; the ink line underneath becomes the edge


def cut_arsenal(images: Path) -> dict:
    """Writes gun-<name>.png into a suit's images (every suit carries the same arsenal) and returns their sizes and grips."""
    sheet = Image.open(ARSENAL_SHEET).convert('RGB')
    meta = {}
    for name, g in ARSENAL.items():
        rgb = np.array(sheet.crop(g['box']))
        m = figure_mask(rgb, g['box'], 10**6)
        ys, xs = np.nonzero(m)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        gun = Image.fromarray(rgb[by0:by1, bx0:bx1]).convert('RGBA')
        gun.putalpha(Image.fromarray((m[by0:by1, bx0:bx1] * 255).astype(np.uint8)))
        gx, gy = g['grip'][0] - g['box'][0] - bx0, g['grip'][1] - g['box'][1] - by0
        if g['flip']:
            gun = gun.transpose(Image.FLIP_LEFT_RIGHT)
            gx = gun.width - gx
        gun.save(images / f'gun-{name}.png')
        meta[f'gun-{name}'] = {'w': gun.width, 'h': gun.height, 'grip': [int(gx), int(gy)], 'scale': g['width'] / gun.width}
    return meta


def cut(suit: str):
    cfg = SUITS[suit]
    out = cfg['out']
    sheet = Image.open(cfg['sheet']).convert('RGB')
    x0, y0, x1, y1 = cfg['fig']
    rgb = np.array(sheet.crop(cfg['fig']))
    mask = figure_mask(rgb, cfg['fig'], cfg['feet_y'])
    (out / 'images').mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, (poly, pivot) in cfg['parts'].items():
        pm = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(pm).polygon([(x - x0, y - y0) for x, y in poly], fill=255)
        m = mask & (np.array(pm) > 0)
        ys, xs = np.nonzero(m)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        a = Image.fromarray((m[by0:by1, bx0:bx1] * 255).astype(np.uint8))
        part = Image.fromarray(rgb[by0:by1, bx0:bx1]).convert('RGBA')
        part.putalpha(a)
        part.save(out / 'images' / f'{name}.png')
        meta[name] = {'x': int(bx0 + x0), 'y': int(by0 + y0), 'w': int(bx1 - bx0), 'h': int(by1 - by0), 'pivot': list(pivot)}
    meta.update(cut_arsenal(out / 'images'))
    # a preview of the whole cut-out, to check the background removal
    full = Image.fromarray(rgb).convert('RGBA')
    full.putalpha(Image.fromarray((mask * 255).astype(np.uint8)))
    full.save(out / 'cutout-preview.png')
    (out / 'parts.json').write_text(json.dumps(meta, indent=1))
    print(f'{suit}: wrote {len(meta)} parts to {out}')


if __name__ == '__main__':
    import sys
    for s in sys.argv[1:] or list(SUITS):
        cut(s)
