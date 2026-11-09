import Phaser from 'phaser';

/** Everything visual that is drawn with code: the city skyline, rooftops, pickups and Iggy the robot. */

export const W = 960;
export const H = 540;

// ---------- seeded random so a skyline tile is stable ----------
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerpColor(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

export function gfx(scene: Phaser.Scene) {
  return scene.make.graphics({ x: 0, y: 0 }, false);
}

// ---------- Suits ----------
export interface Suit {
  name: string;
  blurb: string;
  /** rings jumped through needed to unlock */
  need: number;
  body: number;
  trim: number;
  dark: number;
  eye: number;
  /** 1 = falling to bits, 0 = pristine */
  loose: number;
  cape: boolean;
  ears: boolean;
  glow: boolean;
  plates: boolean;
}

export const SUITS: Suit[] = [
  { name: 'Rusty Original', blurb: 'Dented, leaking and held together by hope.', need: 0,
    body: 0xd8643a, trim: 0xa8472a, dark: 0x4a2a1c, eye: 0x2f7f95, loose: 1, cape: false, ears: false, glow: false, plates: false },
  { name: 'Patchwork', blurb: 'Fresh copper patches and a new left arm.', need: 3,
    body: 0xcf7a45, trim: 0x3f8f8a, dark: 0x3c2a22, eye: 0x2f7f95, loose: 0.65, cape: false, ears: false, glow: false, plates: false },
  { name: 'Steel Sentinel', blurb: 'Riveted steel plating. Hardly rattles.', need: 8,
    body: 0x8fa0b4, trim: 0x5a6a82, dark: 0x1f2735, eye: 0x1aa7c8, loose: 0.35, cape: false, ears: false, glow: false, plates: true },
  { name: 'Night Guardian', blurb: 'Matte black, a cape and pointed ears.', need: 15,
    body: 0x2f3547, trim: 0x59627a, dark: 0x0d1017, eye: 0xffc44a, loose: 0.15, cape: true, ears: true, glow: false, plates: true },
  { name: 'Gold Circuit', blurb: 'Gleaming. Everything finally works.', need: 25,
    body: 0xe2b53c, trim: 0xfff0a8, dark: 0x5a3d0a, eye: 0x25b866, loose: 0.02, cape: true, ears: true, glow: true, plates: true },
];

export function suitFor(rings: number) {
  let idx = 0;
  SUITS.forEach((s, i) => {
    if (rings >= s.need) idx = i;
  });
  return idx;
}

// ---------- Skyline textures ----------
const SKY_TOP = 0x05070d;
const SKY_MID = 0x141d2e;
const SKY_LOW = 0x3a3350;

export function makeSky(scene: Phaser.Scene) {
  const g = gfx(scene);
  const bands = 90;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = t < 0.6 ? lerpColor(SKY_TOP, SKY_MID, t / 0.6) : lerpColor(SKY_MID, SKY_LOW, (t - 0.6) / 0.4);
    g.fillStyle(c, 1).fillRect(0, (i * H) / bands, W, H / bands + 1);
  }
  // moon with halo
  for (let r = 150; r > 40; r -= 10) g.fillStyle(0xc9d6f0, 0.012 + (150 - r) * 0.00018).fillCircle(210, 110, r);
  g.fillStyle(0xe8eefc, 0.95).fillCircle(210, 110, 40);
  g.fillStyle(0xbac6e0, 0.6).fillCircle(198, 100, 9).fillCircle(224, 124, 6).fillCircle(220, 92, 5);
  // stars
  const r = rng(7);
  for (let i = 0; i < 60; i++) g.fillStyle(0xffffff, 0.2 + r() * 0.5).fillRect(r() * W, r() * 230, 2, 2);
  g.generateTexture('sky', W, H);
  g.destroy();
}

interface LayerOpts {
  key: string;
  seed: number;
  color: number;
  windowColor: number;
  windowChance: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  detail: number; // chance of decorative extras (spires, battlements, water towers)
  haze: number; // alpha of fog gradient on this layer's base
}

function ornateTower(g: Phaser.GameObjects.Graphics, x: number, top: number, w: number, base: number, color: number, r: () => number, detail: number) {
  g.fillStyle(color, 1).fillRect(x, top, w, base - top);
  const d = r();
  if (d < detail * 0.5) {
    // pointed spire
    g.fillTriangle(x + 2, top, x + w - 2, top, x + w / 2, top - w * (1.2 + r()));
    g.fillRect(x + w / 2 - 1, top - w * 2.4, 2, w * 1.0);
  } else if (d < detail) {
    // battlement with buttress pillars and gargoyle bumps
    for (let bx = x; bx < x + w - 4; bx += 10) g.fillRect(bx, top - 6, 6, 6);
    g.fillRect(x - 4, top - 14, 6, 14);
    g.fillRect(x + w - 2, top - 14, 6, 14);
    g.fillTriangle(x - 4, top - 14, x + 2, top - 14, x - 1, top - 26);
    g.fillTriangle(x + w - 2, top - 14, x + w + 4, top - 14, x + w + 1, top - 26);
  } else if (d < detail + 0.1) {
    // water tower
    const tx = x + w * 0.3;
    g.fillRect(tx, top - 18, 3, 18).fillRect(tx + 18, top - 18, 3, 18);
    g.fillRect(tx - 4, top - 42, 29, 26);
    g.fillTriangle(tx - 5, top - 42, tx + 26, top - 42, tx + 10, top - 56);
  } else if (d < detail + 0.2) {
    // antenna
    g.fillRect(x + w / 2, top - 40, 2, 40);
    g.fillRect(x + w / 2 - 6, top - 30, 14, 2);
  }
}

export function makeSkyline(scene: Phaser.Scene, o: LayerOpts) {
  const g = gfx(scene);
  const TW = 1280;
  const r = rng(o.seed);
  const base = H;
  let x = 0;
  const towers: [number, number, number][] = [];
  while (x < TW) {
    const w = Math.min(o.minW + r() * (o.maxW - o.minW), TW - x);
    if (w < 24) break;
    const top = base - (o.minH + r() * (o.maxH - o.minH));
    towers.push([x, top, w]);
    x += w + (r() < 0.25 ? 6 + r() * 14 : -2);
  }
  towers.forEach(([tx, top, w]) => ornateTower(g, tx, top, w, base, o.color, r, o.detail));
  // windows
  towers.forEach(([tx, top, w]) => {
    for (let wy = top + 12; wy < base - 12; wy += 14) {
      for (let wx = tx + 6; wx < tx + w - 8; wx += 11) {
        if (r() < o.windowChance) g.fillStyle(o.windowColor, 0.35 + r() * 0.55).fillRect(wx, wy, 4, 6);
      }
    }
  });
  // low fog on the layer
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    g.fillStyle(0x4a5a78, (o.haze * i) / steps / 3).fillRect(0, base - 260 + (i * 260) / steps, TW, 260 / steps + 1);
  }
  g.generateTexture(o.key, TW, H);
  g.destroy();
}

export function makeFog(scene: Phaser.Scene) {
  const g = gfx(scene);
  const r = rng(3);
  for (let i = 0; i < 26; i++) {
    const x = r() * 1024, y = 20 + r() * 60, w = 140 + r() * 200;
    for (let k = 3; k >= 0; k--) g.fillStyle(0x8fa0c0, 0.02).fillEllipse(x, y, w + k * 40, 24 + k * 10);
    // wrap-around copy so the tile is seamless
    if (x + w > 1000) for (let k = 3; k >= 0; k--) g.fillStyle(0x8fa0c0, 0.02).fillEllipse(x - 1024, y, w + k * 40, 24 + k * 10);
  }
  g.generateTexture('fog', 1024, 120);
  g.destroy();
}

export function makeRain(scene: Phaser.Scene) {
  const g = gfx(scene);
  const r = rng(11);
  g.lineStyle(1, 0xaec4e8, 0.35);
  for (let i = 0; i < 70; i++) {
    const x = r() * 256, y = r() * 256;
    g.lineBetween(x, y, x - 3, y + 12);
  }
  g.generateTexture('rain', 256, 256);
  g.destroy();
}

