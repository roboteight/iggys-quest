import Phaser from 'phaser';
import { H, W, flat, gfx, lerpColor, rng } from './art';

/**
 * Art for the four post-apocalyptic / weird levels: Rust Wastes, Drowned Metropolis, Neon Void and Spore Garden.
 * Everything is drawn with code. `ensureStyle` builds (once) the sky, three parallax layers, a fog strip and
 * a precipitation tile for a style; `drawLevelBuilding` draws one rooftop.
 */

export type ExtraStyle = 'wastes' | 'drowned' | 'void' | 'spores' | 'war';

export interface StyleAssets {
  sky: string;
  layers: [string, number][];
  fog: string;
  precip: string;
  fogAlpha: number;
}

const TW = 1280;
type Draw = (g: Phaser.GameObjects.Graphics, r: () => number, color: number, base: number) => void;
type Pt = Phaser.GameObjects.Graphics;

/** Run `draw` at x, and again one tile to the left when it spills past the right edge, so the tile wraps seamlessly. */
function wrap(x: number, w: number, draw: (x: number) => void) {
  draw(x);
  if (x + w > TW) draw(x - TW);
}

function gradient(g: Pt, stops: [number, number][]) {
  const bands = 90;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k], [t1, c1] = stops[k + 1];
    g.fillStyle(lerpColor(c0, c1, Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))), 1).fillRect(0, (i * H) / bands, W, H / bands + 1);
  }
}

function halo(g: Pt, x: number, y: number, r0: number, r1: number, color: number, a: number) {
  for (let r = r1; r > r0; r -= 8) g.fillStyle(color, a * (1 - (r - r0) / (r1 - r0)) + 0.004).fillCircle(x, y, r);
}

// ====================================================================== skies
function makeSkyTex(scene: Phaser.Scene, key: string, style: ExtraStyle) {
  const g = gfx(scene);
  const r = rng(40 + style.length);
  if (style === 'wastes') {
    gradient(g, [[0, 0x2b1210], [0.45, 0x8e3b22], [0.8, 0xe08a45], [1, 0xf3c079]]);
    halo(g, 650, 340, 110, 300, 0xffd7a0, 0.05);
    g.fillStyle(0xffe6bd, 0.95).fillCircle(650, 340, 112);
    g.fillStyle(0xf3b977, 0.55).fillRect(538, 300, 224, 6).fillRect(538, 330, 224, 8).fillRect(538, 366, 224, 10).fillRect(538, 408, 224, 14);
    for (let i = 0; i < 24; i++) g.fillStyle(0xffe0b0, 0.15 + r() * 0.3).fillRect(r() * W, r() * 150, 2, 2);
    // long smeared clouds
    for (let i = 0; i < 7; i++) {
      const x = r() * W, y = 60 + r() * 170;
      for (let k = 0; k < 4; k++) g.fillStyle(0x5a2418, 0.12).fillEllipse(x, y + k * 2, 220 - k * 30, 10 + k * 3);
    }
  } else if (style === 'war') {
    // a smoke-choked sunset: a dull sun behind black smoke, flashes of distant gunfire on the horizon
    gradient(g, [[0, 0x120808], [0.4, 0x3d1a10], [0.75, 0xa8532a], [1, 0xe39a4e]]);
    halo(g, 720, 330, 50, 230, 0xffa35a, 0.05);
    g.fillStyle(0xffcf8a, 0.8).fillCircle(720, 330, 54);
    for (let i = 0; i < 9; i++) {
      const x = r() * W, y = 40 + r() * 230;
      for (let k = 0; k < 5; k++) g.fillStyle(0x1a0c08, 0.16).fillEllipse(x + k * 14, y + k * 3, 300 - k * 44, 34 - k * 4);
    }
    for (let i = 0; i < 6; i++) halo(g, 60 + r() * 840, 380 + r() * 60, 4, 46, 0xffb060, 0.07); // far-off gunfire
  } else if (style === 'drowned') {
    gradient(g, [[0, 0x06191c], [0.5, 0x1f5753], [0.85, 0x6fa896], [1, 0xa4cdb0]]);
    halo(g, 700, 150, 38, 190, 0xe2f6d0, 0.045);
    g.fillStyle(0xeef9dc, 0.95).fillCircle(700, 150, 38);
    for (let i = 0; i < 9; i++) {
      const x = r() * W, y = 40 + r() * 200;
      for (let k = 0; k < 4; k++) g.fillStyle(0xb9e2cf, 0.05).fillEllipse(x, y, 260 - k * 40, 26 - k * 4);
    }
    for (let i = 0; i < 30; i++) g.fillStyle(0xe6fff0, 0.2 + r() * 0.4).fillRect(r() * W, r() * 130, 2, 2);
  } else if (style === 'void') {
    gradient(g, [[0, 0x0a0224], [0.5, 0x3d1470], [0.8, 0xa3287f], [1, 0xff6a8c]]);
    for (let i = 0; i < 90; i++) g.fillStyle(0xffffff, 0.2 + r() * 0.7).fillRect(r() * W, r() * 330, r() < 0.15 ? 3 : 2, r() < 0.15 ? 3 : 2);
    // ringed planet
    halo(g, 230, 130, 56, 130, 0xc890ff, 0.05);
    g.fillStyle(0x6a2fb0, 1).fillCircle(230, 130, 56);
    g.fillStyle(0x8f4fe0, 1).fillCircle(218, 118, 40);
    g.fillStyle(0xb98cff, 0.55).fillRect(176, 112, 108, 5).fillRect(180, 134, 100, 7);
    g.lineStyle(7, 0xf6b3ff, 0.8).beginPath().arc(230, 130, 96, Math.PI * 1.02, Math.PI * 2.0).strokePath();
    g.lineStyle(7, 0xf6b3ff, 0.9).beginPath().arc(230, 130, 96, 0, Math.PI * 1.0).strokePath();
    // striped synthwave sun, setting behind the horizon
    g.fillStyle(0xffd24a, 1).fillCircle(700, 360, 130);
    g.fillStyle(0xff5aa5, 0.9).fillCircle(700, 400, 130);
    for (let s = 0; s < 8; s++) g.fillStyle(0x6a1f8a, 1).fillRect(560, 330 + s * 16, 280, 2 + s * 1.5);
  } else {
    gradient(g, [[0, 0x020c14], [0.5, 0x0b2e34], [1, 0x1e4a40]]);
    for (let i = 0; i < 70; i++) g.fillStyle(0xdffff0, 0.15 + r() * 0.6).fillRect(r() * W, r() * 260, 2, 2);
    // aurora ribbons
    [[0x4dffb0, 90], [0xd06bff, 150], [0x5fd0ff, 50]].forEach(([c, y0], n) => {
      for (let k = 0; k < 14; k++) {
        const a = 0.035 * (1 - k / 14);
        g.fillStyle(c, a).fillPoints(flat(ribbon(y0, n, k * 7)), true);
      }
    });
    // two small moons
    halo(g, 160, 100, 26, 80, 0xc8f0ff, 0.05);
    g.fillStyle(0xe0f7ff, 1).fillCircle(160, 100, 26);
    g.fillStyle(0xb8d8e8, 0.7).fillCircle(150, 92, 7).fillCircle(172, 112, 5);
    g.fillStyle(0xffc6ee, 1).fillCircle(790, 70, 15);
    g.fillStyle(0xe3a0cc, 0.7).fillCircle(785, 66, 4);
  }
  g.generateTexture(key, W, H);
  g.destroy();
}

