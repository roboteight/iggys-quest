"""Cuts the harpoon head off Grandfather Gloom's cannon (art-src/spine/gloom/images/cannonFore.png, made by gloom-cut.py) and
turns it to point right, for the harpoon he fires: public/foes/gloom-harpoon.png.

  python tools/gloom-harpoon.py
"""
import json
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TAIL, TIP = (296, 714), (370, 800)  # along the spear, in sheet px


def main():
    m = json.loads((ROOT / 'art-src/spine/gloom/parts.json').read_text())['cannonFore']
    im = Image.open(ROOT / 'art-src/spine/gloom/images/cannonFore.png').convert('RGBA')
    head = im.crop((TAIL[0] - 8 - m['x'], TAIL[1] - m['y'], TIP[0] + 4 - m['x'], TIP[1] + 4 - m['y']))
    a = math.degrees(math.atan2(TIP[1] - TAIL[1], TIP[0] - TAIL[0]))
    out = head.rotate(a, resample=Image.BICUBIC, expand=True)
    out = out.crop(out.getbbox())
    px = out.load()
    for y in range(out.height):  # (the cannon's collar, caught under the shaft at the back end)
        for x in range(int(out.width * 0.34)):
            if y > out.height * 0.6:
                px[x, y] = (0, 0, 0, 0)
    out = out.crop(out.getbbox())
    out.save(ROOT / 'public/foes/gloom-harpoon.png')
    print('wrote public/foes/gloom-harpoon.png', out.size)


if __name__ == '__main__':
    main()