// ---------- Small textures ----------
export function makeSmallTextures(scene: Phaser.Scene) {
  let g = gfx(scene);
  // soft dust puff
  for (let r = 10; r > 0; r--) g.fillStyle(0xd6cdbd, 0.1).fillCircle(12, 12, r + 2);
  g.generateTexture('dust', 24, 24);
  g.destroy();

  g = gfx(scene);
  g.fillStyle(0xffe9a0, 1).fillRect(0, 0, 4, 4);
  g.generateTexture('spark', 4, 4);
  g.destroy();

  // bolt / screw falling off
  g = gfx(scene);
  g.fillStyle(0xb8b8c4, 1).fillRect(2, 0, 4, 8).fillStyle(0x7d7d8c, 1).fillRect(0, 0, 8, 3);
  g.generateTexture('bolt', 8, 8);
  g.destroy();

  // cog
  g = gfx(scene);
  g.fillStyle(0x9aa3b2, 1).fillCircle(6, 6, 4);
  for (let a = 0; a < 6; a++) g.fillRect(6 + Math.cos((a * Math.PI) / 3) * 4.5 - 1, 6 + Math.sin((a * Math.PI) / 3) * 4.5 - 1, 2.5, 2.5);
  g.fillStyle(0x1a1a22, 1).fillCircle(6, 6, 1.6);
  g.generateTexture('cog', 12, 12);
  g.destroy();

  // BREADBOARD collectible
  g = gfx(scene);
  const bw = 40, bh = 26;
  g.fillStyle(0x000000, 1).fillRoundedRect(0, 0, bw, bh, 3); // outline for contrast on any background
  g.fillStyle(0xf3efe3, 1).fillRoundedRect(1.5, 1.5, bw - 3, bh - 3, 2);
  g.fillStyle(0xe34b4b, 1).fillRect(4, 4, bw - 8, 2); // power rail +
  g.fillStyle(0x3b6fe0, 1).fillRect(4, 7, bw - 8, 2); // power rail -
  g.fillStyle(0xd9d3bf, 1).fillRect(4, 12, bw - 8, 2); // centre channel
  g.fillStyle(0xd9d3bf, 1).fillRect(4, 12, bw - 8, 2);
  for (let x = 6; x < bw - 5; x += 4) {
    g.fillStyle(0x2d2d33, 1).fillRect(x, 10, 1.6, 1.6).fillRect(x, 16, 1.6, 1.6).fillRect(x, 19, 1.6, 1.6).fillRect(x, 22, 1.6, 0);
  }
  g.fillStyle(0x2d2d33, 1).fillRect(10, 15, 1.4, 1.4);
  // a jumper wire and an LED
  g.lineStyle(2, 0x2fbf71, 1).lineBetween(10, 17, 10, 10).lineBetween(10, 10, 22, 10);
  g.fillStyle(0xff5d5d, 1).fillCircle(30, 18, 2.6);
  g.generateTexture('breadboard', bw, bh);
  g.destroy();

  // GOLDEN BREADBOARD: the secret collectible, bigger and gold with a halo so it reads on any background
  g = gfx(scene);
  const gw = 52, gh = 38;
  for (let r = 19; r > 8; r--) g.fillStyle(0xffe27a, 0.06).fillCircle(gw / 2, gh / 2, r + 7);
  g.fillStyle(0x000000, 1).fillRoundedRect(6, 6, 40, 26, 3);
  g.fillStyle(0xffd23a, 1).fillRoundedRect(7.5, 7.5, 37, 23, 2);
  g.fillStyle(0xfff3b0, 1).fillRect(10, 10, 32, 2);
  g.fillStyle(0xb8860b, 1).fillRect(10, 13, 32, 2).fillRect(10, 20, 32, 2);
  for (let x = 12; x < 42; x += 4) g.fillStyle(0x6b4a00, 1).fillRect(x, 16, 1.6, 1.6).fillRect(x, 24, 1.6, 1.6);
  g.fillStyle(0xffffff, 1).fillCircle(42, 11, 2.4);
  g.generateTexture('secret', gw, gh);
  g.destroy();

  // spark pylon hazard (frayed power cable on a post)
  g = gfx(scene);
  g.fillStyle(0x16181f, 1).fillRect(0, 34, 30, 8);
  g.fillStyle(0x5b6272, 1).fillRect(12, 8, 6, 28);
  g.fillStyle(0xffd23f, 1).fillRect(8, 20, 14, 4).fillStyle(0x16181f, 1).fillRect(10, 20, 2, 4).fillRect(16, 20, 2, 4);
  g.lineStyle(2, 0xffe76a, 1).lineBetween(15, 8, 9, 3).lineBetween(9, 3, 16, 0).lineBetween(16, 0, 21, 5);
  g.generateTexture('pylon', 30, 42);
  g.destroy();

  // power-ups: glowing orb with a glyph
  const orb = (key: string, color: number, glyph: (g: Phaser.GameObjects.Graphics) => void) => {
    const o = gfx(scene);
    for (let r = 26; r > 16; r -= 3) o.fillStyle(color, 0.12).fillCircle(28, 28, r);
    o.fillStyle(0x000000, 1).fillCircle(28, 28, 17);
    o.fillStyle(color, 1).fillCircle(28, 28, 15);
    o.fillStyle(0x10131c, 1);
    glyph(o);
    o.generateTexture(key, 56, 56);
    o.destroy();
  };
  orb('pu-spring', 0x6dffa4, (o) => {
    o.lineStyle(3, 0x10131c, 1);
    for (let i = 0; i < 4; i++) o.lineBetween(21, 20 + i * 5, 35, 22 + i * 5);
    o.fillRect(20, 38, 16, 3);
  });
  orb('pu-magnet', 0xff6b6b, (o) => {
    o.lineStyle(5, 0x10131c, 1).beginPath().arc(28, 30, 8, Math.PI, 0, false).strokePath();
    o.fillRect(18, 29, 5, 9).fillRect(33, 29, 5, 9);
    o.fillStyle(0xffffff, 1).fillRect(18, 36, 5, 3).fillRect(33, 36, 5, 3);
  });
  orb('pu-shield', 0x7dd3ff, (o) => {
    o.fillTriangle(19, 20, 37, 20, 28, 39).fillRect(19, 20, 18, 7);
  });
  orb('pu-turbo', 0xffb347, (o) => {
    o.fillTriangle(30, 17, 21, 30, 28, 30).fillTriangle(26, 41, 35, 27, 28, 27);
  });
  orb('pu-star', 0xffe14d, (o) => {
    const pts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4.5 : 11;
      pts.push(28 + Math.cos(a) * r, 30 + Math.sin(a) * r);
    }
    o.fillPoints(flat(pts), true);
  });
  orb('pu-oil', 0xffc34d, (o) => {
    // an oil can: body, handle, long spout and a falling drop
    o.fillRect(18, 30, 16, 12);
    o.fillRect(20, 27, 12, 3);
    o.lineStyle(3, 0x10131c, 1).beginPath().arc(18, 35, 5, Math.PI / 2, Math.PI * 1.5, false).strokePath();
    o.lineStyle(4, 0x10131c, 1).lineBetween(31, 29, 40, 20);
    o.fillTriangle(39, 18, 43, 22, 44, 17);
    o.fillCircle(42, 31, 2.2).fillTriangle(40, 30, 44, 30, 42, 25);
    o.fillStyle(0xffc34d, 1).fillRect(21, 33, 10, 2);
  });
  orb('pu-blaster', 0xff7ad9, (o) => {
    o.fillRect(17, 23, 20, 7).fillRect(21, 29, 6, 9).fillRect(36, 25, 4, 3);
  });
  // brick wall obstacle (26 x 64)
  g = gfx(scene);
  g.fillStyle(0x15110f, 1).fillRect(0, 0, 26, 64);
  g.fillStyle(0xc9c2b0, 1).fillRect(1.5, 1.5, 23, 61);
  for (let row = 0; row < 8; row++) {
    const y = 1.5 + row * 7.7, off = row % 2 ? 6 : 0;
    for (let x = -off; x < 24; x += 12) {
      const bx = Math.max(1.5, 1.5 + x), bw = Math.min(24.5, 1.5 + x + 11) - bx;
      if (bw <= 0) continue;
      g.fillStyle(row % 3 === 0 ? 0xa4503f : row % 3 === 1 ? 0x8f4234 : 0xb25c48, 1).fillRect(bx, y, bw, 6.6);
      g.fillStyle(0xffffff, 0.12).fillRect(bx, y, bw, 1.4);
    }
  }
  g.generateTexture('wall', 26, 64);
  g.destroy();

  // loose brick (debris)
  g = gfx(scene);
  g.fillStyle(0x15110f, 1).fillRect(0, 0, 9, 6).fillStyle(0xa4503f, 1).fillRect(1, 1, 7, 4);
  g.generateTexture('brick', 9, 6);
  g.destroy();

  // blaster bolt and rocket
  g = gfx(scene);
  g.fillStyle(0xff7ad9, 0.35).fillRoundedRect(0, 0, 18, 8, 4).fillStyle(0xfff3fb, 1).fillRoundedRect(3, 2, 13, 4, 2);
  g.generateTexture('shot', 18, 8);
  g.destroy();
  g = gfx(scene);
  g.fillStyle(0xffb347, 0.9).fillTriangle(0, 6, 8, 2, 8, 10);
  g.fillStyle(0x15110f, 1).fillRoundedRect(7, 1, 15, 10, 3).fillStyle(0xb28cff, 1).fillRoundedRect(8, 2, 13, 8, 2);
  g.fillStyle(0xd24a4a, 1).fillTriangle(21, 1, 21, 11, 28, 6);
  g.generateTexture('rocket', 28, 12);
  g.destroy();
}