function ribbon(y0: number, n: number, thick: number) {
  const top: number[] = [], bot: number[] = [];
  for (let x = 0; x <= W; x += 40) {
    const y = y0 + Math.sin(x / 150 + n * 2) * 34 + Math.sin(x / 60 + n) * 8;
    top.push(x, y - thick);
    bot.unshift(x, y + thick + 20);
  }
  return [...top, ...bot];
}

// ====================================================================== parallax layers
function makeLayerTex(scene: Phaser.Scene, key: string, seed: number, color: number, haze: number, hazeColor: number, draw: Draw) {
  const g = gfx(scene);
  draw(g, rng(seed), color, H);
  const steps = 14;
  for (let i = 0; i < steps; i++) g.fillStyle(hazeColor, (haze * i) / steps / 3).fillRect(0, H - 260 + (i * 260) / steps, TW, 260 / steps + 1);
  g.generateTexture(key, TW, H);
  g.destroy();
}

/** A bare skeleton of a tower: outline columns and floor slabs, nothing filled in. */
function skeletonTower(g: Pt, x: number, w: number, h: number, base: number, color: number, r: () => number) {
  wrap(x, w, (x0) => {
    const top = base - h;
    g.fillStyle(color, 1);
    const cols = Math.max(2, Math.round(w / 22));
    for (let i = 0; i <= cols; i++) g.fillRect(x0 + (i * (w - 4)) / cols, top + (r() < 0.2 ? 14 + r() * 40 : 0), 4, h);
    for (let y = top + 8 + r() * 10; y < base; y += 24 + r() * 10) {
      const slabW = r() < 0.18 ? w * (0.4 + r() * 0.4) : w;
      g.fillRect(x0 - 2, y, slabW + 4, 4);
    }
    // a bent rebar tuft on top
    g.lineStyle(2, color, 1).lineBetween(x0 + w * 0.3, top, x0 + w * 0.2, top - 16).lineBetween(x0 + w * 0.7, top, x0 + w * 0.85, top - 12);
  });
}

function deadTree(g: Pt, x: number, base: number, h: number, color: number, r: () => number) {
  wrap(x, 60, (x0) => {
    g.lineStyle(5, color, 1).lineBetween(x0, base, x0 + 2, base - h);
    for (let i = 0; i < 4; i++) {
      const y = base - h * (0.35 + i * 0.17), dir = i % 2 ? 1 : -1;
      g.lineStyle(3 - i * 0.4, color, 1).lineBetween(x0 + 1, y, x0 + dir * (18 + r() * 22), y - 16 - r() * 14);
    }
  });
}

function carHusk(g: Pt, x: number, base: number, color: number) {
  wrap(x, 90, (x0) => {
    g.fillStyle(color, 1).fillRect(x0, base - 22, 88, 14).fillPoints(flat([x0 + 18, base - 22, x0 + 30, base - 40, x0 + 62, base - 40, x0 + 74, base - 22]), true);
    g.fillStyle(0x000000, 0.35).fillRect(x0 + 32, base - 37, 12, 12).fillRect(x0 + 48, base - 37, 12, 12);
    g.fillStyle(color, 1).fillCircle(x0 + 18, base - 8, 9).fillCircle(x0 + 70, base - 8, 9);
    g.fillStyle(0x000000, 0.4).fillCircle(x0 + 18, base - 8, 4).fillCircle(x0 + 70, base - 8, 4);
  });
}

const wastesFar: Draw = (g, r, c, base) => {
  for (let x = 10; x < TW; x += 90 + r() * 80) skeletonTower(g, x, 40 + r() * 50, 180 + r() * 200, base, c, r);
};
const wastesMid: Draw = (g, r, c, base) => {
  for (let x = 30; x < TW; x += 150 + r() * 110) skeletonTower(g, x, 50 + r() * 40, 120 + r() * 160, base, c, r);
  // a collapsed highway overpass: a long deck with a broken end and a sagging slab
  const dx = 380, deckY = base - 150;
  g.fillStyle(c, 1).fillRect(dx, deckY, 520, 10);
  for (let px = dx + 20; px < dx + 440; px += 120) g.fillRect(px, deckY, 12, base - deckY);
  g.fillPoints(flat([dx + 520, deckY, dx + 560, deckY + 36, dx + 560, deckY + 44, dx + 520, deckY + 10]), true);
  g.lineStyle(2, c, 1).lineBetween(dx + 470, deckY + 10, dx + 480, deckY + 34).lineBetween(dx + 490, deckY + 10, dx + 496, deckY + 28);
};
const wastesNear: Draw = (g, r, c, base) => {
  for (let x = 40; x < TW; x += 130 + r() * 150) {
    if (r() < 0.55) deadTree(g, x, base, 70 + r() * 80, c, r);
    else carHusk(g, x, base, c);
  }
  // dunes
  const pts: number[] = [];
  for (let x = 0; x <= TW; x += 40) pts.push(x, base - 26 - Math.sin((x / TW) * Math.PI * 6) * 12);
  g.fillStyle(c, 1).fillPoints(flat([...pts, TW, base, 0, base]), true);
};

/** A tower that is half sunk: it ends at the waterline, which has pale ripples across it. */
function sunkenTower(g: Pt, x: number, w: number, top: number, water: number, color: number, r: () => number, vines: boolean) {
  wrap(x, w, (x0) => {
    g.fillStyle(color, 1).fillRect(x0, top, w, water - top);
    g.fillRect(x0 - 3, top, w + 6, 6);
    for (let wy = top + 14; wy < water - 12; wy += 16) for (let wx = x0 + 6; wx < x0 + w - 8; wx += 12) if (r() < 0.45) g.fillStyle(0x000000, 0.35).fillRect(wx, wy, 5, 8);
    if (vines) {
      g.lineStyle(2, 0x2f6b3f, 0.9);
      for (let i = 0; i < 3; i++) {
        const vx = x0 + 6 + r() * (w - 12);
        g.lineBetween(vx, top, vx + (r() - 0.5) * 8, top + 30 + r() * 70);
      }
    }
  });
}

function waterline(g: Pt, water: number, color: number, base: number) {
  g.fillStyle(color, 1).fillRect(0, water, TW, base - water);
  g.fillStyle(0xcdeedd, 0.22);
  for (let x = 0; x < TW; x += 50) g.fillRect(x, water + 2, 28, 2).fillRect(x + 22, water + 12, 20, 2);
}

const drownedFar: Draw = (g, r, c, base) => {
  for (let x = 0; x < TW; x += 70 + r() * 60) sunkenTower(g, x, 40 + r() * 40, base - 120 - r() * 250, base - 90, c, r, false);
  waterline(g, base - 90, lerpColor(c, 0x0d2d2a, 0.5), base);
};
const drownedMid: Draw = (g, r, c, base) => {
  for (let x = 20; x < TW; x += 130 + r() * 110) sunkenTower(g, x, 56 + r() * 40, base - 110 - r() * 200, base - 74, c, r, true);
  waterline(g, base - 74, lerpColor(c, 0x0b2624, 0.5), base);
};
const drownedNear: Draw = (g, r, c, base) => {
  // reeds and floating debris at the waterline
  for (let x = 6; x < TW; x += 12 + r() * 22) {
    const h = 24 + r() * 52;
    g.lineStyle(2.4, c, 1).lineBetween(x, base - 40, x + (r() - 0.5) * 12, base - 40 - h);
    if (r() < 0.3) g.fillStyle(c, 1).fillRoundedRect(x - 2, base - 40 - h - 8, 5, 12, 2);
  }
  for (let x = 60; x < TW; x += 240 + r() * 120) wrap(x, 60, (x0) => g.fillStyle(c, 1).fillRect(x0, base - 46, 50, 8).fillRect(x0 + 10, base - 56, 4, 10));
  g.fillStyle(c, 1).fillRect(0, base - 38, TW, 40);
};

