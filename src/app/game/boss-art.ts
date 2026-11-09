import Phaser from 'phaser';
import { gfx } from './art';
import type { LevelStyle } from './levels';

/** Boss mechs: one hand-drawn walker per level. Every texture is 170x180, faces LEFT, feet on y = 178. */
export const BOSS_W = 170;
export const BOSS_H = 180;
const OUT = 0x07070b;

class Pen {
  constructor(readonly g: Phaser.GameObjects.Graphics) {}
  poly(pts: number[], fill: number) {
    const p: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) p.push(new Phaser.Math.Vector2(pts[i], pts[i + 1]));
    this.g.fillStyle(fill, 1).fillPoints(p, true);
    this.g.lineStyle(3, OUT, 1).strokePoints(p, true, true);
  }
  rect(x: number, y: number, w: number, h: number, fill: number, r = 3) {
    this.g.fillStyle(fill, 1).fillRoundedRect(x, y, w, h, r);
    this.g.lineStyle(3, OUT, 1).strokeRoundedRect(x, y, w, h, r);
  }
  ell(x: number, y: number, w: number, h: number, fill: number) {
    this.g.fillStyle(fill, 1).fillEllipse(x, y, w, h);
    this.g.lineStyle(3, OUT, 1).strokeEllipse(x, y, w, h);
  }
  line(pts: number[], w: number, color: number) {
    const p: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < pts.length; i += 2) p.push(new Phaser.Math.Vector2(pts[i], pts[i + 1]));
    this.g.lineStyle(w + 4, OUT, 1).strokePoints(p, false, false);
    this.g.lineStyle(w, color, 1).strokePoints(p, false, false);
  }
  /** a glowing lamp: bright and haloed when the mech is charging an attack */
  lamp(x: number, y: number, r: number, color: number, glow: boolean) {
    if (glow) this.g.fillStyle(color, 0.3).fillCircle(x, y, r * 2.6);
    this.g.fillStyle(glow ? 0xffffff : color, 1).fillCircle(x, y, r);
    this.g.lineStyle(2, glow ? color : OUT, 1).strokeCircle(x, y, r);
  }
}

type Draw = (p: Pen, glow: boolean) => void;

/** 1. Rooftops: a hunched, bird-legged enforcer with a small head turret and a cannon on each arm. */
const enforcer: Draw = (p, glow) => {
  const STEEL = 0x8e98a8, DARK = 0x3a4150, LIGHT = 0xc4ccd8;
  p.line([112, 98, 136, 128, 112, 156], 11, DARK); // back leg: hip -> backwards knee -> ankle
  p.poly([96, 164, 136, 164, 140, 177, 88, 177], DARK);
  p.line([92, 98, 120, 126, 92, 156], 13, STEEL); // front leg
  p.poly([72, 162, 118, 162, 122, 177, 62, 177], STEEL);
  p.poly([52, 50, 124, 46, 140, 84, 120, 112, 66, 112, 46, 80], STEEL); // hunched torso
  p.rect(70, 64, 46, 10, DARK); p.rect(70, 82, 46, 8, DARK); // vents
  p.poly([34, 40, 72, 30, 76, 60, 38, 66], LIGHT); // head turret
  p.rect(36, 46, 30, 8, DARK);
  p.lamp(46, 50, 3, 0xff3030, glow); p.lamp(58, 50, 3, 0xff3030, glow);
  p.rect(8, 82, 56, 16, DARK); p.rect(2, 85, 16, 10, 0x15171e); // big arm cannon + muzzle
  p.rect(30, 100, 40, 12, STEEL);
  p.rect(14, 104, 30, 10, DARK); p.rect(8, 106, 10, 6, 0x15171e);
  p.lamp(20, 90, 2.4, 0xff7a30, glow);
};

/** 2. Spindle Hollow: a crooked, striped jack-in-the-box on a coiled spring, with a wide grin and bat wings. */
const jackbox: Draw = (p, glow) => {
  const A = 0x7a3fa8, B = 0xf0a23a, DARK = 0x2a1740;
  for (let i = 0; i < 5; i++) p.ell(82, 168 - i * 11, 54 - i * 2, 11, i % 2 ? 0xb8bcc8 : 0x6d7280); // spring base
  p.rect(48, 112, 70, 14, DARK);
  for (let i = 0; i < 4; i++) p.rect(54 + i * 16, 84, 14, 34, i % 2 ? A : B); // striped crooked crate
  p.poly([46, 84, 122, 80, 126, 70, 42, 74], DARK);
  p.line([46, 84, 14, 60, 22, 32], 8, DARK); p.poly([22, 32, 8, 56, 30, 52], A); // left wing arm
  p.line([122, 82, 152, 60, 146, 34], 8, DARK); p.poly([146, 34, 132, 54, 156, 56], A);
  p.ell(82, 46, 70, 62, 0xf4e9d0); // grinning head
  p.poly([54, 28, 62, 6, 76, 26], A); p.poly([90, 26, 104, 6, 110, 30], B); // jester horns
  p.lamp(68, 40, 6, 0xff2d6a, glow); p.lamp(96, 40, 6, 0xff2d6a, glow);
  p.rect(58, 56, 50, 12, DARK, 5);
  for (let x = 62; x < 106; x += 8) p.g.fillStyle(0xf4e9d0, 1).fillRect(x, 57, 4, 7);
};