// ---------- Rooftop buildings ----------
export interface BuildingStyle {
  highContrast: boolean;
}

export function drawBuilding(scene: Phaser.Scene, x: number, top: number, w: number, hc: boolean) {
  const g = scene.add.graphics({ x, y: top });
  const r = rng(Math.floor(x * 31 + w));
  const bodyH = H - top + 80;
  const stone = lerpColor(0x1a2132, 0x262d42, r());
  // back detail on the roof (behind the player): water tower, chimneys, gargoyles, spires
  const kind = r();
  const roofColor = 0x0e121b;
  if (w > 220 && kind < 0.25) {
    const tx = 30 + r() * (w - 120);
    g.fillStyle(roofColor, 1).fillRect(tx, -52, 4, 52).fillRect(tx + 40, -52, 4, 52);
    g.fillRect(tx - 6, -100, 56, 50).fillTriangle(tx - 8, -100, tx + 52, -100, tx + 22, -126);
    g.lineStyle(2, 0x2a3348, 1).lineBetween(tx - 6, -82, tx + 50, -82).lineBetween(tx - 6, -66, tx + 50, -66);
  } else if (kind < 0.5) {
    const cx = 20 + r() * (w - 60);
    g.fillStyle(roofColor, 1).fillRect(cx, -46, 18, 46).fillRect(cx - 3, -50, 24, 6);
  } else if (w > 200 && kind < 0.75) {
    g.fillStyle(roofColor, 1).fillRect(w * 0.5 - 12, -90, 24, 90);
    g.fillTriangle(w * 0.5 - 16, -90, w * 0.5 + 16, -90, w * 0.5, -150);
  }
  // gargoyles on corners
  const gargoyle = (gx: number, dir: number) => {
    g.fillStyle(roofColor, 1).fillRect(gx, -22, 14 * dir, 22);
    g.fillTriangle(gx, -22, gx + 6 * dir, -22, gx + 3 * dir, -36);
    g.fillTriangle(gx + 14 * dir, -22, gx + 8 * dir, -22, gx + 12 * dir, -32);
    g.fillStyle(0xf6d36a, 0.9).fillRect(gx + 5 * dir - (dir < 0 ? 2 : 0), -16, 2, 2);
  };
  if (w > 180 && r() < 0.7) {
    gargoyle(4, 1);
    gargoyle(w - 4, -1);
  }
  // body
  g.fillStyle(stone, 1).fillRect(0, 0, w, bodyH);
  // cornice (ornate stone ledge)
  g.fillStyle(0x3a4560, 1).fillRect(-4, 0, w + 8, 10);
  g.fillStyle(0x2a3248, 1).fillRect(-2, 10, w + 4, 6);
  for (let tx = 4; tx < w - 6; tx += 14) g.fillStyle(0x222a3e, 1).fillRect(tx, 16, 8, 8); // dentils
  // bright, readable rooftop edge
  g.fillStyle(hc ? 0xffffff : 0x8fa1c4, 1).fillRect(-4, 0, w + 8, hc ? 4 : 3);
  // pilasters
  for (let px = 0; px < w; px += 70) g.fillStyle(0x131a29, 1).fillRect(px, 24, 6, bodyH);
  // windows (arched)
  for (let wy = 44; wy < bodyH - 30; wy += 44) {
    for (let wx = 18; wx < w - 28; wx += 36) {
      if ((wx % 70) < 12) continue;
      const lit = r() < 0.42;
      const col = lit ? (r() < 0.8 ? 0xf2c35a : 0x6fd6e0) : 0x0b0f18;
      g.fillStyle(col, lit ? 0.9 : 1).fillRect(wx, wy + 6, 14, 20).fillTriangle(wx, wy + 6, wx + 14, wy + 6, wx + 7, wy - 3);
      if (lit) g.fillStyle(0x10131c, 0.8).fillRect(wx + 6, wy + 6, 2, 20);
    }
  }
  g.setDepth(5);
  return g;
}

// ---------- Robot ----------
export interface Pose {
  t: number; // seconds
  vx: number;
  vy: number;
  onGround: boolean;
  stumble: number; // 0..1 hit recoil
  landSquash: number; // 0..1 (squash is applied to the whole sprite by the scene)
  spin: number; // radians, for the double-jump flip
  shield: boolean;
  turbo: boolean;
  star?: number; // seconds of invincibility left (0 = none)
  reduced: boolean;
  gun?: number; // 1 blaster, 2 twin blaster, 3 spread gun, 4 rocket launcher
  fire?: number; // 0..1 recoil
  duck?: number; // 0 standing .. 1 crouched
  oil?: number; // seconds of oil left: smooth joints and a glossy sheen
}

const OUTLINE = 0x2b1710;

/** Small cartoon painter: everything goes through one transform so the whole robot can flip in the air. */
class Painter {
  private c: number;
  private s: number;
  constructor(private g: Phaser.GameObjects.Graphics, spin: number, private px = 0, private py = -26) {
    this.c = Math.cos(spin);
    this.s = Math.sin(spin);
  }
  pt(x: number, y: number) {
    const dx = x - this.px, dy = y - this.py;
    return new Phaser.Math.Vector2(this.px + dx * this.c - dy * this.s, this.py + dx * this.s + dy * this.c);
  }
  private path(pts: Phaser.Math.Vector2[], close: boolean) {
    this.g.beginPath().moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) this.g.lineTo(pts[i].x, pts[i].y);
    if (close) this.g.closePath();
  }
  /** Rounded blob (superellipse). e=2 is an ellipse, ~3 is a soft box. */
  blob(cx: number, cy: number, w: number, h: number, ang: number, fill: number, e = 2, alpha = 1, line = true) {
    const pts: Phaser.Math.Vector2[] = [];
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i < 28; i++) {
      const t = (i / 28) * Math.PI * 2;
      const cs = Math.cos(t), sn = Math.sin(t);
      const x = Math.sign(cs) * Math.pow(Math.abs(cs), 2 / e) * (w / 2);
      const y = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e) * (h / 2);
      pts.push(this.pt(cx + x * ca - y * sa, cy + x * sa + y * ca));
    }
    this.g.fillStyle(fill, alpha).fillPoints(pts, true);
    if (line) {
      this.g.lineStyle(2, OUTLINE, alpha);
      this.path(pts, true);
      this.g.strokePath();
    }
  }
  dot(x: number, y: number, r: number, fill: number, alpha = 1, line = false) {
    this.blob(x, y, r * 2, r * 2, 0, fill, 2, alpha, line);
  }
  poly(points: number[], fill: number, line = true) {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < points.length; i += 2) pts.push(this.pt(points[i], points[i + 1]));
    this.g.fillStyle(fill, 1).fillPoints(pts, true);
    if (line) {
      this.g.lineStyle(2, OUTLINE, 1);
      this.path(pts, true);
      this.g.strokePath();
    }
  }
  stroke(points: number[], width: number, color: number, alpha = 1) {
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < points.length; i += 2) pts.push(this.pt(points[i], points[i + 1]));
    this.g.lineStyle(width, color, alpha);
    this.path(pts, false);
    this.g.strokePath();
  }
  /** A little cog: toothed star with a hole. */
  gear(x: number, y: number, r: number, teeth: number, rot: number, fill: number) {
    const pts: number[] = [];
    for (let i = 0; i < teeth * 2; i++) {
      const a = rot + (i / (teeth * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * 0.72 : r;
      pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    this.poly(pts, fill);
    this.dot(x, y, r * 0.28, OUTLINE);
  }
  /** Rubber-hose limb: a bent tube with rounded ends. Returns the end point (untransformed). */
  hose(x0: number, y0: number, x1: number, y1: number, bend: number, width: number, color: number) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / len) * bend, cy = my + (dx / len) * bend;
    const pts: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
      pts.push(a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1);
    }
    this.stroke(pts, width + 3, OUTLINE);
    this.dot(x0, y0, (width + 3) / 2, OUTLINE);
    this.dot(x1, y1, (width + 3) / 2, OUTLINE);
    this.stroke(pts, width, color);
    this.dot(x0, y0, width / 2, color);
    this.dot(x1, y1, width / 2, color);
  }
}

/** Draws Iggy with his feet at (0,0); negative y is up. Faces +x.
 *  Style: vintage screen-print scrap robot: glass dome with a cyclops eye, arched riveted shoulders,
 *  chest gears, strut-and-pipe limbs and big flared boots. */