const NEON = [0xff4fd8, 0x4ff7ff, 0xb78bff];
const voidFar: Draw = (g, r, c, base) => {
  // floating islands with a little tower on top, and dangling rock
  for (let x = 40; x < TW; x += 160 + r() * 140) {
    const y = base - 230 - r() * 130, w = 70 + r() * 70;
    wrap(x, w, (x0) => {
      g.fillStyle(c, 1).fillPoints(flat([x0, y, x0 + w, y, x0 + w * 0.7, y + 22, x0 + w * 0.5, y + 46, x0 + w * 0.3, y + 20]), true);
      g.fillRect(x0 + w * 0.4, y - 26, 6, 26).fillTriangle(x0 + w * 0.4 - 4, y - 26, x0 + w * 0.4 + 10, y - 26, x0 + w * 0.4 + 3, y - 44);
      g.fillStyle(NEON[Math.floor(r() * 3)], 0.8).fillRect(x0 + 2, y, w - 4, 2);
    });
  }
};
const voidMid: Draw = (g, r, c, base) => {
  // crystal spires
  for (let x = 0; x < TW; x += 54 + r() * 70) {
    const h = 70 + r() * 190, w = 26 + r() * 30;
    wrap(x, w, (x0) => {
      g.fillStyle(c, 1).fillPoints(flat([x0, base, x0 + w * 0.2, base - h * 0.75, x0 + w * 0.5, base - h, x0 + w * 0.85, base - h * 0.6, x0 + w, base]), true);
      g.lineStyle(1.5, NEON[Math.floor(r() * 3)], 0.7).lineBetween(x0 + w * 0.5, base - h, x0 + w * 0.4, base);
    });
  }
};
const voidNear: Draw = (g, r, c, base) => {
  // the neon grid floor: a dark plane with glowing perspective lines
  g.fillStyle(c, 1).fillRect(0, base - 56, TW, 60);
  g.lineStyle(2, 0xff4fd8, 0.8).lineBetween(0, base - 56, TW, base - 56);
  g.lineStyle(1.5, 0x4ff7ff, 0.5);
  for (let y = base - 46, d = 5; y < base; y += d, d += 3) g.lineBetween(0, y, TW, y);
  for (let x = 0; x <= TW; x += 64) g.lineBetween(x, base - 56, x + (x - TW / 2) * 0.5, base);
  // glowing crystals poking out
  for (let x = 30; x < TW; x += 120 + r() * 160) {
    const h = 24 + r() * 40;
    wrap(x, 24, (x0) => g.fillStyle(c, 1).fillTriangle(x0, base - 56, x0 + 22, base - 56, x0 + 8 + r() * 6, base - 56 - h));
  }
};

function mushroom(g: Pt, x: number, base: number, h: number, cap: number, color: number, glow?: number) {
  wrap(x, cap * 2, (x0) => {
    g.fillStyle(color, 1).fillPoints(flat([x0 - 6, base, x0 - 3, base - h, x0 + 3, base - h, x0 + 6, base]), true);
    g.fillEllipse(x0, base - h, cap * 2, cap * 0.9);
    g.fillRect(x0 - cap, base - h, cap * 2, 3);
    if (glow !== undefined) {
      g.fillStyle(glow, 0.55);
      for (let i = -2; i <= 2; i++) g.fillCircle(x0 + i * cap * 0.32, base - h - 2 - Math.cos(i * 0.6) * cap * 0.22, 2.4);
    }
  });
}
const sporesFar: Draw = (g, r, c, base) => {
  for (let x = 20; x < TW; x += 120 + r() * 100) mushroom(g, x, base, 140 + r() * 180, 50 + r() * 60, c);
};
const sporesMid: Draw = (g, r, c, base) => {
  for (let x = 0; x < TW; x += 100 + r() * 120) mushroom(g, x, base, 60 + r() * 120, 30 + r() * 40, c, r() < 0.6 ? 0x7dffc0 : 0xff9bf0);
};
const sporesNear: Draw = (g, r, c, base) => {
  // ferns and glowing spore balloons on curling tendrils
  for (let x = 10; x < TW; x += 40 + r() * 70) {
    wrap(x, 60, (x0) => {
      const h = 30 + r() * 60;
      g.lineStyle(3, c, 1);
      g.lineBetween(x0, base, x0 + 4, base - h);
      for (let k = 1; k < 5; k++) {
        const y = base - (h * k) / 5;
        g.lineBetween(x0 + 2, y, x0 - 16 + k * 2, y - 8 + k).lineBetween(x0 + 2, y, x0 + 20 - k * 2, y - 8 + k);
      }
    });
  }
  for (let x = 90; x < TW; x += 220 + r() * 160) {
    wrap(x, 30, (x0) => {
      const y = base - 130 - r() * 90;
      g.lineStyle(2, c, 1).lineBetween(x0, base - 20, x0 + 4, y + 10);
      g.fillStyle(0x7dffc0, 0.28).fillCircle(x0 + 4, y, 16).fillStyle(0xc8ffe3, 0.7).fillCircle(x0 + 4, y, 7);
    });
  }
  g.fillStyle(c, 1).fillRect(0, base - 14, TW, 16);
};

// ====================================================================== war layers
/** A strand of barbed wire between two points: a sagging line with little crossed barbs. */
function barbed(g: Pt, x0: number, x1: number, y: number, sagAmt: number, color: number) {
  const pts: number[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) pts.push(x0 + ((x1 - x0) * i) / n, y + Math.sin((i / n) * Math.PI) * sagAmt);
  g.lineStyle(2, color, 1).strokePoints(flat(pts), false, false);
  for (let i = 1; i < n; i += 2) {
    const px = pts[i * 2], py = pts[i * 2 + 1];
    g.lineStyle(1.5, color, 1).lineBetween(px - 3, py - 3, px + 3, py + 3).lineBetween(px - 3, py + 3, px + 3, py - 3);
  }
}

