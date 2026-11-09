import Phaser from 'phaser';
import { gfx } from './art';

/** The bosses' projectiles: the glowing orb and the ground shockwave. (The bosses themselves are drawn in boss-rigs.ts.) */
const OUT = 0x07070b;

export function makeBossShots(scene: Phaser.Scene) {
  if (scene.textures.exists('boss-orb')) return;
  const o = gfx(scene);
  o.fillStyle(0xff7a1a, 0.35).fillCircle(12, 12, 12);
  o.fillStyle(0xffd23a, 1).fillCircle(12, 12, 7);
  o.fillStyle(0xffffff, 0.8).fillCircle(10, 10, 2.4);
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