export function drawRobot(g: Phaser.GameObjects.Graphics, suit: Suit, p: Pose) {
  g.clear();
  const P = new Painter(g, p.spin, 0, -30);
  const run = p.onGround ? Math.min(1, Math.abs(p.vx) / 200) : 0;
  const cyc = p.t * 13;
  const air = !p.onGround;
  const oiled = (p.oil ?? 0) > 0;
  const clumsy = oiled ? 0 : suit.loose; // oiled joints: no wobble, no rattle
  const hi = (c: number, k: number) => lerpColor(c, 0xffffff, k);
  const lo = (c: number, k: number) => lerpColor(c, 0x000000, k);
  const rusty = suit.name === 'Rusty Original';
  const bob = p.onGround ? Math.abs(Math.sin(cyc)) * 1.8 * run : 0;
  const lean = 0.04 + run * 0.08 + p.stumble * 0.3 + Math.sin(p.t * 3.1) * 0.025 * clumsy;
  const duck = p.duck ?? 0;
  const tx = Math.sin(lean) * 3 + 3 * duck;
  const cream = 0xeadfc8, steel = 0x9aa3ad, steelDark = 0x5d6670;
  const brass = suit.glow ? 0xfff0a8 : 0xd2a43c, red = 0xc8332e; // banded joints and the little red accents, like a 50s tin robot
  const hipY = -21 - bob + 8 * duck;
  const torsoBottom = hipY - 2, torsoTop = torsoBottom - 12;
  const shellBase = torsoTop + 1, shellTop = shellBase - 9;
  const domeY = shellTop - 4;

  // cape
  if (suit.cape) {
    const flap = Math.sin(p.t * 9) * 2.5 * (run + (air ? 1 : 0));
    const lift = Math.min(1, Math.abs(p.vx) / 220) * 12 + (air ? Math.max(0, p.vy) / 50 : 0);
    P.poly([-6, shellBase - 2, 7, shellBase - 2, -16 - lift, hipY + 12 + flap, -31 - lift * 1.4, hipY + 17 - flap, -12 - lift * 0.4, torsoTop + 4], suit.glow ? 0x7a560f : 0x1b2030);
  }
  if (oiled) P.dot(tx, torsoTop + 2, 21, 0xffc34d, 0.13); // a warm amber sheen around him
  if (suit.glow || p.turbo) {
    const c = p.turbo ? 0xffb347 : 0x9dffb0;
    P.dot(-15, torsoTop + 6, 4 + (p.reduced ? 0 : Math.sin(p.t * 30) * 0.8), c, 0.55);
  }

  // ---- legs: twin struts into flared bell boots, with a hip block on top
  const sw1 = air ? (p.vy < 0 ? 0.7 : 0.25) : Math.sin(cyc) * 0.9 * run;
  const sw2 = air ? (p.vy < 0 ? -0.35 : -0.5) : -Math.sin(cyc) * 0.9 * run;
  const leg = (hx: number, ang: number, boot: number) => {
    const sx = hx, sy = hipY + 4;
    const lift = p.onGround ? Math.max(0, Math.sin(ang * 1.2)) * 3 * run : 0;
    const len = 9 - 8 * duck;
    const ax = sx + Math.sin(ang) * len, ay = sy + Math.cos(ang) * len - lift;
    for (const off of [-1.7, 1.7]) {
      P.stroke([sx + off, sy, ax + off, ay], 3.6, OUTLINE);
    }
    for (const off of [-1.7, 1.7]) P.stroke([sx + off, sy, ax + off, ay], 1.5, steel);
    P.stroke([sx - 1.7, sy + 2, ax + 1.7, ay - 2.5], 1, steelDark); // cross brace
    P.stroke([sx + 1.7, sy + 2, ax - 1.7, ay - 2.5], 1, steelDark);
    if (clumsy > 0.3) for (let i = 0; i < 4; i++) P.stroke([ax - 2 + (i % 2) * 4, ay - 6 + i * 1.5, ax + 2 - (i % 2) * 4, ay - 5 + i * 1.5], 0.9, steelDark); // loose spring
    // bell boot, tilted a little with the swing
    const ca = Math.cos(ang * 0.35), sa = Math.sin(ang * 0.35);
    const cx = ax, cy = ay + 4;
    const raw = [-3.5, -4, 3.5, -4, 5.5, 0, 8, 3.2, 8, 4, -8, 4, -8, 3.2, -5.5, 0];
    const pts: number[] = [];
    for (let i = 0; i < raw.length; i += 2) pts.push(cx + raw[i] * ca - raw[i + 1] * sa, cy + raw[i] * sa + raw[i + 1] * ca);
    P.poly(pts, boot);
    P.blob(cx + 5.4 * ca, cy + 2.2, 4.8, 3.2, 0, hi(boot, 0.3), 2, 0.75, false); // toe cap catching the light
    P.stroke([cx - 4.4 * ca, cy - 3.4, cx + 4.4 * ca, cy - 3.4], 1.7, brass, 0.95); // ankle band
    P.stroke([cx - 6.5 * ca - 1.6 * sa, cy - 6.5 * sa + 1.6 * ca, cx + 6.5 * ca - 1.6 * sa, cy + 6.5 * sa + 1.6 * ca], 1, cream, 0.55);
    P.dot(cx - 3.8, cy + 0.4, 0.8, cream, 0.8);
    P.dot(cx + 3.8, cy + 0.4, 0.8, cream, 0.8);
    P.blob(hx, hipY + 1, 8, 9, 0, suit.body, 3.2); // hip block
    P.stroke([hx - 3.6, hipY + 5.4, hx + 3.6, hipY + 5.4], 1.5, brass, 0.95);
    P.dot(hx, hipY + 1, 0.9, cream, 0.8);
  };
  leg(-5, sw2, suit.dark);
  leg(5, sw1, suit.trim);

  // ---- arms: thin twin rods from the shoulder, then an orange pipe forearm capped with a disc
  const arm = air ? -2.2 - (p.vy < 0 ? 0.5 : 0) : Math.sin(cyc + Math.PI) * 0.9 * run;
  const limbArm = (sx: number, sy: number, a: number, pipe: number, cap: number, loose: boolean) => {
    const ex = sx + Math.sin(a) * 9, ey = sy + Math.cos(a) * 9;
    P.stroke([sx - 1, sy, ex - 1, ey], 3.4, OUTLINE);
    P.stroke([sx + 1, sy, ex + 1, ey], 3.4, OUTLINE);
    P.stroke([sx - 1, sy, ex - 1, ey], 1.4, steel);
    P.stroke([sx + 1, sy, ex + 1, ey], 1.4, steel);
    const a2 = loose ? a + 0.7 + Math.sin(p.t * 7) * 0.35 : a * 0.8 + 0.25;
    const hx = ex + Math.sin(a2) * 10, hy = ey + Math.cos(a2) * 10;
    P.hose(ex, ey, hx, hy, loose ? -2 : 1.5, 5, pipe);
    P.stroke([ex - 1.2, ey + 1.2, hx - 1.2, hy + 0.4], 1, hi(pipe, 0.5), 0.55); // light along the pipe
    P.dot(ex, ey, 2.4, brass, 1, true);
    P.dot(ex, ey, 0.9, steelDark);
    // gripper: a palm with three short fingers
    for (const k of [-1, 0, 1]) {
      P.stroke([hx + k * 1.9, hy + 1.2, hx + k * 2.5, hy + 4.6], 2.3, OUTLINE);
      P.stroke([hx + k * 1.9, hy + 1.2, hx + k * 2.5, hy + 4.4], 1.1, cap);
    }
    P.dot(hx, hy, 3.3, cap, 1, true);
    P.dot(hx - 0.8, hy - 0.8, 0.8, 0xffffff, 0.7);
    P.dot(hx, hy, 1.2, OUTLINE);
  };
  limbArm(tx - 16, torsoTop + 3, arm * 0.9 + 0.1, suit.dark, steel, false);

  // ---- body: open bay with cogs, then the lower plate
  P.blob(tx, torsoTop + 5, 23, 14, lean, suit.dark, 3);
  const spin = p.reduced ? 0 : p.t * (rusty ? 1.1 : 1.8) + (rusty ? Math.sin(p.t * 5) * 0.3 : 0);
  P.gear(tx - 5.5, torsoTop + 5, 4.4, 8, spin, steel);
  P.gear(tx + 4.5, torsoTop + 6, 3.4, 7, -spin * 1.3, steelDark);
  const plate = [tx - 10.5, torsoTop + 9, tx + 10.5, torsoTop + 9, tx + 8, torsoBottom, tx - 8, torsoBottom];
  P.poly(plate, suit.body);
  P.poly([tx - 10.2, torsoTop + 9.6, tx - 6.5, torsoTop + 9.6, tx - 5.6, torsoBottom - 0.6, tx - 7.8, torsoBottom - 0.6], hi(suit.body, 0.3), false); // lit edge
  P.poly([tx + 6.6, torsoTop + 9.6, tx + 10.2, torsoTop + 9.6, tx + 7.8, torsoBottom - 0.6, tx + 5.2, torsoBottom - 0.6], lo(suit.body, 0.3), false); // shaded edge
  P.stroke([tx - 9.2, torsoTop + 12, tx + 9.2, torsoTop + 12], 1.3, suit.trim);
  P.blob(tx, torsoTop + 10.5, 6, 3.2, 0, suit.dark, 2.4);
  P.dot(tx, torsoTop + 10.5, 1.4, suit.eye, 1);
  [[-8, 10.5], [8, 10.5], [-6.8, 14], [6.8, 14]].forEach(([rx, ry]) => P.dot(tx + rx, torsoTop + ry - 1, 0.9, cream, 0.8));
  if (rusty || suit.name === 'Patchwork') {
    P.poly([tx - 8, torsoTop + 13, tx - 3, torsoTop + 13, tx - 4, torsoBottom - 0.5, tx - 8, torsoBottom - 0.5], suit.trim, false);
    P.stroke([tx + 4, torsoTop + 14, tx + 9 + Math.sin(p.t * 6) * 1.5, torsoBottom + 7], 1.3, 0xd24a4a);
    P.stroke([tx + 3, torsoTop + 11, tx + 7, torsoTop + 16], 0.9, cream, 0.4);
  }
  if (suit.glow) {
    P.stroke([tx - 7, torsoBottom - 1, tx - 7, torsoTop + 13, tx - 3, torsoTop + 13], 1.2, 0x9dffb0, 0.95);
    P.stroke([tx + 7, torsoBottom - 1, tx + 7, torsoTop + 13, tx + 3, torsoTop + 13], 1.2, 0x9dffb0, 0.95);
  }

  // ---- the arched, riveted shoulder shell
  const arc: number[] = [];
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (i / 18) * Math.PI;
    arc.push(tx + Math.cos(a) * 17.5, shellBase + Math.sin(a) * 9.5 * (rusty && i < 6 ? 0.82 : 1));
  }
  P.poly([...arc, tx + 12, shellBase + 3, tx - 12, shellBase + 3], suit.body);
  P.stroke(arc.map((v, i) => (i % 2 ? v + 2.4 : v * 0.88 + tx * 0.12)), 1.1, suit.trim, 0.8); // inner seam
  for (let i = 1; i < 18; i += 2) {
    const a = Math.PI + (i / 18) * Math.PI;
    P.dot(tx + Math.cos(a) * 15, shellBase + Math.sin(a) * 7.2, 0.8, cream, 0.85); // rivets
  }
  P.stroke(arc.slice(6, 20).map((v, i) => (i % 2 ? v + 1.5 : v)), 1.4, 0xffffff, 0.22);
  P.stroke(arc.slice(4, 22).map((v, i) => (i % 2 ? v + 1.6 : v - 0.5 + tx * 0)), 2.2, hi(suit.body, 0.5), 0.6); // light catching the top of the shell
  P.stroke([tx - 13, shellBase + 2.6, tx + 13, shellBase + 2.6], 1.8, lo(suit.body, 0.4), 0.55); // shadow under the rim
  P.stroke([tx - 14.5, shellBase - 1.2, tx + 14.5, shellBase - 1.2], 0.8, lo(suit.body, 0.5), 0.5); // panel seam
  P.stroke(arc.slice(24, 38), 1.3, 0xffd9a0, 0.5); // warm rim light on the far shoulder
  P.stroke([tx - 5.5, shellBase - 3.6, tx, shellBase + 0.6, tx + 5.5, shellBase - 3.6], 2.2, OUTLINE); // chest chevron, like the V plate on the old tin robots
  P.stroke([tx - 5.5, shellBase - 3.6, tx, shellBase + 0.6, tx + 5.5, shellBase - 3.6], 1.2, brass);
  for (const sx of [-14.2, 14.2]) {
    P.dot(tx + sx, shellBase - 1.6, 1.7, red, 1, true);
    P.dot(tx + sx - 0.4, shellBase - 2.1, 0.5, 0xffffff, 0.8);
  }
  P.stroke([tx - 10, torsoBottom - 0.6, tx + 10, torsoBottom - 0.6], 1.7, brass, 0.95); // waist band
  if (rusty) {
    // heavier rust: dark mottled patches and streaks running down from the edges
    P.blob(tx - 8, shellBase - 3.6, 7, 3.4, 0.3, lo(suit.body, 0.38), 2, 0.6, false);
    P.blob(tx + 8, shellBase - 1.6, 6, 3, -0.3, lo(suit.body, 0.38), 2, 0.6, false);
    P.stroke([tx - 12, shellBase + 2.8, tx - 12.6, shellBase + 8], 1.3, suit.trim, 0.9);
    P.stroke([tx + 9, shellBase + 2.8, tx + 9.4, shellBase + 6], 1.1, suit.trim, 0.9);
    P.blob(tx - 6, torsoBottom - 2, 5, 2.6, 0, lo(suit.body, 0.35), 2, 0.6, false);
  }
  if (rusty || suit.name === 'Patchwork') {
    // worn patina: oxide freckles, and bright burnished scuffs where the metal has been rubbed back
    [[-12, -3], [-8, -7], [-3, -8.4], [6, -8], [11, -4], [13, -1], [-14, 0], [2, -9]].forEach(([fx, fy], i) => P.dot(tx + fx, shellBase + fy, 0.6 + (i % 3) * 0.3, suit.trim, 0.9));
    P.stroke([tx - 11, shellBase - 5, tx - 7.5, shellBase - 8], 1.1, hi(suit.body, 0.65), 0.85);
    P.stroke([tx + 4, shellBase - 9, tx + 9, shellBase - 7], 1.1, hi(suit.body, 0.65), 0.85);
    P.stroke([tx - 8, torsoBottom - 3, tx - 6, torsoBottom - 6], 1, hi(suit.body, 0.6), 0.8);
  }
  P.stroke([tx - 15, shellBase - 2, tx - 13.5, shellBase + 2], 1, cream, 0.35);
  if (rusty) P.poly([tx + 8, shellBase - 6, tx + 13, shellBase - 2, tx + 10, shellBase - 1], suit.trim, false); // rust bloom

  // ---- smoke puffs from the shoulder vents
  const smoke = clumsy > 0.12 ? clumsy : 0;
  if (smoke > 0) {
    for (const vx of [tx - 14, tx + 14]) {
      for (let i = 0; i < 2; i++) {
        const ph = p.reduced ? 0.3 + i * 0.25 : (p.t * 0.7 + i / 3 + (vx > tx ? 0.17 : 0)) % 1;
        P.dot(vx + Math.sin(ph * 6 + i) * 2 - ph * 3 * Math.sign(vx - tx) * -1, shellBase - 5 - ph * 15, 1.6 + ph * 3.2, 0xb9b1aa, (1 - ph) * 0.5 * Math.min(1, smoke + 0.3));
      }
    }
  }

  // ---- head: small cyclops head inside a glass dome
  const wob = Math.sin(p.t * 5 + 1) * 0.12 * clumsy + (air ? -0.07 : 0) + p.stumble * 0.4 + Math.sin(cyc * 2) * 0.04 * run * clumsy;
  const hx = tx + 1 + run * 1.2;
  const hdx = Math.sin(p.t * 2.3) * 1.1 * clumsy + Math.sin(wob) * 2.5; // head sloshes around in the dome
  const hy = domeY + 1 - Math.abs(Math.sin(cyc)) * 0.8 * run;
  P.blob(hx, domeY + 8, 17, 5, 0, steel, 3); // collar ring
  P.stroke([hx - 8.4, domeY + 8.6, hx + 8.4, domeY + 8.6], 1.4, brass, 0.95);
  P.gear(hx - 6.5 + hdx * 0.3, hy - 3, 2.8, 6, p.reduced ? 0 : p.t * 2, steelDark);
  P.gear(hx + 6.5 + hdx * 0.3, hy - 2, 2.4, 6, p.reduced ? 0 : -p.t * 2.4, steelDark);
  P.blob(hx + hdx, hy, 11, 13, wob, suit.body, 3);
  P.blob(hx + hdx - 2, hy - 4.5, 5, 2.4, wob, 0xffffff, 2, 0.28, false);
  P.blob(hx + hdx + 3.2, hy + 3.5, 6.5, 6, wob, lo(suit.body, 0.3), 2, 0.38, false); // shaded cheek
  P.dot(hx + hdx, hy - 7.6, 1.5, steel, 1, true); // little cap on top
  // cyclops eye
  const look = Phaser.Math.Clamp(p.vx / 250, -1, 1) * 1.1 + 0.5;
  const blink = !p.reduced && Math.sin(p.t * 1.7) > 0.96;
  const ex = hx + hdx + 1, ey = hy - 1.2;
  const dead = rusty && !p.reduced && Math.sin(p.t * 9) > 0.85;
  if (blink) {
    P.stroke([ex - 3.6, ey, ex + 3.6, ey], 1.8, OUTLINE);
  } else {
    P.dot(ex, ey, 6.2, suit.eye, 0.16);
    P.dot(ex, ey, 3.9, 0xf6f0e2, 1, true);
    P.dot(ex + look, ey + (air ? (p.vy < 0 ? -0.7 : 0.7) : 0.3), 2.4, dead ? 0x6b7a80 : suit.eye);
    P.dot(ex + look, ey + (air ? (p.vy < 0 ? -0.7 : 0.7) : 0.3), 1.1, OUTLINE);
    P.dot(ex + look - 0.8, ey - 1, 0.7, 0xffffff);
    P.dot(ex + look + 0.9, ey + 0.8, 0.4, 0xffffff, 0.8);
  }
  P.stroke([ex - 4.2, ey - 3.6, ex + 4.2, ey - 3.0 + (p.stumble > 0.3 ? 1.5 : 0)], 1.4, OUTLINE); // brow / lid
  // speaker grille mouth
  const gy = hy + 4.6;
  if (p.stumble > 0.3) P.blob(hx + hdx + 1, gy, 5, 2.4, 0, OUTLINE, 2.6, 1, false);
  else for (let i = 0; i < 3; i++) P.stroke([hx + hdx - 1.6 + i * 2.2, gy - 1.2, hx + hdx - 1.6 + i * 2.2, gy + 1.2], 1, OUTLINE);
  // the glass
  const ring: number[] = [];
  for (let i = 0; i <= 28; i++) ring.push(hx + Math.cos((i / 28) * Math.PI * 2) * 11.5, domeY + 0.5 + Math.sin((i / 28) * Math.PI * 2) * 11.5);
  P.blob(hx, domeY + 0.5, 23, 23, 0, 0xbfe3f0, 2, 0.2, false);
  P.stroke(ring, 3.4, OUTLINE, 0.9);
  P.stroke(ring, 1.4, 0xd7eef5, 0.9);
  for (const rb of [-4.6, 4.6]) {
    const rr: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      rr.push(hx + rb * Math.sin(u * Math.PI * 0.5 + 0.2) * (1 - u * 0.1), domeY - 11 + u * 19);
    }
    P.stroke(rr, 0.9, steel, 0.55); // glass ribs
  }
  const hl: number[] = [];
  for (let i = 0; i <= 8; i++) hl.push(hx + Math.cos(Math.PI * (1.05 + i * 0.045)) * 8.8, domeY + Math.sin(Math.PI * (1.05 + i * 0.045)) * 8.8);
  P.stroke(hl, 1.8, 0xffffff, 0.7);
  const rim: number[] = [];
  for (let i = 0; i <= 8; i++) rim.push(hx + Math.cos(Math.PI * (0.05 + i * 0.045)) * 8.8, domeY + Math.sin(Math.PI * (0.05 + i * 0.045)) * 8.8);
  P.stroke(rim, 1.6, 0x0b2a3a, 0.22); // shade on the far side of the glass
  P.dot(hx - 5.5, domeY - 5.5, 0.9, 0xffffff, 0.85);
  if (rusty) {
    P.stroke([hx + 6, domeY - 9, hx + 3, domeY - 4, hx + 6, domeY - 1, hx + 4, domeY + 3], 1, 0xffffff, 0.8); // cracked glass
    P.stroke([hx + 3, domeY - 4, hx - 1, domeY - 5], 0.9, 0xffffff, 0.7);
  }
  if (suit.ears) {
    P.poly([hx - 9, domeY - 6, hx - 3.5, domeY - 10, hx - 10, domeY - 22], suit.body);
    P.poly([hx + 3.5, domeY - 10, hx + 9, domeY - 6, hx + 9, domeY - 22], suit.body);
  } else {
    // antenna rod out of the dome; snapped on the worn suits
    const bendA = clumsy > 0.3 ? 0.9 + Math.sin(p.t * 3) * 0.2 : 0.15;
    const ax = hx + 1, ay = domeY - 11.5;
    const bx = ax + Math.sin(bendA) * 5, by = ay - Math.cos(bendA) * 5;
    P.stroke([ax, ay, bx, by], 2.8, OUTLINE);
    P.stroke([ax, ay, bx, by], 1.1, steel);
    if (clumsy < 0.5) P.dot(bx, by, 1.9, 0xd24a4a, 1, true);
    // a second, shorter antenna with a brass ball, as on the old toy robots
    const a2x = hx - 5.5, a2y = domeY - 9.5, b2x = a2x - Math.sin(clumsy > 0.3 ? 0.5 : 0.25) * 4.5, b2y = a2y - 5.2;
    P.stroke([a2x, a2y, b2x, b2y], 2.4, OUTLINE);
    P.stroke([a2x, a2y, b2x, b2y], 0.9, steel);
    P.dot(b2x, b2y, 1.6, brass, 1, true);
  }

  if (oiled) {
    // glossy highlights on the shell, chest, head and boots, and slow drips of oil
    P.stroke(arc.slice(4, 16), 2.4, 0xffffff, 0.8);
    P.blob(tx - 4, torsoTop + 11.4, 6, 1.7, 0, 0xffffff, 2, 0.75, false);
    P.dot(hx + hdx - 4, hy - 5.5, 1.5, 0xffffff, 0.75);
    P.dot(tx - 6, hipY + 0.5, 1.1, 0xffffff, 0.8);
    P.dot(tx + 4.4, hipY + 0.5, 1.1, 0xffffff, 0.8);
    for (let i = 0; i < 2; i++) {
      const ph = p.reduced ? 0.4 + i * 0.3 : (p.t * 1.1 + i * 0.5) % 1;
      P.dot(tx - 7 + i * 14, torsoBottom + 3 + ph * 10, 1.2 * (1 - ph * 0.4), 0xe0a030, 1 - ph * 0.8);
    }
  }

  // ---- front arm over everything
  if (p.gun) {
    // arm out in front, holding the gun
    const a = 1.45, a2 = a * 0.8 + 0.25, kick = (p.fire ?? 0) * 2.5;
    const sx = tx + 16 - kick * 0.4, sy = torsoTop + 3;
    limbArm(sx, sy, a, suit.body, cream, false);
    const gx = sx + Math.sin(a) * 9 + Math.sin(a2) * 10, gy = sy + Math.cos(a) * 9 + Math.cos(a2) * 10;
    if (p.gun === 1) {
      P.poly([gx - 3, gy - 3.5, gx + 9, gy - 3.5, gx + 9, gy + 0.5, gx + 3, gy + 0.5, gx + 2, gy + 5.5, gx - 1.5, gy + 5.5], steelDark);
      P.dot(gx + 9.5, gy - 1.5, 1.8, 0xff7ad9, 1, true);
      P.stroke([gx - 1, gy - 2, gx + 7, gy - 2], 1, cream, 0.5);
    } else if (p.gun === 2) {
      // twin barrels
      P.poly([gx - 3, gy - 6.5, gx + 11, gy - 6.5, gx + 11, gy - 2.5, gx - 3, gy - 2.5], steelDark);
      P.poly([gx - 3, gy - 2, gx + 11, gy - 2, gx + 11, gy + 2, gx + 3, gy + 2, gx + 2, gy + 6.5, gx - 1.5, gy + 6.5], steelDark);
      P.dot(gx + 11.5, gy - 4.5, 1.7, 0xff7ad9, 1, true);
      P.dot(gx + 11.5, gy, 1.7, 0xff7ad9, 1, true);
    } else if (p.gun === 3) {
      // spread gun with a fanned nozzle
      P.poly([gx - 3, gy - 3, gx + 6, gy - 3, gx + 12, gy - 8, gx + 12, gy + 6, gx + 6, gy + 2, gx + 3, gy + 2, gx + 2, gy + 6.5, gx - 1.5, gy + 6.5], steelDark);
      [-6, -1, 4].forEach((o) => P.dot(gx + 12.5, gy + o, 1.6, 0xffa64d, 1, true));
    } else {
      P.poly([gx - 7, gy - 5, gx + 12, gy - 5, gx + 12, gy + 2.5, gx - 7, gy + 2.5], steelDark);
      P.poly([gx + 12, gy - 5.5, gx + 17, gy - 1.2, gx + 12, gy + 3], 0xb28cff);
      P.stroke([gx - 2, gy - 5, gx - 2, gy + 2.5], 1.2, cream, 0.6);
      P.stroke([gx + 4, gy - 5, gx + 4, gy + 2.5], 1.2, cream, 0.6);
    }
    if ((p.fire ?? 0) > 0.5 && !p.reduced) P.dot(gx + (p.gun >= 4 ? 19 : 13), gy - 1, 3.5, 0xfff3b0, 0.9);
  } else if (rusty) limbArm(tx + 16, torsoTop + 3, 0.28 + Math.sin(p.t * 4) * 0.2 + (air ? -1.3 : 0) + Math.sin(cyc) * 0.45 * run, suit.body, steel, true);
  else limbArm(tx + 16, torsoTop + 3, -arm, suit.body, cream, false);

  if ((p.star ?? 0) > 0) {
    // golden aura; cycles through colours (and flickers faster in the last two seconds) unless motion is reduced
    const ending = (p.star ?? 0) < 2;
    const hue = p.reduced ? 0xffe14d : [0xffe14d, 0xff7ad9, 0x7dd3ff, 0x9dffb0][Math.floor(p.t * (ending ? 14 : 8)) % 4];
    const on = p.reduced || !ending || Math.sin(p.t * 30) > -0.3;
    if (on) {
      g.fillStyle(hue, 0.2).fillEllipse(0, -30, 62, 78);
      g.lineStyle(3, hue, 1).strokeEllipse(0, -30, 62, 78);
      g.lineStyle(1.5, 0x1a1208, 0.8).strokeEllipse(0, -30, 67, 83);
    }
  }
  if (p.shield) {
    g.lineStyle(2, 0x7dd3ff, 0.9).strokeEllipse(0, -30, 56, 72);
    g.fillStyle(0x7dd3ff, 0.12).fillEllipse(0, -30, 56, 72);
  }
}