const warFar: Draw = (g, r, c, base) => {
  // a burnt-out town: jagged broken walls with smoke columns climbing from a few of them
  for (let x = 0; x < TW - 70; x += 64 + r() * 70) {
    const w = 46 + r() * 70, h = 100 + r() * 220;
    const j = [r() * 24, r() * 18, r() * 30, r() * 22, r() * 26];
    const smoke = r() < 0.4;
    wrap(x, w, (x0) => {
      const top = base - h;
      g.fillStyle(c, 1).fillPoints(flat([x0, base, x0, top + j[0], x0 + w * 0.25, top - 6 + j[1], x0 + w * 0.45, top + 16 + j[2], x0 + w * 0.7, top + j[3], x0 + w, top + 14 + j[4], x0 + w, base]), true);
      if (smoke) for (let k = 0; k < 6; k++) g.fillStyle(0x1a0c08, 0.22 - k * 0.025).fillEllipse(x0 + w * 0.5 + k * 6, top - 14 - k * 30, 34 + k * 14, 40 + k * 8);
    });
  }
};
const warMid: Draw = (g, r, c, base) => {
  // broken walls with window holes, dead trees and snapped telegraph poles with sagging wire
  for (let x = 20; x < TW - 140; x += 150 + r() * 110) {
    const w = 60 + r() * 60, h = 70 + r() * 90;
    const holes = [r() < 0.7, r() < 0.7, r() < 0.7];
    wrap(x, w, (x0) => {
      g.fillStyle(c, 1).fillPoints(flat([x0, base, x0, base - h, x0 + w * 0.35, base - h + 14, x0 + w * 0.6, base - h - 8, x0 + w, base - h + 26, x0 + w, base]), true);
      holes.forEach((hole, i) => hole && g.fillStyle(0x000000, 0.35).fillRect(x0 + 10 + i * (w / 3.2), base - h + 26, 12, 18));
    });
  }
  for (let x = 60; x < TW - 90; x += 230 + r() * 120) {
    const h = 90 + r() * 50;
    wrap(x, 6, (x0) => {
      g.fillStyle(c, 1).fillRect(x0, base - h, 5, h);
      g.fillRect(x0 - 12, base - h + 8, 29, 4);
      barbed(g, x0 + 4, x0 + 4 + 150, base - h + 10, 16, c);
    });
  }
};
const warNear: Draw = (g, r, c, base) => {
  // hedgehogs, wire fences, a wrecked tank hull
  for (let x = 30; x < TW - 60; x += 110 + r() * 120) {
    const k = r();
    wrap(x, 60, (x0) => {
      if (k < 0.4) {
        // czech hedgehog: three crossed beams
        g.lineStyle(5, c, 1).lineBetween(x0, base - 4, x0 + 36, base - 40).lineBetween(x0 + 36, base - 4, x0, base - 40).lineBetween(x0 - 4, base - 22, x0 + 40, base - 22);
      } else if (k < 0.75) {
        g.fillStyle(c, 1).fillRect(x0, base - 46, 4, 46).fillRect(x0 + 56, base - 46, 4, 46);
        barbed(g, x0 + 2, x0 + 58, base - 40, 6, c);
        barbed(g, x0 + 2, x0 + 58, base - 26, 6, c);
      } else {
        g.fillStyle(c, 1).fillRoundedRect(x0, base - 30, 76, 24, 6).fillRect(x0 + 20, base - 48, 36, 20);
        g.lineStyle(5, c, 1).lineBetween(x0 + 52, base - 40, x0 + 100, base - 52);
      }
    });
  }
};

// ====================================================================== fog + precipitation
function makeFogTex(scene: Phaser.Scene, key: string, color: number, alpha: number, seed: number) {
  const g = gfx(scene);
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = r() * 1024, y = 20 + r() * 60, w = 140 + r() * 200;
    for (let k = 3; k >= 0; k--) {
      g.fillStyle(color, alpha).fillEllipse(x, y, w + k * 40, 24 + k * 10);
      if (x + w > 1000) g.fillStyle(color, alpha).fillEllipse(x - 1024, y, w + k * 40, 24 + k * 10);
    }
  }
  g.generateTexture(key, 1024, 120);
  g.destroy();
}

function makePrecipTex(scene: Phaser.Scene, key: string, style: ExtraStyle) {
  const g = gfx(scene);
  const r = rng(90 + style.length);
  if (style === 'wastes') {
    // horizontal dust streaks
    g.lineStyle(1.5, 0xf0c590, 0.4);
    for (let i = 0; i < 46; i++) {
      const x = r() * 256, y = r() * 256, l = 10 + r() * 22;
      g.lineBetween(x, y, x - l, y + 0.5);
    }
  } else if (style === 'war') {
    // drifting ash and a few glowing embers
    for (let i = 0; i < 46; i++) {
      const x = 4 + r() * 248, y = 4 + r() * 248;
      g.fillStyle(0xb9aca0, 0.28 + r() * 0.3).fillCircle(x, y, 1 + r() * 1.5);
    }
    for (let i = 0; i < 12; i++) {
      const x = 4 + r() * 248, y = 4 + r() * 248;
      g.fillStyle(0xff9a3a, 0.2).fillCircle(x, y, 4).fillStyle(0xffd27a, 0.95).fillCircle(x, y, 1.4);
    }
  } else {
    const col = style === 'drowned' ? 0xb8ffd0 : style === 'void' ? 0xf0c0ff : 0x9dffd6;
    for (let i = 0; i < 40; i++) {
      const x = 4 + r() * 248, y = 4 + r() * 248, s = 1 + r() * 2;
      g.fillStyle(col, 0.12).fillCircle(x, y, s * 3).fillStyle(col, 0.5 + r() * 0.4).fillCircle(x, y, s);
    }
  }
  g.generateTexture(key, 256, 256);
  g.destroy();
}

// ====================================================================== public: per-style assets
export function ensureStyle(scene: Phaser.Scene, style: ExtraStyle): StyleAssets {
  const p = style === 'war' ? 'wr-' : style.slice(0, 2) + '-'; // 'wastes' and 'war' would both start with 'wa'
  const keys: StyleAssets = { sky: p + 'sky', layers: [[p + 'far', 0.08], [p + 'mid', 0.2], [p + 'near', 0.38]], fog: p + 'fog', precip: p + 'precip', fogAlpha: 0.9 };
  if (scene.textures.exists(keys.sky)) return keys;
  makeSkyTex(scene, keys.sky, style);
  makePrecipTex(scene, keys.precip, style);
  switch (style) {
    case 'wastes':
      makeFogTex(scene, keys.fog, 0xd9915a, 0.03, 31);
      makeLayerTex(scene, p + 'far', 21, 0x7a3d27, 0.9, 0xe08a45, wastesFar);
      makeLayerTex(scene, p + 'mid', 22, 0x4f2418, 0.6, 0xc4703a, wastesMid);
      makeLayerTex(scene, p + 'near', 23, 0x26100c, 0.3, 0x9a5028, wastesNear);
      break;
    case 'drowned':
      makeFogTex(scene, keys.fog, 0x9fd8c0, 0.03, 32);
      makeLayerTex(scene, p + 'far', 24, 0x2e6a63, 0.9, 0x8ac2a6, drownedFar);
      makeLayerTex(scene, p + 'mid', 25, 0x1b4944, 0.6, 0x5a9a86, drownedMid);
      makeLayerTex(scene, p + 'near', 26, 0x0a2523, 0.3, 0x3a7a68, drownedNear);
      break;
    case 'void':
      makeFogTex(scene, keys.fog, 0xff7ad8, 0.025, 33);
      makeLayerTex(scene, p + 'far', 27, 0x2a0f52, 0.5, 0xc03a9a, voidFar);
      makeLayerTex(scene, p + 'mid', 28, 0x1a0a3a, 0.4, 0xa02a90, voidMid);
      makeLayerTex(scene, p + 'near', 29, 0x0d0524, 0.1, 0x802090, voidNear);
      break;
    case 'war':
      makeFogTex(scene, keys.fog, 0xb86a3a, 0.04, 37);
      makeLayerTex(scene, p + 'far', 38, 0x3a1a12, 0.9, 0xd9803a, warFar);
      makeLayerTex(scene, p + 'mid', 39, 0x261109, 0.6, 0xb8652c, warMid);
      makeLayerTex(scene, p + 'near', 41, 0x140805, 0.3, 0x8a4a22, warNear);
      break;
    case 'spores':
      makeFogTex(scene, keys.fog, 0x7dffc0, 0.022, 34);
      makeLayerTex(scene, p + 'far', 30, 0x0d3a3c, 0.9, 0x3a8a78, sporesFar);
      makeLayerTex(scene, p + 'mid', 35, 0x08282c, 0.6, 0x2a6a60, sporesMid);
      makeLayerTex(scene, p + 'near', 36, 0x041619, 0.3, 0x1a4a44, sporesNear);
      break;
  }
  return keys;
}

