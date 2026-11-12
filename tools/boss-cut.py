"""Cuts the level 8 to 12 bosses (art-src/bosses/<boss>.webp, landscape sheets) into rig parts.

  python tools/boss-cut.py [boss...]     (needs Pillow, NumPy and SciPy, like tools/iggy-cut.py, whose paper removal it reuses)

Each boss is its main drawing split into a few parts, plus pieces from the sheet's separate drawings (a spinning wheel or rotor,
an open hatch, the eyes shut) that the rig swaps in or moves. Writes art-src/spine/<boss>/images/<part>.png and parts.json
(box and pivot in sheet pixels), and cutout-parts.png (each part tinted) to check the cut lines.

A part is (polygon or box, pivot). Parts taken from the main drawing are cut in order, each taking its pixels first; 'rest' is
whatever the main drawing has left. A part with 'place' is a separate drawing: it is drawn where 'place' says on the sheet
(its pivot lands on that point, scaled by 'scale'), so the rig can lay it over the main drawing.
"""
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('iggy_cut', ROOT / 'tools/iggy-cut.py')
iggy_cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iggy_cut)


def box(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


BOSSES = {
    # the level 4 to 7 bosses (portrait sheets, each drawn facing right or front-on)
    'diver': {
        'main': box(38, 95, 738, 918),
        'parts': {
            'gunArm': ([(38, 330), (242, 330), (252, 420), (302, 470), (408, 598), (384, 628), (290, 604), (150, 562), (38, 504)], (215, 342)),
            'clawArm': ([(470, 400), (562, 400), (652, 458), (738, 458), (738, 578), (560, 524), (470, 474)], (492, 432)),
            'legL': ([(150, 604), (322, 604), (332, 892), (128, 892)], (250, 612)),
            'legR': ([(400, 604), (572, 604), (588, 832), (395, 832)], (482, 612)),
            'rest': (None, (360, 880)),
        },
        'feet': (360, 880),
    },
    'nwarden': {
        'main': box(55, 40, 738, 822),
        'parts': {
            'gunArm': ([(55, 360), (252, 360), (262, 452), (342, 598), (342, 642), (252, 642), (55, 562)], (232, 382)),
            'clawArm': ([(470, 420), (738, 420), (738, 582), (560, 542), (470, 482)], (502, 442)),
            'rest': (None, (322, 812)),
        },
        'feet': (322, 812),
    },
    'spore': {
        'main': box(38, 52, 748, 962),
        'parts': {
            'cap': ([(138, 52), (545, 52), (545, 318), (138, 318)], (342, 318)),
            'gunArm': ([(38, 362), (262, 362), (282, 470), (38, 482)], (262, 392)),
            'clawArm': ([(450, 362), (562, 362), (722, 478), (722, 582), (560, 542), (450, 442)], (472, 392)),
            'legL': ([(128, 580), (300, 580), (276, 962), (38, 962), (58, 800)], (285, 600)),
            'legR': ([(478, 560), (662, 560), (748, 800), (748, 962), (498, 962)], (500, 590)),
            'rest': (None, (392, 940)),
        },
        'feet': (392, 940),
        'mask': dict(light_min=150, flat_max=55, pocket=3.2),
        'clear_bright': [(236, 600, 330, 945)],  # paper showing between its near leg and the rear one
    },
    'marshal': {
        'main': box(28, 118, 732, 722),
        'parts': {
            'cannon': ([(388, 338), (682, 338), (682, 422), (388, 422)], (432, 380)),
            'clawArm': ([(560, 418), (732, 418), (732, 542), (560, 522)], (580, 470)),
            'head': ([(272, 138), (425, 138), (425, 292), (272, 292)], (352, 290)),
            'rest': (None, (380, 700)),
        },
        'feet': (380, 700),
    },
    # level 3's Dust Scorpion (a portrait sheet, drawn facing right): the tail, both pincer arms and the rest
    'scorpion': {
        'main': box(55, 110, 742, 762),
        'parts': {
            'tail': ([(170, 110), (470, 110), (470, 292), (352, 292), (346, 258), (280, 258), (272, 342), (198, 342), (170, 300)], (238, 330)),
            'clawNear': ([(236, 532), (320, 532), (366, 572), (430, 640), (536, 640), (536, 762), (300, 762), (240, 622)], (292, 560)),
            'clawFar': ([(545, 418), (742, 418), (742, 652), (612, 652), (545, 502)], (575, 452)),
            'rest': (None, (430, 740)),
        },
        'feet': (430, 740),
        'mask': dict(light_min=168, flat_max=80, pocket=2.0),  # the tan dust clouds round its legs count as paper
        'dust_y': 470,  # below this, light tan is the dust it kicks up, not the machine
    },
    'icebreaker': {
        'main': box(215, 70, 802, 652),
        'parts': {
            'prow': (box(282, 488, 452, 640), (395, 520)),
            'turret': (box(300, 228, 405, 280), (372, 262)),
            'rest': (None, (510, 640)),
            'hatchOpen': (box(893, 378, 992, 502), (942, 440), {'place': (612, 405), 'scale': 1.15}),
        },
        'feet': (510, 640),
    },
    'dredger': {
        'main': box(100, 45, 870, 640),
        'parts': {
            # the wheel as the body draws it (at an angle): it rocks as it digs
            'wheel': ([(100, 330), (330, 330), (348, 420), (340, 600), (100, 600)], (222, 468)),
            'rest': (None, (560, 620)),
            'engineHot': (box(852, 328, 975, 480), (913, 404), {'place': (742, 377), 'scale': 0.82}),
        },
        'feet': (560, 625),
    },
    'warden': {
        'main': box(268, 52, 795, 702),
        'parts': {
            'armL': (box(268, 255, 400, 565), (355, 290)),
            'armR': (box(640, 255, 795, 565), (660, 290)),
            'rest': (None, (532, 698)),
            'rotor': (box(58, 338, 238, 505), (148, 420), {'place': (503, 257), 'scale': 0.98}),
            'motor': (box(800, 325, 965, 505), (875, 415), {'place': (503, 257), 'scale': 1.05}),
        },
        'feet': (532, 698),
    },
    'kraken': {
        'main': box(68, 72, 822, 738),
        'parts': {
            'tentL': (box(68, 365, 300, 620), (290, 470)),
            'rest': (None, (470, 700)),
            'tentacle': ([(758, 428), (985, 428), (985, 560), (955, 720), (820, 722), (790, 560), (758, 520)], (790, 450), {'place': (300, 470), 'scale': 1.0}),
            'eyesShut': (box(742, 72, 852, 182), (797, 127), {'place': (537, 307), 'scale': 0.62}),
            'eyesShut2': (box(742, 72, 852, 182), (797, 127), {'place': (418, 290), 'scale': 0.5}),
        },
        'feet': (470, 700),
    },
    'albatross': {
        'main': box(258, 58, 832, 672),
        'parts': {
            'propFront': (box(640, 470, 830, 610), (705, 525)),
            'rest': (None, (545, 650)),
            'turret': (box(52, 578, 222, 682), (140, 640), {'place': (505, 560), 'scale': 0.6}),
        },
        'feet': (545, 650),
    },
}
SHEETS = {'diver': 'deep-diver', 'nwarden': 'neon-warden', 'spore': 'spore-mother', 'marshal': 'iron-marshal', 'scorpion': 'dust-scorpion', 'icebreaker': 'icebreaker', 'dredger': 'dune-dredger', 'warden': 'gale-warden', 'kraken': 'brass-kraken', 'albatross': 'iron-albatross'}
# these sheets are stained and shaded more than the portrait ones
MASK = dict(light_min=150, flat_max=55, pocket=2.0)


def poly_mask(shape, poly):
    pm = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(pm).polygon(poly, fill=255)
    return np.array(pm) > 0


def cut(name):
    cfg = BOSSES[name]
    rgb = np.array(Image.open(ROOT / f'art-src/bosses/{SHEETS[name]}.webp').convert('RGB'))
    out = ROOT / f'art-src/spine/{name}'
    (out / 'images').mkdir(parents=True, exist_ok=True)
    main_area = poly_mask(rgb.shape, cfg['main'])
    meta, taken, seg = {}, np.zeros(rgb.shape[:2], bool), np.zeros((*rgb.shape[:2], 4), np.uint8)
    cols = [(230, 80, 80), (80, 200, 90), (80, 120, 230), (230, 200, 60), (200, 90, 220), (60, 210, 210)]
    # the figure mask over the whole sheet, so separate drawings and the main one share the same paper removal
    full = iggy_cut.figure_mask(rgb, (0, 0, rgb.shape[1], rgb.shape[0]), 10**6, **MASK) if False else None
    for i, (part, spec_) in enumerate(cfg['parts'].items()):
        poly, pivot = spec_[0], spec_[1]
        opts = spec_[2] if len(spec_) > 2 else {}
        if 'place' in opts:
            xs, ys = [p[0] for p in poly], [p[1] for p in poly]
            bx = (min(xs), min(ys), max(xs), max(ys))
            sub = rgb[bx[1]:bx[3], bx[0]:bx[2]]
            m = iggy_cut.figure_mask(sub, bx, 10**6, **cfg.get('mask', MASK))
            m = ndimage.binary_fill_holes(m) if part in ('motor', 'engineHot', 'hatchOpen', 'eyesShut', 'eyesShut2') else m
        else:
            area = main_area if poly is None else main_area & poly_mask(rgb.shape, poly)
            ys, xs = np.nonzero(area)
            bx = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
            sub = rgb[bx[1]:bx[3], bx[0]:bx[2]]
            m = iggy_cut.figure_mask(sub, bx, 10**6, **cfg.get('mask', MASK)) & area[bx[1]:bx[3], bx[0]:bx[2]] & ~taken[bx[1]:bx[3], bx[0]:bx[2]]
            for cx0, cy0, cx1, cy1 in cfg.get('clear_bright', []):
                yy0, yy1 = max(cy0 - bx[1], 0), max(cy1 - bx[1], 0)
                xx0, xx1 = max(cx0 - bx[0], 0), max(cx1 - bx[0], 0)
                win = sub[yy0:yy1, xx0:xx1].astype(int)
                bright = (win.mean(2) > 196) & ((win.max(2) - win.min(2)) < 60)
                m[yy0:yy1, xx0:xx1] &= ~bright
            if 'dust_y' in cfg:
                r, g, b_ = (sub[..., i].astype(int) for i in range(3))
                tan = (r > 172) & (g > 148) & (b_ > 100) & (r - b_ > 18) & (r - g < 48)
                rows = (np.arange(bx[1], bx[3]) >= cfg['dust_y'])[:, None]
                # only tan that runs out to the paper is dust; tan metal on the claws is closed in by ink
                cand = tan & rows & m
                lab0, _ = ndimage.label(cand)
                outside = ndimage.binary_dilation(~m, iterations=2)
                touching = set(np.unique(lab0[outside & cand])) - {0}
                m &= ~np.isin(lab0, list(touching))
                m = ndimage.binary_opening(m, iterations=1)
                lab, n = ndimage.label(m)
                if n > 1:  # drop the specks left behind
                    sizes = ndimage.sum(m, lab, range(1, n + 1))
                    m = np.isin(lab, 1 + np.nonzero(sizes >= 250)[0])
            taken[bx[1]:bx[3], bx[0]:bx[2]] |= m
            seg[bx[1]:bx[3], bx[0]:bx[2]][m] = (*cols[i % len(cols)], 150)
        yy, xx = np.nonzero(m)
        x0, y0, x1, y1 = xx.min(), yy.min(), xx.max() + 1, yy.max() + 1
        img = Image.fromarray(sub[y0:y1, x0:x1]).convert('RGBA')
        img.putalpha(Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8)))
        img.save(out / 'images' / f'{part}.png')
        entry = {'x': int(bx[0] + x0), 'y': int(bx[1] + y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'pivot': list(pivot)}
        if 'place' in opts:
            entry['place'] = list(opts['place'])
            entry['scale'] = opts['scale']
        meta[part] = entry
    prev = Image.fromarray(rgb).convert('RGBA')
    prev.alpha_composite(Image.fromarray(seg))
    prev.save(out / 'cutout-parts.png')
    (out / 'parts.json').write_text(json.dumps({'feet': list(cfg['feet']), 'parts': meta}, indent=1))
    print(f'{name}: {len(meta)} parts')


if __name__ == '__main__':
    for n in sys.argv[1:] or list(BOSSES):
        cut(n)