// =====================================================================================
// Level 2: Spindle Hollow: a storybook-gothic look. Everything is crooked, spindly and striped:
// twisted bare trees, leaning towers, spiral clouds, a swirly moon, striped houses.
// =====================================================================================

export function flat(points: number[]) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < points.length; i += 2) pts.push(new Phaser.Math.Vector2(points[i], points[i + 1]));
  return pts;
}

export function spiral(g: Phaser.GameObjects.Graphics, cx: number, cy: number, rMax: number, turns: number, color: number, alpha: number, width: number) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  const steps = Math.max(12, Math.floor(turns * 24));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, a = u * turns * Math.PI * 2, r = rMax * u;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokePath();
}

export function makeHollowSky(scene: Phaser.Scene) {
  const g = gfx(scene);
  const bands = 90;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = t < 0.55 ? lerpColor(0x090919, 0x2a2150, t / 0.55) : lerpColor(0x2a2150, 0x7b6e9a, (t - 0.55) / 0.45);
    g.fillStyle(c, 1).fillRect(0, (i * H) / bands, W, H / bands + 1);
  }
  // swirly clouds
  const r = rng(17);
  [[120, 80, 40], [330, 150, 30], [560, 60, 36], [880, 180, 34], [760, 40, 26], [60, 190, 24], [470, 215, 22]].forEach(([x, y, s]) => {
    spiral(g, x, y, s, 2.4, 0xcfc4ee, 0.2, 3);
    spiral(g, x + s * 1.6, y + s * 0.4, s * 0.6, 1.8, 0xcfc4ee, 0.14, 2);
    g.lineStyle(3, 0xcfc4ee, 0.14).lineBetween(x - s * 2, y + s, x - s * 0.8, y + s * 0.6);
  });
  // a big, pale, swirly moon
  for (let k = 120; k > 56; k -= 9) g.fillStyle(0xe8e0f4, 0.012 + (120 - k) * 0.0003).fillCircle(730, 125, k);
  g.fillStyle(0xf0ead8, 1).fillCircle(730, 125, 56);
  spiral(g, 722, 118, 40, 3.2, 0xcfc6ac, 0.8, 2.4);
  g.fillStyle(0xcfc6ac, 0.6).fillCircle(752, 150, 6).fillCircle(700, 96, 4);
  // crooked little stars
  for (let i = 0; i < 40; i++) {
    const x = r() * W, y = r() * 200, s = 2 + r() * 2.5;
    g.lineStyle(1.2, 0xffffff, 0.35 + r() * 0.4);
    g.lineBetween(x - s, y, x + s, y + 0.6).lineBetween(x, y - s, x + 0.6, y + s);
  }
  g.generateTexture('h-sky', W, H);
  g.destroy();
}