// ====================================================================== rooftops
/** One rooftop to run along. The top edge is always flat and bright so the platform is easy to read. */
export function drawLevelBuilding(scene: Phaser.Scene, style: ExtraStyle, x: number, top: number, w: number, hc: boolean) {
  const g = scene.add.graphics({ x, y: top });
  const r = rng(Math.floor(x * 31 + w));
  const bodyH = H - top + 80;
  const edge = (color: number) => g.fillStyle(hc ? 0xffffff : color, 1).fillRect(-4, 0, w + 8, hc ? 4 : 3);

  if (style === 'wastes') {
    const roof = 0x2a1810;
    // behind the player: tilted water tank on stilts, a radio mast, or a heap of rubble
    const kind = r();
    if (w > 220 && kind < 0.35) {
      const tx = 30 + r() * (w - 120);
      g.fillStyle(roof, 1).fillRect(tx, -50, 4, 50).fillRect(tx + 44, -50, 4, 50);
      g.save();
      g.translateCanvas(tx + 26, -78);
      g.rotateCanvas(-0.14);
      g.fillStyle(roof, 1).fillRoundedRect(-30, -24, 60, 48, 8);
      g.lineStyle(2, 0x6b4a36, 1).lineBetween(-30, -6, 30, -6).lineBetween(-30, 8, 30, 8);
      g.restore();
    } else if (kind < 0.7) {
      const mx = 20 + r() * (w - 50);
      g.lineStyle(3, roof, 1).lineBetween(mx, 0, mx - 2, -110).lineBetween(mx - 12, -70, mx + 12, -70).lineBetween(mx - 8, -90, mx + 8, -90);
      g.lineBetween(mx, 0, mx - 14, -60);
    } else {
      const rx = 20 + r() * (w - 90);
      g.fillStyle(roof, 1).fillPoints(flat([rx, 0, rx + 14, -22, rx + 34, -14, rx + 50, -30, rx + 66, 0]), true);
    }
    // rebar spikes at the corners
    g.lineStyle(3, 0x4a3426, 1);
    [[6, 1], [w - 6, -1]].forEach(([cx, dir]) => g.lineBetween(cx, 0, cx + dir * 4, -22).lineBetween(cx + dir * 8, 0, cx + dir * 14, -16));
    // cracked tan concrete
    g.fillStyle(lerpColor(0x8a6a4e, 0x9b7a58, r()), 1).fillRect(0, 0, w, bodyH);
    g.fillStyle(0x6f533c, 1).fillRect(-4, 0, w + 8, 10);
    edge(0xe8c08a);
    for (let i = 0; i < Math.floor(w / 60); i++) {
      let cx = r() * w, cy = 14;
      g.lineStyle(1.5, 0x3a281c, 0.8).beginPath().moveTo(cx, cy);
      for (let k = 0; k < 7; k++) {
        cx += (r() - 0.5) * 22;
        cy += 14 + r() * 24;
        g.lineTo(cx, cy);
      }
      g.strokePath();
    }
    // blown-out windows with a bit of sky behind
    for (let wy = 44; wy < bodyH - 30; wy += 46) for (let wx = 16; wx < w - 28; wx += 40) {
      if (r() < 0.25) continue;
      g.fillStyle(r() < 0.5 ? 0x1a0e0a : 0xd78a4a, 1).fillRect(wx, wy, 16, 22);
      g.lineStyle(1.5, 0x4a3426, 1).lineBetween(wx - 2, wy + 22, wx + 18, wy + 22);
    }
  } else if (style === 'drowned') {
    const roof = 0x0f2a24;
    // a tree growing out of the roof, or a satellite dish wrapped in vines
    const kind = r();
    if (w > 200 && kind < 0.5) {
      const tx = 30 + r() * (w - 100);
      g.lineStyle(6, 0x1c2a1c, 1).lineBetween(tx, 0, tx + 3, -50);
      g.fillStyle(0x1f5a35, 1).fillCircle(tx + 3, -66, 26).fillCircle(tx - 18, -50, 18).fillCircle(tx + 24, -52, 20);
      g.fillStyle(0x3fae6a, 0.8).fillCircle(tx - 6, -74, 7).fillCircle(tx + 16, -62, 6);
    } else {
      const dx = 24 + r() * (w - 70);
      g.lineStyle(3, roof, 1).lineBetween(dx, 0, dx, -34);
      g.fillStyle(roof, 1).fillTriangle(dx - 22, -58, dx + 22, -58, dx, -30);
      g.lineStyle(2, 0x2f8f50, 1).lineBetween(dx - 18, -56, dx - 20, -36).lineBetween(dx + 10, -50, dx + 14, -26);
    }
    g.fillStyle(lerpColor(0x35504a, 0x445f55, r()), 1).fillRect(0, 0, w, bodyH);
    g.fillStyle(0x24403a, 1).fillRect(-4, 0, w + 8, 10);
    // moss along the top edge and flood stains down the wall
    g.fillStyle(0x3fae6a, 1).fillRect(-4, -3, w + 8, 4);
    for (let mx = -4; mx < w + 4; mx += 6 + r() * 8) g.fillStyle(0x2f8f50, 1).fillRect(mx, 1, 4 + r() * 8, 3 + r() * 6);
    g.fillStyle(0x0c1f1c, 0.4);
    for (let i = 0; i < w / 40; i++) g.fillRect(r() * w, 12, 6 + r() * 8, 40 + r() * (bodyH - 60));
    g.fillStyle(0x0c1f1c, 0.55).fillRect(0, bodyH - 90, w, 90);
    // windows with a faint green glow, hanging vines
    for (let wy = 34; wy < bodyH - 90; wy += 46) for (let wx = 16; wx < w - 28; wx += 38) {
      const lit = r() < 0.2;
      g.fillStyle(lit ? 0x8affc0 : 0x061311, lit ? 0.85 : 1).fillRect(wx, wy, 14, 22);
    }
    g.lineStyle(2, 0x2f8f50, 1);
    for (let i = 0; i < w / 50; i++) {
      const vx = r() * w;
      g.lineBetween(vx, 4, vx + (r() - 0.5) * 10, 30 + r() * 90);
    }
  } else if (style === 'void') {
    const trim = NEON[Math.floor(r() * 3)];
    // a floating neon cube or an antenna with a glowing orb
    if (r() < 0.5 && w > 180) {
      const cx = 24 + r() * (w - 80);
      g.lineStyle(2, trim, 1).strokeRect(cx, -40, 30, 30);
      g.lineBetween(cx, -40, cx + 10, -50).lineBetween(cx + 30, -40, cx + 40, -50).lineBetween(cx + 10, -50, cx + 40, -50).lineBetween(cx + 40, -50, cx + 40, -20).lineBetween(cx + 30, -10, cx + 40, -20);
    } else {
      const ax = 24 + r() * (w - 60);
      g.lineStyle(3, 0x0d0524, 1).lineBetween(ax, 0, ax, -70);
      g.fillStyle(trim, 0.3).fillCircle(ax, -78, 14).fillStyle(trim, 1).fillCircle(ax, -78, 6);
    }
    g.fillStyle(lerpColor(0x1c1050, 0x2a1670, r()), 1).fillRect(0, 0, w, bodyH);
    g.fillStyle(0x0d0830, 1).fillRect(-4, 0, w + 8, 10);
    g.fillStyle(trim, 0.35).fillRect(-4, 0, w + 8, 8);
    g.fillStyle(hc ? 0xffffff : trim, 1).fillRect(-4, 0, w + 8, hc ? 4 : 3);
    g.fillStyle(trim, 0.8).fillRect(0, 10, 3, bodyH).fillRect(w - 3, 10, 3, bodyH);
    // windows with little glyphs
    for (let wy = 30; wy < bodyH - 30; wy += 40) for (let wx = 16; wx < w - 28; wx += 36) {
      const c = NEON[Math.floor(r() * 3)], lit = r() < 0.55;
      g.fillStyle(0x07031c, 1).fillRect(wx, wy, 18, 24);
      if (lit) {
        g.lineStyle(2, c, 0.9);
        const k = Math.floor(r() * 3);
        if (k === 0) g.lineBetween(wx + 3, wy + 5, wx + 15, wy + 5).lineBetween(wx + 9, wy + 5, wx + 9, wy + 19);
        else if (k === 1) g.strokeCircle(wx + 9, wy + 12, 5);
        else g.lineBetween(wx + 3, wy + 19, wx + 9, wy + 5).lineBetween(wx + 9, wy + 5, wx + 15, wy + 19);
      }
    }
  } else if (style === 'war') {
    // behind the player: posts with barbed wire, a sandbag stack, a broken wall, a wrecked cart wheel
    const post = 0x2a1a12;
    const px1 = 24 + r() * 40, px2 = px1 + 90 + r() * 80;
    g.fillStyle(post, 1).fillRect(px1, -44, 5, 44).fillRect(Math.min(w - 20, px2), -44, 5, 44);
    g.lineStyle(2, 0x3a2a20, 1).lineBetween(px1 + 2, -38, Math.min(w - 20, px2) + 2, -34).lineBetween(px1 + 2, -24, Math.min(w - 20, px2) + 2, -22);
    for (let bx = px1 + 12; bx < Math.min(w - 20, px2) - 6; bx += 18) g.lineBetween(bx, -40, bx + 7, -30).lineBetween(bx, -30, bx + 7, -40);
    if (w > 260) {
      const sx = w - 90 - r() * 40;
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) {
        g.fillStyle(row % 2 ? 0x6f5a3a : 0x7c6644, 1).fillRoundedRect(sx + k * 22 + row * 11, -14 - row * 12, 22, 13, 5);
        g.lineStyle(1.5, 0x2a1a12, 1).strokeRoundedRect(sx + k * 22 + row * 11, -14 - row * 12, 22, 13, 5);
      }
    }
    // the trench: packed earth with plank facing, beams, stones and puddles
    g.fillStyle(lerpColor(0x4a3526, 0x5a4230, r()), 1).fillRect(0, 0, w, bodyH);
    g.fillStyle(0x3a281c, 1).fillRect(-4, 0, w + 8, 12);
    edge(0xcfa56a);
    for (let py = 22; py < bodyH; py += 18) {
      g.fillStyle(0x2f2016, 0.55).fillRect(0, py, w, 2);
      for (let pxx = (py / 18) % 2 ? 30 : 0; pxx < w; pxx += 60) g.fillStyle(0x2f2016, 0.5).fillRect(pxx, py, 2, 18);
    }
    for (let bx = 40 + r() * 20; bx < w - 20; bx += 90 + r() * 40) {
      g.fillStyle(0x2a1a12, 1).fillRect(bx, 12, 8, bodyH);
      g.fillStyle(0x6b4a2c, 0.8).fillRect(bx + 1, 12, 2, bodyH);
    }
    for (let i = 0; i < w / 34; i++) {
      const sx = r() * w, sy = 20 + r() * (bodyH - 40);
      g.fillStyle(r() < 0.5 ? 0x7a6f66 : 0x5f554d, 1).fillEllipse(sx, sy, 8 + r() * 12, 6 + r() * 7);
    }
    for (let i = 0; i < w / 90; i++) g.fillStyle(0x18120e, 0.7).fillEllipse(r() * w, 6, 40 + r() * 30, 4); // puddles on the floor
  } else {
    // spores: a living stump with glowing mushrooms on top
    const body = lerpColor(0x1d3a2e, 0x2a4a38, r());
    const kind = r();
    const mx = 24 + r() * (w - 70);
    if (kind < 0.7) mushroom(g, mx, 0, 40 + r() * 36, 22 + r() * 12, 0x0a2a26, r() < 0.5 ? 0x7dffc0 : 0xff9bf0);
    if (w > 220) mushroom(g, Math.max(20, Math.min(w - 20, w - mx)), 0, 20 + r() * 20, 12 + r() * 8, 0x0a2a26, 0xff9bf0);
    g.fillStyle(body, 1).fillRect(0, 0, w, bodyH);
    // bark rings and roots
    g.lineStyle(2, 0x0e231c, 0.8);
    for (let by = 22; by < bodyH; by += 26) g.beginPath().moveTo(0, by).lineTo(w * 0.3, by + 6).lineTo(w * 0.6, by - 4).lineTo(w, by + 5).strokePath();
    g.fillStyle(0x0e231c, 1).fillRect(-4, 0, w + 8, 10);
    g.fillStyle(0x4dd89a, 0.9).fillRect(-4, 0, w + 8, 4);
    edge(0x9dffd6);
    // glowing sap veins and little lamps
    for (let i = 0; i < w / 45; i++) {
      let cx = r() * w, cy = 14;
      g.lineStyle(2, r() < 0.6 ? 0x7dffc0 : 0xff9bf0, 0.7).beginPath().moveTo(cx, cy);
      for (let k = 0; k < 6; k++) {
        cx += (r() - 0.5) * 20;
        cy += 16 + r() * 22;
        g.lineTo(cx, cy);
      }
      g.strokePath();
    }
    for (let i = 0; i < w / 50; i++) {
      const bx = 10 + r() * (w - 20), by = 40 + r() * (bodyH - 90);
      g.fillStyle(0x7dffc0, 0.2).fillCircle(bx, by, 9).fillStyle(0xc8ffe3, 0.9).fillCircle(bx, by, 3);
    }
  }
  g.setDepth(5);
  return g;
}

