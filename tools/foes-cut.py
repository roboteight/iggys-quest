"""Cuts the sprites for the eight newer enemies out of their concept sheets (art-src/enemies/*.webp).

  python tools/foes-cut.py        (needs Pillow, NumPy and SciPy, like tools/iggy-cut.py, whose paper removal it reuses)

Writes public/foes/<name>.png at twice the size the game draws them (the game shows them at half scale, so they stay sharp),
and copies each sheet to public/art/<sheet>.webp for the landing page.
"""
import importlib.util
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-src/enemies'
OUT = ROOT / 'public/foes'

spec = importlib.util.spec_from_file_location('iggy_cut', ROOT / 'tools/iggy-cut.py')
iggy_cut = importlib.util.module_from_spec(spec)
spec.loader.exec_module(iggy_cut)

# sheet file, box on the sheet, height in the game (px). Every sheet is 765 x 1024.
SPRITES = {
    'gloop':        ('GloopTender', (60, 225, 615, 745), 64),
    'zeppelin':     ('RivetZeppelin', (80, 130, 700, 660), 74),
    'bomb':         ('RivetZeppelin', (405, 630, 490, 715), 18),
    'mite':         ('GlitchMite', (115, 160, 690, 665), 42),
    'minimite':     ('GlitchMite', (50, 875, 160, 965), 22),
    'copycat':      ('CopycatUnit', (90, 130, 450, 790), 74),
    'copycat-down': ('CopycatUnit', (64, 770, 320, 910), 30),
    'magnet':       ('ScrapMagnet', (35, 115, 705, 725), 92),
    'pogo':         ('PogoTrooper', (100, 125, 665, 860), 84),
    'rat':          ('RivetRats', (35, 130, 315, 325), 20),
    'magpie':       ('MagpieDrone', (50, 115, 704, 725), 52),
}
# the sheets as the landing page shows them
SHEETS = {'GloopTender': 'gloop-tender', 'RivetZeppelin': 'rivet-zeppelin', 'GlitchMite': 'glitch-mite', 'CopycatUnit': 'copycat-unit',
          'ScrapMagnet': 'scrap-magnet', 'PogoTrooper': 'pogo-trooper', 'RivetRats': 'rivet-rats', 'MagpieDrone': 'magpie-drone'}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (sheet, box, h) in SPRITES.items():
        rgb = np.array(Image.open(SRC / f'{sheet}.webp').convert('RGB').crop(box))
        m = iggy_cut.figure_mask(rgb, box, 10**6)
        ys, xs = np.nonzero(m)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        im = Image.fromarray(rgb[y0:y1, x0:x1]).convert('RGBA')
        im.putalpha(Image.fromarray((m[y0:y1, x0:x1] * 255).astype(np.uint8)))
        scale = (h * 2) / im.height
        im = im.resize((max(1, round(im.width * scale)), h * 2), Image.LANCZOS)
        im.save(OUT / f'{name}.png', optimize=True)
        print(f'{name}: {im.width}x{im.height}')
    for src, dst in SHEETS.items():
        shutil.copyfile(SRC / f'{src}.webp', ROOT / 'public/art' / f'{dst}.webp')


if __name__ == '__main__':
    main()