export function makeHollowFog(scene: Phaser.Scene) {
  const g = gfx(scene);
  const r = rng(8);
  for (let i = 0; i < 26; i++) {
    const x = r() * 1024, y = 20 + r() * 60, w = 140 + r() * 200;
    for (let k = 3; k >= 0; k--) g.fillStyle(0x9fc0b4, 0.024).fillEllipse(x, y, w + k * 40, 24 + k * 10);
    if (x + w > 1000) for (let k = 3; k >= 0; k--) g.fillStyle(0x9fc0b4, 0.024).fillEllipse(x - 1024, y, w + k * 40, 24 + k * 10);
  }
  g.generateTexture('h-fog', 1024, 120);
  g.destroy();
}

/** Slow drifting ash / snow flakes. */
export function makeFlakes(scene: Phaser.Scene) {
  const g = gfx(scene);
  const r = rng(23);
  for (let i = 0; i < 55; i++) {
    const x = 4 + r() * 248, y = 4 + r() * 248, s = 1 + r() * 1.6;
    g.fillStyle(0xffffff, 0.35 + r() * 0.45).fillCircle(x, y, s);
  }
  g.generateTexture('h-flakes', 256, 256);
  g.destroy();
}

export function bough(g: Phaser.GameObjects.Graphics, r: () => number, x: number, y: number, a: number, len: number, wd: number, depth: number, color: number) {
  const nx = x + Math.sin(a) * len, ny = y - Math.cos(a) * len;
  g.lineStyle(Math.max(1, wd), color, 1).lineBetween(x, y, nx, ny);
  if (depth <= 0 || wd < 0.9) {
    spiral(g, nx, ny, 4 + r() * 3, 1.4, color, 1, 1.3); // curly twig tips
    return;
  }
  const curl = (r() - 0.5) * 0.6;
  bough(g, r, nx, ny, a - 0.45 + curl, len * 0.8, wd * 0.68, depth - 1, color);
  bough(g, r, nx, ny, a + 0.55 + curl, len * 0.76, wd * 0.66, depth - 1, color);
  if (r() < 0.3) bough(g, r, nx, ny, a + curl * 2, len * 0.6, wd * 0.5, depth - 2, color);
}