// ====================================================================== patrolling enemies
/** Frame textures: skeleton-a/b (28x44) and crawler-a/b (36x22). Dark outline first so they read on any backdrop. */
export function makeEnemyTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('skeleton-a')) return;
  const BONE = 0xece4cc, DARK = 0x120d18, EYE = 0xff3b3b;
  (['a', 'b'] as const).forEach((f, fi) => {
    // ---- skeleton, facing right
    const g = gfx(scene);
    const stroke = (w: number, c: number) => g.lineStyle(w, c, 1);
    const draw = (w: number, c: number) => {
      stroke(w, c);
      g.lineBetween(14, 16, 14, 28); // spine
      for (let y = 18; y <= 26; y += 4) g.lineBetween(8, y, 20, y); // ribs
      g.lineBetween(14, 16, 6, 22 + fi * 2).lineBetween(6, 22 + fi * 2, 9, 30); // back arm
      g.lineBetween(14, 16, 22, 20 - fi * 2).lineBetween(22, 20 - fi * 2, 26, 15 + fi * 3); // reaching arm
      g.lineBetween(9, 28, 19, 28); // pelvis
      const s = fi ? 1 : -1;
      g.lineBetween(11, 28, 11 + 4 * s, 36).lineBetween(11 + 4 * s, 36, 11 + 7 * s, 43); // legs
      g.lineBetween(17, 28, 17 - 4 * s, 36).lineBetween(17 - 4 * s, 36, 17 - 7 * s, 43);
    };
    draw(5, DARK);
    g.fillStyle(DARK, 1).fillCircle(14, 9, 9);
    draw(2.4, BONE);
    g.fillStyle(BONE, 1).fillCircle(14, 9, 7.5).fillRect(9, 13, 10, 4);
    g.fillStyle(DARK, 1).fillCircle(11, 8, 2.6).fillCircle(17.5, 8, 2.6).fillRect(10, 14, 8, 1.5);
    g.fillStyle(EYE, 1).fillCircle(11.5, 8, 1.2).fillCircle(18, 8, 1.2);
    g.generateTexture(`skeleton-${f}`, 28, 44);
    g.destroy();

    // ---- crawler: a glowing six-legged beetle-bot, facing right
    const c = gfx(scene);
    const legs = (w: number, col: number) => {
      c.lineStyle(w, col, 1);
      [[10, 6], [18, 0], [26, -6]].forEach(([x, o], i) => {
        const lift = (i + fi) % 2 ? 3 : 0;
        c.lineBetween(x, 12, x + o * 0.5 - 3, 21 - lift).lineBetween(x, 12, x + o * 0.5 + 4, 21 - lift);
      });
    };
    legs(4.5, DARK);
    c.fillStyle(DARK, 1).fillEllipse(18, 11, 34, 20);
    legs(2, 0xffb347);
    c.fillStyle(0xd1631f, 1).fillEllipse(18, 11, 30, 16);
    c.fillStyle(0xffb347, 1).fillEllipse(16, 8, 18, 6);
    c.fillStyle(DARK, 1).fillCircle(29, 9, 4.5);
    c.fillStyle(EYE, 1).fillCircle(30, 9, 2.4);
    c.fillStyle(0xffffff, 0.9).fillCircle(30.6, 8.4, 0.9);
    c.generateTexture(`crawler-${f}`, 36, 22);
    c.destroy();
  });
}