/** 3. Rust Wastes: a four-legged scorpion walker with a cannon on its tail and pincer arms. */
const scorpion: Draw = (p, glow) => {
  const RUST = 0xb5602f, DARK = 0x4a2412, PLATE = 0xd8944f;
  [[44, 100, 16, 130, 10, 176], [62, 108, 40, 138, 34, 176], [100, 108, 124, 138, 134, 176], [118, 100, 150, 128, 158, 176]].forEach((l, i) =>
    p.line(l, 8, i % 2 ? DARK : RUST));
  p.line([112, 82, 156, 66, 154, 30, 126, 16], 12, DARK); // tail curling up and over
  p.poly([108, 6, 134, 10, 132, 30, 114, 28], RUST); p.rect(98, 14, 22, 9, DARK); p.rect(92, 16, 10, 5, 0x15171e);
  p.lamp(122, 22, 3, 0xffd23a, glow);
  p.poly([34, 84, 66, 70, 130, 74, 144, 100, 120, 118, 54, 118], RUST); // body
  p.poly([50, 84, 74, 78, 80, 100, 56, 106], PLATE); p.poly([88, 80, 120, 82, 124, 102, 94, 104], PLATE);
  p.line([40, 94, 14, 90, 8, 70], 9, DARK); p.poly([8, 70, 2, 58, 22, 62, 24, 78], RUST); // pincer
  p.line([54, 100, 26, 112, 12, 100], 8, DARK); p.poly([12, 100, 2, 108, 8, 118, 22, 112], RUST);
  p.lamp(46, 86, 4, 0xff3a1a, glow); p.lamp(58, 82, 3, 0xff3a1a, glow);
};

/** 4. Drowned Metropolis: a deep-sea diving-suit mech: round glass dome, bolted hull, claw hands and heavy boots. */
const diver: Draw = (p, glow) => {
  const BRASS = 0x9a8a3c, TEAL = 0x2f7a78, DARK = 0x10302f, KELP = 0x2fae6a;
  p.rect(48, 128, 30, 34, TEAL); p.rect(92, 128, 30, 34, TEAL); // thick legs
  p.rect(36, 160, 48, 18, BRASS); p.rect(88, 160, 50, 18, BRASS);
  p.ell(85, 100, 100, 82, TEAL); // barrel hull
  for (const [x, y] of [[48, 84], [60, 120], [110, 120], [122, 84], [85, 66]]) p.lamp(x, y, 4, BRASS, false);
  p.rect(60, 90, 50, 20, DARK); p.lamp(72, 100, 4, 0x4affc0, glow); p.lamp(98, 100, 4, 0x4affc0, glow);
  p.ell(85, 48, 66, 58, 0xaee4e0); // glass dome
  p.g.fillStyle(0xffffff, 0.45).fillEllipse(70, 36, 18, 10);
  p.lamp(76, 52, 6, 0xff5a5a, glow); p.lamp(98, 52, 6, 0xff5a5a, glow);
  p.rect(72, 74, 26, 8, BRASS);
  p.line([36, 96, 12, 112, 10, 140], 14, BRASS); p.line([134, 96, 156, 112, 156, 140], 14, BRASS);
  p.poly([10, 140, -4 + 6, 160, 12, 156, 22, 162, 24, 144], KELP); // left claw
  p.poly([156, 140, 148, 162, 158, 156, 168, 160, 170, 144], KELP);
  p.line([60, 22, 52, 8, 40, 14], 3, KELP);
};

/** 5. Neon Void: a tall, hovering sentinel: a floating torso over a glowing ring, with a cannon on a boom. */
const warden: Draw = (p, glow) => {
  const HULL = 0x28134f, NEON = 0xff3df0, CYAN = 0x3df0ff;
  p.g.fillStyle(CYAN, 0.18).fillEllipse(85, 172, 120, 14); // glow on the ground
  p.g.lineStyle(7, OUT, 1).strokeEllipse(85, 150, 104, 26);
  p.g.lineStyle(4, glow ? 0xffffff : CYAN, 1).strokeEllipse(85, 150, 104, 26);
  p.poly([70, 140, 100, 140, 108, 100, 62, 100], HULL); // hover pylon
  p.poly([46, 60, 124, 60, 134, 100, 36, 100], HULL); // shoulders
  p.line([46, 74, 124, 74], 3, NEON); p.line([40, 88, 130, 88], 3, NEON);
  p.poly([58, 10, 112, 10, 122, 58, 48, 58], HULL); // tall head
  p.rect(60, 24, 50, 12, 0x0b0420);
  p.lamp(72, 30, 5, NEON, glow); p.lamp(98, 30, 5, NEON, glow);
  p.poly([82, 0, 88, 0, 90, 10, 80, 10], CYAN);
  p.line([40, 80, 18, 100, 6, 92], 10, HULL); p.rect(-2, 86, 34, 14, HULL); p.rect(-4, 89, 12, 8, 0x0b0420);
  p.lamp(30, 93, 3, CYAN, glow);
  p.line([130, 80, 150, 100, 160, 120], 10, HULL); p.poly([152, 118, 168, 118, 164, 138, 156, 138], NEON);
};