function lean(g: Phaser.GameObjects.Graphics, x: number, base: number, w: number, top: number, bend: number, color: number) {
  // a tall, tapered tower leaning over, with a bent spire
  g.fillStyle(color, 1).fillPoints(flat([x, base, x + w, base, x + w * 0.75 + bend * 0.4, top + 20, x + w * 0.25 + bend * 0.4, top + 20]), true);
  g.fillPoints(flat([x + w * 0.2 + bend * 0.4, top + 22, x + w * 0.8 + bend * 0.4, top + 22, x + w * 0.7 + bend, top - 10, x + w * 0.5 + bend * 1.8, top - 48, x + w * 0.35 + bend * 1.1, top - 8]), true);
}

export function makeHollowLayer(scene: Phaser.Scene, key: string, kind: 'hills' | 'trees' | 'graves', seed: number, color: number, haze: number) {
  const g = gfx(scene);
  const TW = 1280, base = H;
  const r = rng(seed);
  const glow = 0xa4f071;
  if (kind === 'hills') {
    const pts: number[] = [];
    for (let x = 0; x <= TW; x += 32) {
      const y = base - (150 + Math.sin((x / TW) * Math.PI * 4 + 1) * 38 + Math.sin((x / TW) * Math.PI * 6 + 2) * 22);
      pts.push(x, y);
    }
    g.fillStyle(color, 1).fillPoints(flat([...pts, TW, base, 0, base]), true);
    // two crooked manors on the hills
    [330, 960].forEach((mx, i) => {
      const my = base - (150 + Math.sin((mx / TW) * Math.PI * 4 + 1) * 38 + Math.sin((mx / TW) * Math.PI * 6 + 2) * 22) + 6;
      lean(g, mx, my, 38, my - 190, i ? -18 : 20, color);
      lean(g, mx + 46, my, 26, my - 120, i ? 12 : -14, color);
      lean(g, mx - 30, my, 20, my - 90, i ? -10 : 8, color);
      g.fillStyle(color, 1).fillRect(mx - 34, my - 50, 110, 56);
      [[mx + 12, my - 150], [mx + 54, my - 90], [mx - 26, my - 36], [mx + 28, my - 30]].forEach(([wx, wy]) => {
        g.fillStyle(glow, 0.7).fillPoints(flat([wx, wy, wx + 7, wy + 1, wx + 6, wy + 14, wx - 1, wy + 12]), true);
      });
    });
    for (let i = 0; i < 9; i++) spiral(g, 70 + i * 140 + r() * 40, base - 30 - r() * 60, 18 + r() * 14, 2.4, 0xffffff, 0.05, 2);
  } else if (kind === 'trees') {
    // spindly leaning towers between twisted bare trees
    [170, 560, 1010].forEach((x, i) => lean(g, x, base, 16 + r() * 14, base - (200 + r() * 150), (i % 2 ? -1 : 1) * (14 + r() * 14), color));
    [330, 720, 1150].forEach((x) => bough(g, r, x, base, (r() - 0.5) * 0.3, 78 + r() * 30, 11, 6, color));
    [70, 440, 880].forEach((x) => bough(g, r, x, base, (r() - 0.5) * 0.3, 52 + r() * 20, 7, 5, color));
    // a few lit windows in the towers
    for (let i = 0; i < 14; i++) g.fillStyle(r() < 0.7 ? glow : 0xffa13a, 0.55).fillRect(150 + r() * 900, base - 80 - r() * 200, 4, 7);
  } else {
    // foreground: wonky iron fence, leaning tombstones, twisty lamps, grinning pumpkins
    g.fillStyle(color, 1);
    for (let x = 4; x < TW; x += 11) {
      const lean2 = (r() - 0.5) * 4, h = 34 + r() * 14;
      g.fillPoints(flat([x, base, x + 4, base, x + 4 + lean2, base - h, x + 2 + lean2 * 1.3, base - h - 11, x + lean2]), true);
    }
    g.lineStyle(3, color, 1);
    for (let x = 0; x < TW; x += 16) g.lineBetween(x, base - 24 + Math.sin(x * 0.07) * 4, x + 16, base - 24 + Math.sin((x + 16) * 0.07) * 4);
    for (let i = 0; i < 7; i++) {
      const x = 70 + i * 175 + r() * 50, w = 24 + r() * 14, h = 44 + r() * 28, sk = (r() - 0.5) * 12;
      g.fillStyle(color, 1).fillPoints(flat([x, base, x + w, base, x + w + sk, base - h + 10, x + w * 0.7 + sk, base - h, x + w * 0.3 + sk, base - h, x + sk, base - h + 10]), true);
      g.lineStyle(2, 0xffffff, 0.12).lineBetween(x + w / 2 + sk * 0.6, base - h + 8, x + w / 2 + sk * 0.6, base - h + 24).lineBetween(x + w / 2 - 6 + sk * 0.6, base - h + 14, x + w / 2 + 6 + sk * 0.6, base - h + 14);
    }
    [260, 820].forEach((x) => {
      g.lineStyle(5, color, 1).beginPath().moveTo(x, base).lineTo(x + 6, base - 70).lineTo(x - 8, base - 120).lineTo(x + 10, base - 160).strokePath();
      spiral(g, x + 10, base - 168, 10, 1.6, color, 1, 3);
      g.fillStyle(glow, 0.25).fillCircle(x + 10, base - 136, 22);
      g.fillStyle(glow, 0.85).fillRect(x + 4, base - 142, 12, 14);
    });
    [140, 520, 1080].forEach((x) => {
      g.fillStyle(0x0d0a14, 1).fillEllipse(x, base - 12, 34, 26);
      g.fillStyle(0xffa13a, 0.9).fillPoints(flat([x - 8, base - 17, x - 3, base - 17, x - 5.5, base - 22]), true).fillPoints(flat([x + 3, base - 17, x + 8, base - 17, x + 5.5, base - 22]), true);
      g.fillStyle(0xffa13a, 0.9).fillPoints(flat([x - 8, base - 9, x - 4, base - 12, x, base - 9, x + 4, base - 12, x + 8, base - 9, x + 4, base - 6, x, base - 9, x - 4, base - 6]), true);
    });
  }
  const steps = 14;
  for (let i = 0; i < steps; i++) g.fillStyle(0x6f6396, (haze * i) / steps / 3).fillRect(0, base - 260 + (i * 260) / steps, TW, 260 / steps + 1);
  g.generateTexture(key, TW, H);
  g.destroy();
}