// ====================================================================== jump-through rings
/** A hoop seen from the side: a far rim ('ring-back') drawn behind Iggy and a near rim ('ring-front') in front of him. */
export function makeRingTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('ring-front')) return;
  const rim = (key: string, cx: number, gold: number, glow: number) => {
    const g = gfx(scene);
    const w = 22, h = 66, cy = 36;
    g.fillStyle(glow, 0.14).fillEllipse(cx, cy, w + 10, h + 10);
    g.lineStyle(8, 0x1a1208, 1).strokeEllipse(cx, cy, w, h);
    g.lineStyle(4.5, gold, 1).strokeEllipse(cx, cy, w, h);
    // highlight along the upper-left of the rim
    const hl: number[] = [];
    for (let a = 200; a <= 250; a += 10) hl.push(cx + Math.cos(Phaser.Math.DegToRad(a)) * (w / 2 - 0.5), cy + Math.sin(Phaser.Math.DegToRad(a)) * (h / 2 - 0.5));
    g.lineStyle(1.6, 0xffffff, 0.7).beginPath().moveTo(hl[0], hl[1]);
    for (let i = 2; i < hl.length; i += 2) g.lineTo(hl[i], hl[i + 1]);
    g.strokePath();
    g.generateTexture(key, 44, 72);
    g.destroy();
  };
  rim('ring-back', 26, 0xb8860b, 0xffd24a);
  rim('ring-front', 18, 0xffd24a, 0xffd24a);
}

// ====================================================================== platforms and checkpoint flags
export function makePlatformTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('plat-moving')) return;
  const slab = (key: string, top: number, side: number, mark: number) => {
    const g = gfx(scene);
    g.fillStyle(0x000000, 1).fillRoundedRect(0, 0, 84, 16, 3);
    g.fillStyle(side, 1).fillRoundedRect(2, 2, 80, 12, 2);
    g.fillStyle(top, 1).fillRect(2, 2, 80, 4);
    g.fillStyle(mark, 1);
    for (let x = 8; x < 78; x += 14) g.fillRect(x, 8, 7, 3);
    g.generateTexture(key, 84, 16);
    g.destroy();
  };
  slab('plat-moving', 0x7fd0ff, 0x2f6f8f, 0xffffff); // blue steel with white stripes: moves
  slab('plat-crumble', 0xe0b070, 0x8a5a2a, 0x3a2410); // cracked wood: falls apart
  slab('plat-secret', 0xffe27a, 0xb8860b, 0xffffff); // glowing gold: the hidden sky layer
  const flag = (key: string, cloth: number) => {
    const g = gfx(scene);
    g.fillStyle(0x000000, 1).fillRect(0, 0, 8, 76);
    g.fillStyle(0xcfd6e0, 1).fillRect(2, 2, 4, 72);
    g.fillStyle(0x000000, 1).fillTriangle(6, 2, 40, 16, 6, 30);
    g.fillStyle(cloth, 1).fillTriangle(6, 5, 35, 16, 6, 27);
    g.generateTexture(key, 42, 76);
    g.destroy();
  };
  flag('flag-off', 0x8a8f99);
  flag('flag-on', 0x3ddc84);
}

