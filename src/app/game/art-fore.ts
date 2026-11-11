import Phaser from 'phaser';
import { gfx } from './art';
import type { LevelStyle } from './levels';
import { H, W } from './art';

/**
 * Foreground parallax: dark silhouettes along the very top and bottom edges that slide past faster than the world.
 * They never come near the rooftops or Iggy's jump height, so they frame the action without hiding it.
 * One 960x540 tile per level style; elements stay clear of the tile's left/right edges so it repeats cleanly.
 */
type Draw = (g: Phaser.GameObjects.Graphics, rnd: () => number) => void;

function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

/** a drooping line from (x0, 0) sagging to y, ending at (x1, 0): hanging cables, vines */
function sag(g: Phaser.GameObjects.Graphics, x0: number, x1: number, depth: number, w: number, color: number) {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    pts.push(new Phaser.Math.Vector2(Phaser.Math.Linear(x0, x1, u), Math.sin(u * Math.PI) * depth));
  }
  g.lineStyle(w, color, 1).strokePoints(pts, false, false);
}

const DRAW: Record<LevelStyle, Draw> = {
  // power cables and street lamps on the top edge, antenna masts rising at the bottom
  city: (g, r) => {
    for (const x0 of [40, 300, 560, 780]) { sag(g, x0, x0 + 200, 34 + r() * 22, 3, 0x05070d); g.fillStyle(0x05070d, 1).fillRect(x0 - 3, 0, 6, 46); }
    for (const x of [150, 470, 700]) { g.fillStyle(0xffd98a, 0.9).fillCircle(x, 52, 4); g.fillStyle(0x05070d, 1).fillRect(x - 2, 0, 4, 46); }
    for (let i = 0; i < 6; i++) { const x = 60 + i * 150 + r() * 40, h = 20 + r() * 26; g.fillStyle(0x05070d, 1).fillRect(x, H - h, 3, h); g.fillRect(x - 8, H - h + 6, 19, 2); }
  },
  // twisted dead branches from the top, tufts of grave grass at the bottom
  hollow: (g, r) => {
    for (const x0 of [30, 330, 640]) {
      const pts = [new Phaser.Math.Vector2(x0, 0)];
      let x = x0, y = 0;
      for (let i = 0; i < 5; i++) { x += (r() - 0.35) * 60; y += 14 + r() * 12; pts.push(new Phaser.Math.Vector2(x, y)); }
      g.lineStyle(6, 0x0a0714, 1).strokePoints(pts, false, false);
      g.lineStyle(3, 0x0a0714, 1).lineBetween(pts[3].x, pts[3].y, pts[3].x + 40, pts[3].y + 14);
    }
    for (let i = 0; i < 14; i++) { const x = 30 + i * 65 + r() * 30; g.lineStyle(2, 0x0a0714, 1).lineBetween(x, H, x - 6, H - 22 - r() * 12).lineBetween(x, H, x + 7, H - 16 - r() * 12); }
  },
  // hanging chains and rebar on top, a jagged rock edge at the bottom
  wastes: (g, r) => {
    for (const x of [90, 260, 520, 740, 880]) { const h = 30 + r() * 40; g.lineStyle(3, 0x1a0b08, 1).lineBetween(x, 0, x, h); for (let y = 6; y < h; y += 9) g.strokeEllipse(x, y, 6, 8); }
    for (let i = 0; i < 9; i++) { const x = 30 + i * 100 + r() * 30, h = 14 + r() * 26; g.fillStyle(0x1a0b08, 1).fillTriangle(x, H, x + 34, H, x + 12 + r() * 10, H - h); }
  },
  // dripping vines on top, swaying weed at the bottom
  drowned: (g, r) => {
    for (const x0 of [60, 240, 430, 610, 800]) { const len = 40 + r() * 50; g.lineStyle(3, 0x04201a, 1).lineBetween(x0, 0, x0 + (r() - 0.5) * 20, len); g.fillStyle(0x0c3a2c, 1).fillEllipse(x0 + 4, len * 0.55, 12, 6).fillEllipse(x0 - 4, len * 0.8, 12, 6); }
    for (let i = 0; i < 10; i++) { const x = 40 + i * 90 + r() * 30; sag(g, x, x + 14, 0, 0, 0); g.lineStyle(3, 0x04201a, 1).lineBetween(x, H, x + 8, H - 26 - r() * 20); }
  },
  // inverted crystal shards on top, small shards rising from the bottom, with a neon edge
  void: (g, r) => {
    for (let i = 0; i < 8; i++) { const x = 40 + i * 110 + r() * 40, h = 22 + r() * 40; g.fillStyle(0x0b0420, 1).fillTriangle(x, 0, x + 26, 0, x + 13, h); g.lineStyle(2, 0xff3df0, 0.8).lineBetween(x, 0, x + 13, h); }
    for (let i = 0; i < 7; i++) { const x = 60 + i * 130 + r() * 40, h = 14 + r() * 24; g.fillStyle(0x0b0420, 1).fillTriangle(x, H, x + 22, H, x + 11, H - h); g.lineStyle(2, 0x3df0ff, 0.8).lineBetween(x + 22, H, x + 11, H - h); }
  },
  // snapped telegraph poles with sagging wire on top, stakes and barbed wire along the bottom
  war: (g, r) => {
    for (const x0 of [70, 360, 650]) { g.fillStyle(0x0a0504, 1).fillRect(x0 - 3, 0, 6, 40 + r() * 20); sag(g, x0, x0 + 230, 24 + r() * 16, 2, 0x0a0504); }
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 105 + r() * 20;
      g.fillStyle(0x0a0504, 1).fillRect(x, H - 36 - r() * 10, 5, 46);
      g.lineStyle(2, 0x0a0504, 1).beginPath().moveTo(x, H - 26).lineTo(x + 26, H - 34).lineTo(x + 52, H - 24).lineTo(x + 78, H - 34).lineTo(x + 100, H - 26).strokePath();
      for (let k = 0; k < 4; k++) g.lineBetween(x + 14 + k * 22, H - 38, x + 22 + k * 22, H - 22);
    }
  },
  // chains and hooks hanging from the roof, a row of glowing slag spatter along the bottom
  plant: (g, r) => {
    for (let i = 0; i < 6; i++) {
      const x = 60 + i * 160 + r() * 40, h = 30 + r() * 70;
      g.lineStyle(3, 0x080404, 1).lineBetween(x, 0, x, h);
      g.fillStyle(0x080404, 1).fillTriangle(x - 7, h, x + 7, h, x, h + 14);
    }
    for (let i = 0; i < 14; i++) { const x = r() * W; g.fillStyle(0xff6a2a, 0.22).fillCircle(x, H - 4, 10 + r() * 14); g.fillStyle(0xffb060, 0.5).fillCircle(x, H - 2, 3 + r() * 3); }
    g.fillStyle(0x080404, 1).fillRect(0, H - 8, W, 8);
  },
  // mushroom-cap edges and glowing hanging strands on top, fern fronds at the bottom
  spores: (g, r) => {
    for (const x of [100, 420, 760]) { g.fillStyle(0x07151c, 1).fillEllipse(x, 0, 150 + r() * 40, 60); g.fillStyle(0x6dffb0, 0.5).fillCircle(x - 30, 22, 3).fillCircle(x + 22, 26, 3); }
    for (let i = 0; i < 9; i++) { const x = 40 + i * 100 + r() * 30, h = 18 + r() * 40; g.lineStyle(2, 0x6dffb0, 0.55).lineBetween(x, 0, x + (r() - 0.5) * 10, h); g.fillStyle(0x6dffb0, 0.9).fillCircle(x, h, 2.4); }
    for (let i = 0; i < 8; i++) { const x = 50 + i * 115 + r() * 30; for (let k = -2; k <= 2; k++) g.lineStyle(3, 0x07151c, 1).lineBetween(x, H, x + k * 12, H - 24 - (2 - Math.abs(k)) * 6); }
  },
};

export function makeForeTexture(scene: Phaser.Scene, style: LevelStyle) {
  const key = `fore-${style}`;
  if (scene.textures.exists(key)) return key;
  const g = gfx(scene);
  DRAW[style](g, lcg(style.length * 977 + style.charCodeAt(0)));
  g.generateTexture(key, W, H);
  g.destroy();
  return key;
}