/** 6. Spore Garden: a tripod walker under a huge mushroom-cap hull with glowing gills and spore pods. */
const mother: Draw = (p, glow) => {
  const CAP = 0x8b2fc9, GILL = 0xe9a8ff, STEM = 0x3d5a46, GLOW = 0x6dffb0;
  p.line([60, 100, 30, 140, 26, 176], 10, STEM); p.line([110, 100, 140, 138, 146, 176], 10, STEM);
  p.line([85, 100, 85, 176], 12, STEM);
  p.rect(66, 96, 38, 30, STEM);
  p.poly([0, 82, 20, 40, 60, 14, 110, 14, 150, 40, 170, 82, 120, 96, 50, 96], CAP); // cap
  p.g.fillStyle(GILL, 1).fillRect(24, 82, 122, 8);
  for (let x = 28; x < 144; x += 9) p.g.lineStyle(2, OUT, 1).lineBetween(x, 82, x, 90);
  for (const [x, y, r] of [[50, 44, 7], [92, 30, 9], [128, 52, 6], [70, 62, 5]]) p.ell(x, y, r * 2, r * 2, 0xf4d4ff);
  p.lamp(66, 112, 5, GLOW, glow); p.lamp(104, 112, 5, GLOW, glow);
  p.line([66, 126, 30, 120, 12, 132], 9, STEM); p.ell(12, 134, 22, 22, GLOW); // pod launchers
  p.line([104, 126, 140, 120, 158, 132], 9, STEM); p.ell(158, 134, 22, 22, GLOW);
};

/** 7. Ember Trenches: the Iron Marshal, a siege tank on long treads with a huge gun, and a commander's hatch. */
const tank: Draw = (p, glow) => {
  const OLIVE = 0x68763f, DARK = 0x2e3520, STEEL = 0x88917b, RUST = 0x95502a;
  p.rect(12, 140, 150, 38, DARK, 16); // tread
  for (const x of [34, 62, 90, 118, 146]) p.ell(x, 159, 22, 22, STEEL); // road wheels
  p.rect(16, 136, 142, 8, OLIVE, 3); // fender
  p.poly([20, 138, 40, 102, 142, 96, 160, 138], OLIVE); // hull
  p.rect(58, 112, 64, 8, DARK);
  p.rect(58, 124, 64, 6, DARK); // vents
  p.poly([68, 98, 82, 60, 134, 58, 148, 96], STEEL); // turret
  p.rect(92, 44, 34, 16, DARK, 5); // commander's cupola
  p.rect(100, 36, 18, 10, RUST, 3);
  p.rect(0, 72, 86, 16, DARK); // long gun
  p.rect(0, 68, 22, 24, STEEL); // muzzle brake
  p.rect(68, 64, 20, 34, OLIVE); // gun mantlet
  p.lamp(112, 76, 4, 0xff3030, glow);
  p.lamp(128, 76, 4, 0xff3030, glow);
  p.line([146, 58, 156, 14], 3, DARK); // antenna
  p.poly([34, 118, 46, 110, 48, 122, 38, 126], RUST); // a rusted patch on the hull
  p.ell(54, 124, 12, 12, 0xe9e6d8); // star
};

const DRAWERS: Record<LevelStyle, Draw> = { city: enforcer, hollow: jackbox, wastes: scorpion, drowned: diver, void: warden, spores: mother, war: tank };

export function makeBossTextures(scene: Phaser.Scene, style: LevelStyle) {
  if (scene.textures.exists(`boss-${style}-a`)) return;
  (['a', 'b'] as const).forEach((f) => {
    const g = gfx(scene);
    DRAWERS[style](new Pen(g), f === 'b');
    g.generateTexture(`boss-${style}-${f}`, BOSS_W, BOSS_H);
    g.destroy();
  });
  if (scene.textures.exists('boss-orb')) return;
  const o = gfx(scene);
  o.fillStyle(0xff7a1a, 0.35).fillCircle(12, 12, 12);
  o.fillStyle(0xffd23a, 1).fillCircle(12, 12, 7);
  o.lineStyle(3, OUT, 1).strokeCircle(12, 12, 7);
  o.generateTexture('boss-orb', 24, 24);
  o.destroy();
  const w = gfx(scene);
  w.fillStyle(0xff5a1a, 1).fillTriangle(0, 28, 36, 28, 18, 0);
  w.lineStyle(3, OUT, 1).strokeTriangle(0, 28, 36, 28, 18, 0);
  w.fillStyle(0xffe27a, 1).fillTriangle(10, 26, 26, 26, 18, 10);
  w.generateTexture('boss-wave', 36, 30);
  w.destroy();
}
