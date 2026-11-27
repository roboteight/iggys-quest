"""Builds the app icons from Iggy's helmet (art-src/spine/iggy/images/head.png, cut from the Rusty sheet).

Run: .venv/bin/python tools/make-icons.py   (writes public/favicon.ico, icon-*.png, apple-touch-icon.png)
The favicon is a plain "IQ" monogram instead: the helmet turns to mush at 16 px.
The helmet sits on the game's night-blue with a warm glow behind the dome, its cut-off collar running off the bottom edge.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
HEAD = Image.open(ROOT / 'art-src/spine/iggy/images/head.png').convert('RGBA')
OUT = ROOT / 'public'
BG = (11, 16, 32)       # manifest background_color #0b1020
GLOW = (255, 170, 60)   # the logo's warm orange


def tile(size: int, head_w: float, crop_antenna: bool = False, glow: float = 0.55) -> Image.Image:
    """A square icon: background, glow, then the helmet `head_w` of the width across, standing on the bottom edge."""
    S = size * 4  # draw big, shrink once at the end for clean edges
    im = Image.new('RGBA', (S, S), BG + (255,))
    head = HEAD
    if crop_antenna:  # the favicon: just the dome (the antenna is a hairline at 16 px)
        head = head.crop((0, 82, head.width, head.height))
    w = int(S * head_w)
    h = int(head.height * w / head.width)
    head = head.resize((w, h), Image.LANCZOS)
    x, y = (S - w) // 2, S - h
    # glow behind the dome
    g = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    cx, cy, r = S // 2, y + int(h * (0.62 if crop_antenna else 0.68)), int(w * glow)
    ImageDraw.Draw(g).ellipse((cx - r, cy - r, cx + r, cy + r), fill=GLOW + (150,))
    g = g.filter(ImageFilter.GaussianBlur(S * 0.09))
    im = Image.alpha_composite(im, g)
    # a soft dark shadow so the glass edge reads against the glow
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sh.paste((0, 0, 0, 140), (x, y + S // 60), head.split()[3].point(lambda a: a))
    sh = sh.filter(ImageFilter.GaussianBlur(S * 0.012))
    im = Image.alpha_composite(im, sh)
    im.alpha_composite(head, (x, y))
    return im.resize((size, size), Image.LANCZOS).convert('RGB')


COPPER = (255, 164, 90)  # the menu's --glow
FONT = ROOT / 'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2'


def monogram(size: int) -> Image.Image:
    """The favicon: a bold copper "IQ" on a night-blue rounded square."""
    S = 512
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=S * 0.2, fill=BG + (255,))
    font = ImageFont.truetype(str(FONT), int(S * 0.62))
    font.set_variation_by_axes([700])
    box = d.textbbox((0, 0), 'IQ', font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((S - w) / 2 - box[0], (S - h) / 2 - box[1]), 'IQ', font=font, fill=COPPER + (255,))
    return im.resize((size, size), Image.LANCZOS)


def main():
    # "any": the helmet fills most of the square; maskable: kept inside the middle 80% circle that launchers keep
    for n in (192, 512):
        tile(n, 0.8).save(OUT / f'icon-{n}.png', optimize=True)
        tile(n, 0.66).save(OUT / f'icon-maskable-{n}.png', optimize=True)
    tile(180, 0.8).save(OUT / 'apple-touch-icon.png', optimize=True)
    fav = [monogram(n) for n in (16, 32, 48)]
    fav[2].save(OUT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=fav[:2])
    monogram(32).save(OUT / 'favicon-32.png', optimize=True)


if __name__ == '__main__':
    main()