/** A crooked, striped house to run along. The top edge stays flat so the platform is easy to read. */
export function drawHollowBuilding(scene: Phaser.Scene, x: number, top: number, w: number, hc: boolean) {
  const g = scene.add.graphics({ x, y: top });
  const r = rng(Math.floor(x * 31 + w));
  const bodyH = H - top + 80;
  const roof = 0x0b0814;
  const glow = 0xa4f071;

  // behind the player: a twisty chimney with a smoke spiral, a bent spire, or a bare branch with a lantern
  const kind = r();
  if (kind < 0.35) {
    const cx = 20 + r() * (w - 60);
    g.fillStyle(roof, 1).fillPoints(flat([cx, 0, cx + 18, 0, cx + 16, -30, cx + 23, -52, cx + 8, -52, cx + 12, -30]), true);
    spiral(g, cx + 15, -72, 13, 2.2, 0xb7b0c8, 0.5, 2.4);
  } else if (kind < 0.65 && w > 200) {
    const sx = w * 0.3 + r() * w * 0.4;
    g.fillStyle(roof, 1).fillPoints(flat([sx - 10, 0, sx + 10, 0, sx + 9, -60, sx + 16, -100, sx + 36, -136, sx + 8, -98, sx - 2, -60]), true);
    g.fillStyle(glow, 0.8).fillRect(sx - 3, -34, 5, 9);
  } else if (w > 180) {
    g.lineStyle(5, roof, 1).beginPath().moveTo(w - 22, 0).lineTo(w - 26, -30).lineTo(w - 6, -62).lineTo(w - 16, -92).strokePath();
    g.lineBetween(w - 26, -30, w - 46, -52);
    spiral(g, w - 16, -98, 8, 1.6, roof, 1, 3);
    g.fillStyle(glow, 0.25).fillCircle(w - 46, -40, 14).fillStyle(glow, 0.9).fillRect(w - 50, -52, 8, 10);
  }

  // body: black & bone stripes, plum stripes, or harlequin diamonds
  const v = r();
  const [ca, cb] = v < 0.4 ? [0x17111f, 0xd8d0bc] : v < 0.8 ? [0x2b2140, 0x181228] : [0x1a1426, 0x6d5f8e];
  g.fillStyle(ca, 1).fillRect(0, 0, w, bodyH);
  if (v < 0.8) {
    for (let sx = 0, i = 0; sx < w; sx += 12, i++) if (i % 2) g.fillStyle(cb, 1).fillRect(sx, 0, Math.min(12, w - sx), bodyH);
  } else {
    for (let ry = 6, row = 0; ry < bodyH; ry += 16, row++) {
      for (let cx = (row % 2) * 16; cx < w + 16; cx += 32) {
        // clip each diamond to the building's width so nothing spills past the walls
        let poly: [number, number][] = [[cx, ry - 16], [cx + 16, ry], [cx, ry + 16], [cx - 16, ry]];
        for (const [edge, keep] of [[0, (x: number) => x >= 0], [w, (x: number) => x <= w]] as [number, (x: number) => boolean][]) {
          const out: [number, number][] = [];
          poly.forEach((p, i) => {
            const q = poly[(i + 1) % poly.length];
            const pin = keep(p[0]), qin = keep(q[0]);
            if (pin) out.push(p);
            if (pin !== qin) out.push([edge, p[1] + ((edge - p[0]) / (q[0] - p[0])) * (q[1] - p[1])]);
          });
          poly = out;
        }
        if (poly.length >= 3) g.fillStyle(cb, 1).fillPoints(flat(poly.flat()), true);
      }
    }
    g.fillStyle(0x000000, 0).fillRect(0, 0, 0, 0);
  }
  // scalloped cornice
  g.fillStyle(0x3a2f55, 1).fillRect(-4, 0, w + 8, 9);
  for (let sx = -2; sx < w + 4; sx += 14) g.fillCircle(sx + 7, 9, 7);
  g.fillStyle(hc ? 0xffffff : 0xc9bbe8, 1).fillRect(-4, 0, w + 8, hc ? 4 : 3);

  // tall, crooked windows
  for (let wy = 42; wy < bodyH - 34; wy += 52) {
    for (let wx = 14; wx < w - 26; wx += 34) {
      const sk = (r() - 0.5) * 7, lit = r() < 0.4;
      const c = lit ? (r() < 0.7 ? glow : 0xffa13a) : 0x07050f;
      g.fillStyle(0x000000, 1).fillPoints(flat([wx - 2 + sk, wy - 2, wx + 15 + sk, wy, wx + 14, wy + 32, wx - 2, wy + 30]), true);
      g.fillStyle(c, lit ? 0.92 : 1).fillPoints(flat([wx + sk, wy, wx + 13 + sk, wy + 1, wx + 12, wy + 30, wx, wy + 28]), true);
      if (lit) g.lineStyle(1.5, 0x07050f, 0.8).lineBetween(wx + 6 + sk / 2, wy, wx + 6, wy + 29).lineBetween(wx, wy + 14, wx + 13, wy + 15);
    }
  }
  // cobwebs in the corners under the cornice
  g.lineStyle(1, 0xe6e0f2, 0.55);
  [[0, 1], [w, -1]].forEach(([cx, dir]) => {
    [[22, 0], [20, 14], [10, 24], [0, 30]].forEach(([ox, oy]) => g.lineBetween(cx, 16, cx + dir * ox, 16 + oy));
    g.lineBetween(cx + dir * 22, 16, cx + dir * 20, 30).lineBetween(cx + dir * 12, 16, cx + dir * 10, 27);
  });
  g.setDepth(5);
  return g;
}