// ====================================================================== flying enemies (levels 4-6)
/** Two wing/tentacle frames each: a glowing sea creature, a neon drone and a spore moth. 48x40, symmetrical. */
export function makeFlyerTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('flyer-drowned-a')) return;
  const OUT = 0x04070a;
  (['a', 'b'] as const).forEach((f, fi) => {
    // ---- drowned: a glowing jellyfish with a pulsing bell and trailing tentacles
    let g = gfx(scene);
    const sway = fi ? 3 : -3;
    for (const x of [14, 20, 28, 34]) {
      g.lineStyle(5, OUT, 1).lineBetween(x, 20, x + sway * (x < 24 ? -1 : 1), 36);
      g.lineStyle(2.4, 0x7affd8, 1).lineBetween(x, 20, x + sway * (x < 24 ? -1 : 1), 36);
    }
    const bellH = fi ? 22 : 26;
    g.fillStyle(0x1fb8a4, 0.35).fillEllipse(24, 16, 46, bellH + 10);
    g.fillStyle(OUT, 1).fillEllipse(24, 15, 36, bellH + 4);
    g.fillStyle(0x3fd9c4, 1).fillEllipse(24, 15, 32, bellH);
    g.fillStyle(0xbaffee, 0.8).fillEllipse(19, 10, 12, 6);
    g.fillStyle(OUT, 1).fillCircle(19, 17, 2.6).fillCircle(29, 17, 2.6);
    g.fillStyle(0xff5a5a, 1).fillCircle(19, 17, 1.3).fillCircle(29, 17, 1.3);
    g.generateTexture(`flyer-drowned-${f}`, 48, 40);
    g.destroy();

    // ---- void: a neon drone, a saucer with a glass dome and blinking under-lights
    g = gfx(scene);
    g.fillStyle(0xff3df0, 0.2).fillEllipse(24, 24, 48, 22);
    g.lineStyle(3, OUT, 1).lineBetween(24, 10, 24, 2).strokeCircle(24, 2, 2);
    g.fillStyle(0xff3df0, 1).fillCircle(24, 2, 2);
    g.fillStyle(OUT, 1).fillEllipse(24, 24, 44, 17);
    g.fillStyle(0x2a1055, 1).fillEllipse(24, 24, 40, 13);
    g.lineStyle(2, 0x3df0ff, 1).strokeEllipse(24, 24, 40, 13);
    g.fillStyle(OUT, 1).fillEllipse(24, 17, 22, 17);
    g.fillStyle(0x7fe8ff, 0.9).fillEllipse(24, 17, 18, 13);
    g.fillStyle(0xff3030, 1).fillCircle(24, 18, 3.2);
    [12, 24, 36].forEach((x, i) => g.fillStyle((i + fi) % 2 ? 0xffffff : 0xff3df0, 1).fillCircle(x, 28, 2));
    g.generateTexture(`flyer-void-${f}`, 48, 40);
    g.destroy();

    // ---- spores: a glowing moth, wings up (a) and down (b)
    g = gfx(scene);
    const wy = fi ? 24 : 10; // wing tip height
    const wing = (dir: number) => {
      const pts = [new Phaser.Math.Vector2(24, 20), new Phaser.Math.Vector2(24 + dir * 22, wy), new Phaser.Math.Vector2(24 + dir * 20, wy + 14), new Phaser.Math.Vector2(24 + dir * 4, 28)];
      g.fillStyle(0xb36cff, 0.28).fillPoints(pts.map((p) => new Phaser.Math.Vector2(24 + (p.x - 24) * 1.15, p.y)), true);
      g.fillStyle(0xa04dff, 1).fillPoints(pts, true);
      g.lineStyle(3, OUT, 1).strokePoints(pts, true, true);
      g.fillStyle(0xf4d4ff, 1).fillCircle(24 + dir * 14, wy + 8, 3).fillCircle(24 + dir * 9, wy + 14, 2);
    };
    wing(-1); wing(1);
    g.fillStyle(OUT, 1).fillEllipse(24, 22, 11, 20);
    g.fillStyle(0x6b4a3a, 1).fillEllipse(24, 22, 7.5, 16);
    g.lineStyle(2, OUT, 1).lineBetween(22, 12, 17, 5).lineBetween(26, 12, 31, 5);
    g.fillStyle(0x6dffb0, 1).fillCircle(22.5, 17, 1.6).fillCircle(25.5, 17, 1.6);
    g.generateTexture(`flyer-spores-${f}`, 48, 40);
    g.destroy();
  });
}

/** Warzone props: barbed wire, dirt and stone piles, road blocks, hedgehogs and landmines. */
export function makeWarTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('wire-war')) return;
  const OUT = 0x120a06;
  // barbed wire coil on two posts (34 x 42)
  let g = gfx(scene);
  g.fillStyle(OUT, 1).fillRect(2, 8, 6, 34).fillRect(26, 8, 6, 34);
  g.fillStyle(0x6b4a2c, 1).fillRect(3.5, 9, 3, 33).fillRect(27.5, 9, 3, 33);
  for (let i = 0; i < 4; i++) {
    g.lineStyle(4, OUT, 1).strokeEllipse(17, 18 + i * 6, 30, 14);
    g.lineStyle(1.6, 0xb8bcc2, 1).strokeEllipse(17, 18 + i * 6, 30, 14);
  }
  for (let i = 0; i < 9; i++) {
    const bx = 5 + i * 3.4, by = 14 + (i % 4) * 7;
    g.lineStyle(1.6, 0xe0e3e8, 1).lineBetween(bx - 2, by - 2, bx + 2, by + 2).lineBetween(bx - 2, by + 2, bx + 2, by - 2);
  }
  g.generateTexture('wire-war', 34, 42);
  g.destroy();

  // pile of dirt and stone (44 x 64)
  g = gfx(scene);
  g.fillStyle(OUT, 1).fillPoints(flat([0, 64, 6, 40, 14, 24, 24, 8, 32, 22, 40, 38, 44, 64]), true);
  g.fillStyle(0x5f4630, 1).fillPoints(flat([3, 62, 9, 41, 16, 26, 24, 11, 31, 24, 38, 40, 41, 62]), true);
  g.fillStyle(0x77593a, 1).fillPoints(flat([9, 41, 16, 26, 24, 11, 26, 30, 18, 48]), true);
  const stones: [number, number, number, number, number][] = [[12, 50, 9, 7, 0x8a8178], [28, 46, 11, 8, 0x6f675f], [20, 34, 8, 6, 0x938a80], [33, 56, 9, 6, 0x7b736b], [10, 58, 7, 5, 0x6f675f]];
  stones.forEach(([x, y, w, h, c]) => { g.fillStyle(OUT, 1).fillEllipse(x, y, w + 2, h + 2); g.fillStyle(c, 1).fillEllipse(x, y, w, h); });
  g.lineStyle(3, OUT, 1).lineBetween(30, 18, 40, 4); // a splintered plank
  g.lineStyle(1.5, 0x9a7a52, 1).lineBetween(30, 18, 40, 4);
  g.generateTexture('wall-war-dirt', 44, 64);
  g.destroy();

  // concrete road block with hazard stripes (40 x 64)
  g = gfx(scene);
  g.fillStyle(OUT, 1).fillPoints(flat([2, 64, 6, 20, 12, 4, 28, 4, 34, 20, 38, 64]), true);
  g.fillStyle(0xa8a69e, 1).fillPoints(flat([4.5, 62, 8, 21, 13.5, 6.5, 26.5, 6.5, 32, 21, 35.5, 62]), true);
  g.fillStyle(0xd8d6ce, 1).fillRect(14, 8, 3, 52);
  for (let i = 0; i < 4; i++) g.fillStyle(0xf2c230, 1).fillPoints(flat([8 + i * 7, 22, 14 + i * 7, 22, 8 + i * 7, 30, 2 + i * 7, 30]), true);
  g.lineStyle(1.4, 0x55524b, 1).lineBetween(10, 40, 18, 50).lineBetween(18, 50, 16, 58).lineBetween(26, 34, 30, 44);
  g.generateTexture('wall-war-block', 40, 64);
  g.destroy();

  // czech hedgehog: three crossed steel beams (44 x 64)
  g = gfx(scene);
  for (const [w, c] of [[9, OUT], [5, 0x8a5a38]] as const) {
    g.lineStyle(w, c, 1).lineBetween(4, 60, 40, 6).lineBetween(40, 60, 4, 6).lineBetween(0, 33, 44, 33);
  }
  g.lineStyle(1.5, 0xc99a6a, 1).lineBetween(8, 52, 20, 33).lineBetween(34, 52, 24, 33);
  g.generateTexture('wall-war-hog', 44, 64);
  g.destroy();

  // landmine: a half-buried disc with a blinking light (30 x 12)
  for (const [key, lamp, glow] of [['mine-war-a', 0x5a1010, false], ['mine-war-b', 0xff3b30, true]] as const) {
    g = gfx(scene);
    if (glow) g.fillStyle(0xff3b30, 0.3).fillCircle(15, 4, 8);
    g.fillStyle(OUT, 1).fillEllipse(15, 8, 30, 12);
    g.fillStyle(0x56603a, 1).fillEllipse(15, 7.5, 26, 8);
    g.fillStyle(0x7a8656, 1).fillEllipse(13, 6, 14, 3);
    g.fillStyle(OUT, 1).fillCircle(15, 4.2, 3.6);
    g.fillStyle(lamp, 1).fillCircle(15, 4.2, 2.4);
    g.generateTexture(key, 30, 12);
    g.destroy();
  }
}
