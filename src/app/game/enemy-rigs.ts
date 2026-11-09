import Phaser from 'phaser';
import { Def, Draw, OUT, Pose, TAU, circ, frame, grit, knee, lamp, limb, poly, put, rect, shade, stride } from './boss-rigs';
import type { LevelStyle } from './levels';

/**
 * The enemies as animated 16-bit-style characters, drawn in code like the bosses (see boss-rigs.ts): a skeleton soldier that walks,
 * raises its rifle and fires; a mech tarantula with eight stepping legs; the death-ray's flapping wings and swaying stinger tail;
 * and the gearbat's spinning gear wings. All of them are drawn facing LEFT; the walkers are mirrored when they are built because
 * the game expects them to face right.
 *
 * Texture keys: skeleton-w0..w5, skeleton-aim, skeleton-fire; crawler-w0..w5; flyer-<style>-f0..f5 and flyer-<style>-dive.
 */
const SC = 2;

// ---------------------------------------------------------------- skeleton soldier (32 x 36)
const soldier: Draw = (c, p) => {
  const BONE = '#b8c2bf', STEELG = '#7f8f9a', OLIVE = '#5f9a90', DARKO = '#3a4624', ORANGE = '#ff8a2a', LEATHER = '#8a6a3c';
  const G = 35, bob = p.moving ? Math.abs(Math.sin(p.phase)) * 1.4 : Math.sin(p.t * 2.4) * 0.5;
  const hipX = 19, hipY = 21 + bob;
  // legs: bony, with steel knee joints and boots
  for (const side of [1, 0]) {
    const ph = p.moving ? p.phase + side * Math.PI : 0;
    const f = p.moving ? stride(ph, 3.6, 3.4) : { x: side ? -2 : 2, y: 0 };
    const fx = hipX + (side ? 1 : -1) + f.x, fy = G + f.y;
    const [kx, ky] = knee(hipX + (side ? 1 : -1), hipY + 2, fx, fy - 2, 6.5, 6.5, 1);
    limb(c, [hipX + (side ? 1 : -1), hipY + 2, kx, ky, fx, fy - 2], 2.2, side ? shade(BONE, -0.18) : BONE);
    circ(c, kx, ky, 1.7, STEELG);
    poly(c, [fx - 4, fy - 3, fx + 2, fy - 3, fx + 3, fy, fx - 5, fy], side ? DARKO : OLIVE);
  }
  // pelvis, ribcage with a glowing core, and a scarf
  poly(c, [hipX - 4, hipY, hipX + 4, hipY, hipX + 3, hipY + 3, hipX - 3, hipY + 3], BONE);
  poly(c, [hipX - 5, hipY - 11, hipX + 5, hipY - 11, hipX + 4, hipY - 1, hipX - 4, hipY - 1], BONE);
  c.fillStyle = '#2a2018'; for (const dy of [-8, -5, -2]) c.fillRect(hipX - 3, hipY + dy, 6, 1);
  lamp(c, hipX + 0.5, hipY - 6.5, 2.2, ORANGE, true);
  poly(c, [hipX - 6, hipY - 12, hipX + 2, hipY - 13, hipX + 3, hipY - 10, hipX - 5, hipY - 9], '#c8402e');
  // the head: a skull under a helmet, eyes burning
  const nod = p.moving ? Math.sin(p.phase * 2) * 0.4 : 0;
  circ(c, hipX - 0.5, hipY - 17 + nod, 4.4, BONE);
  c.fillStyle = '#1a1210'; c.fillRect(hipX - 4, hipY - 16 + nod, 3, 2.4); c.fillRect(hipX + 0.5, hipY - 16 + nod, 3, 2.4);
  lamp(c, hipX - 2.6, hipY - 15 + nod, 0.9, '#ff4a2a', p.aim === true || p.fire === true);
  lamp(c, hipX + 2, hipY - 15 + nod, 0.9, '#ff4a2a', p.aim === true || p.fire === true);
  c.fillStyle = '#2a2018'; c.fillRect(hipX - 2, hipY - 12.6 + nod, 5, 1);
  poly(c, [hipX - 6, hipY - 17 + nod, hipX - 4, hipY - 23 + nod, hipX + 4, hipY - 23 + nod, hipX + 5.5, hipY - 17 + nod, hipX + 1, hipY - 19 + nod], OLIVE);
  // the rifle: carried low, raised level when aiming, kicking back when it fires
  const aim = p.aim || p.fire;
  const rx = hipX - 1 + (p.fire ? 1.6 : 0), ry = aim ? hipY - 9 : hipY - 4 + (p.moving ? Math.sin(p.phase) * 0.8 : 0);
  limb(c, [hipX + 1, hipY - 9, rx + 1, ry + 1], 2, shade(BONE, -0.1));
  poly(c, [rx - 11, ry - 1.4, rx + 4, ry - 1.4, rx + 5, ry + 1.8, rx - 11, ry + 1.8], STEELG);
  poly(c, [rx - 1, ry, rx + 4, ry, rx + 5, ry + 4, rx + 1, ry + 4], LEATHER);
  c.fillStyle = ORANGE; c.fillRect(rx - 7, ry - 0.8, 5, 2);
  poly(c, [rx - 17, ry - 0.2, rx - 11, ry - 0.8, rx - 11, ry + 0.8], '#c9d2d4'); // bayonet
  if (p.fire) { c.fillStyle = '#fff3a0'; c.beginPath(); c.moveTo(rx - 11, ry + 0.2); c.lineTo(rx - 16, ry - 2.6); c.lineTo(rx - 14, ry + 0.2); c.lineTo(rx - 16, ry + 3); c.closePath(); c.fill(); }
  limb(c, [hipX - 3, hipY - 8, rx - 6, ry + 1.4], 1.8, shade(BONE, -0.2));
};

// ---------------------------------------------------------------- mech tarantula (32 x 28)
const tarantula: Draw = (c, p) => {
  const TEAL = '#3f6f6a', DARKT = '#27504c', RUST = '#b5602f', EYE = '#ff8a2a', STEEL = '#9aa8b0';
  const G = 27, bob = p.moving ? Math.abs(Math.sin(p.phase * 2)) * 0.7 : Math.sin(p.t * 2.6) * 0.5;
  const bx = 15, by = 10 + bob;
  // eight legs: four near, four far, stepping in alternating pairs
  const legs: [number, number, number][] = [[-5, 0, 0], [-1, Math.PI, 1], [3, 0, 0], [7, Math.PI, 1]];
  for (const far of [1, 0]) {
    legs.forEach(([ox, off, i], k) => {
      const ph = p.moving ? p.phase + off + (far ? Math.PI : 0) : 0;
      const f = p.moving ? stride(ph, 2.4, 3.2) : { x: 0, y: 0 };
      const spread = (k - 1.5) * 4.6;
      const hx = bx + ox * 0.6, hy = by + 1;
      const fx = bx + spread * 2.1 - (far ? 2 : 0) + f.x, fy = G - (far ? 0.6 : 0) + f.y;
      const [kx, ky] = knee(hx, hy, fx, fy, 9, 10, -1);
      limb(c, [hx, hy, kx, ky, fx, fy], far ? 1.9 : 2.5, far ? '#34605b' : '#6fa59d');
      if (!far) circ(c, kx, ky, 1.3, STEEL);
    });
  }
  // armoured abdomen with rust blotches, and the head with its cluster of eyes and twitching fangs
  circ(c, bx + 6, by - 1, 7.2, TEAL);
  c.fillStyle = RUST; c.fillRect(bx + 3, by - 4, 3, 2); c.fillRect(bx + 8, by + 1, 3, 2);
  circ(c, bx - 6, by + 1, 5.4, TEAL);
  const eye = p.charge || p.aim === true;
  lamp(c, bx - 9, by - 0.8, 1.3, EYE, true); lamp(c, bx - 6.2, by - 1.6, 1.3, EYE, true); lamp(c, bx - 4.2, by - 0.4, 1, EYE, eye);
  const fang = Math.sin(p.t * 9) * 0.6;
  poly(c, [bx - 10, by + 2.5, bx - 8.6, by + 2.5, bx - 9.4 - fang, by + 6], '#f4eede');
  poly(c, [bx - 7, by + 2.5, bx - 5.6, by + 2.5, bx - 6.4 + fang, by + 6], '#f4eede');
  limb(c, [bx - 3, by + 3, bx - 6, by + 6], 1.2, STEEL);
};

// ---------------------------------------------------------------- death-ray: a riveted metal manta (36 x 26)
const deathRay: Draw = (c, p) => {
  const METAL = '#6f878a', DARKM = '#4a6468', PLATE = '#c9a56a', EYE = '#ff7a2a', FLAME = '#ffb347';
  const flap = p.dive ? 0.2 : Math.sin(p.phase);
  const cx = 18, cy = 12 + (p.dive ? 1 : 0);
  // tail: segments that sway, ending in a stinger
  const sway = Math.sin(p.phase + 1) * 0.5;
  limb(c, [cx + 8, cy, cx + 12, cy + 3 + sway, cx + 15, cy + 8 + sway * 2, cx + 14, cy + 13 + sway * 3], 1.8, DARKM);
  poly(c, [cx + 13, cy + 12 + sway * 3, cx + 16, cy + 12 + sway * 3, cx + 15, cy + 17 + sway * 3], '#ffd23a');
  // wings: a broad manta pair that flap, panelled and riveted
  const tipY = p.dive ? cy + 5 : cy - flap * 9, tipY2 = p.dive ? cy + 4 : cy - flap * 7;
  poly(c, [cx - 3, cy - 2, cx - 17, tipY - 1, cx - 15, tipY + 3, cx - 5, cy + 3], DARKM);
  poly(c, [cx + 3, cy - 2, cx + 17, tipY2 - 1, cx + 15, tipY2 + 3, cx + 5, cy + 3], DARKM);
  poly(c, [cx - 3, cy - 1, cx - 14, tipY + 0.5, cx - 12, tipY + 4, cx - 4, cy + 3], METAL);
  poly(c, [cx + 3, cy - 1, cx + 14, tipY2 + 0.5, cx + 12, tipY2 + 4, cx + 4, cy + 3], METAL);
  c.fillStyle = PLATE; c.fillRect(cx - 9, cy + (tipY - cy) * 0.35, 3, 1.6); c.fillRect(cx + 7, cy + (tipY2 - cy) * 0.35, 3, 1.6);
  // body, with the glowing eye cluster, jaw and the emitter dish
  poly(c, [cx - 8, cy - 3, cx + 8, cy - 3, cx + 9, cy + 4, cx - 9, cy + 4], METAL);
  poly(c, [cx - 8, cy - 3, cx - 1, cy - 4, cx - 1, cy + 1, cx - 8, cy + 1], PLATE);
  const charged = p.charge === true;
  lamp(c, cx - 6, cy, 1.5, EYE, true); lamp(c, cx - 2.6, cy - 0.6, 1.5, EYE, true); lamp(c, cx - 4.4, cy + 2.2, 1.1, EYE, charged);
  poly(c, [cx - 9, cy + 3, cx - 5, cy + 3, cx - 7, cy + 6], '#f4eede');
  poly(c, [cx - 4, cy + 4, cx + 3, cy + 4, cx + 1, cy + 9, cx - 3, cy + 9], DARKM);
  poly(c, [cx - 6, cy + 9, cx + 4, cy + 9, cx + 1, cy + 13, cx - 3, cy + 13], PLATE);
  lamp(c, cx - 1, cy + 11, 1.2, charged ? '#ffffff' : EYE, true);
  const fl = 1 + Math.sin(p.t * 20) * 0.6;
  c.fillStyle = FLAME; c.beginPath(); c.moveTo(cx + 8, cy - 1); c.lineTo(cx + 13 + fl, cy - 3); c.lineTo(cx + 9, cy + 1); c.closePath(); c.fill();
};

// ---------------------------------------------------------------- gearbat (30 x 30)
const gearbat: Draw = (c, p) => {
  const METAL = '#7a7f8c', DARKM = '#3c404c', RUSTC = '#b5602f', EYE = '#ff8a2a', BRASS = '#d4a64a';
  const flap = p.dive ? -0.4 : Math.sin(p.phase);
  const cx = 15, cy = 14 + (p.dive ? 1 : 0);
  const tail = Math.sin(p.phase + 1.2) * 1.6;
  limb(c, [cx + 4, cy + 4, cx + 9, cy + 8 + tail, cx + 12, cy + 13 + tail * 1.5, cx + 10, cy + 17 + tail * 2], 1.5, DARKM);
  poly(c, [cx + 9, cy + 16 + tail * 2, cx + 12, cy + 16 + tail * 2, cx + 10, cy + 20 + tail * 2], '#ffd23a');
  // two gear-spoked wings that beat, with a spinning cog at each shoulder
  for (const s of [-1, 1]) {
    const tipY = p.dive ? cy + 7 : cy - 4 - flap * 10;
    poly(c, [cx + s * 3, cy - 2, cx + s * 14, tipY, cx + s * 13, tipY + 7, cx + s * 8, cy + 6, cx + s * 4, cy + 3], DARKM);
    c.strokeStyle = METAL; c.lineWidth = 1.1; c.beginPath(); c.moveTo(cx + s * 3, cy - 1); c.lineTo(cx + s * 14, tipY + 0.6); c.moveTo(cx + s * 3, cy); c.lineTo(cx + s * 12, tipY + 4); c.stroke();
    const gx = cx + s * 7, gy = cy - 1 - (p.dive ? -1 : flap * 2.4);
    circ(c, gx, gy, 3.3, BRASS);
    c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 4; k++) { const a = p.t * 6 * s + (k * TAU) / 4; c.moveTo(gx, gy); c.lineTo(gx + Math.cos(a) * 3, gy + Math.sin(a) * 3); } c.stroke();
  }
  // the body, a skull face with burning eyes and fangs, and pincer claws
  circ(c, cx, cy + 3, 5.4, METAL);
  c.fillStyle = RUSTC; c.fillRect(cx - 2, cy + 3, 3, 2);
  poly(c, [cx - 5, cy - 4, cx - 3, cy - 8, cx - 1.4, cy - 4], METAL); poly(c, [cx + 1.4, cy - 4, cx + 3, cy - 8, cx + 5, cy - 4], METAL);
  circ(c, cx, cy - 2, 4.6, '#c9c4b8');
  c.fillStyle = '#15101a'; c.fillRect(cx - 3.2, cy - 3.2, 2.6, 2.2); c.fillRect(cx + 0.6, cy - 3.2, 2.6, 2.2);
  lamp(c, cx - 2, cy - 2.2, 0.9, EYE, true); lamp(c, cx + 2, cy - 2.2, 0.9, EYE, true);
  poly(c, [cx - 2.4, cy + 1, cx - 1.2, cy + 1, cx - 1.8, cy + 3], '#f4eede'); poly(c, [cx + 1.2, cy + 1, cx + 2.4, cy + 1, cx + 1.8, cy + 3], '#f4eede');
  const claw = Math.sin(p.phase * 2) * 1.2;
  for (const s of [-1, 1]) { limb(c, [cx + s * 2, cy + 7, cx + s * 3, cy + 11 + claw], 1.3, DARKM); poly(c, [cx + s * 3 - 1.4, cy + 11 + claw, cx + s * 3 + 1.4, cy + 11 + claw, cx + s * 3, cy + 14 + claw], '#d6d2c4'); }
};

const SOLDIER: Def = { w: 32, h: 36, draw: soldier };
const TARANTULA: Def = { w: 32, h: 28, draw: tarantula };
const RAY: Def = { w: 36, h: 26, draw: deathRay };
const BAT: Def = { w: 30, h: 30, draw: gearbat };

export function makeEnemyRigTextures(scene: Phaser.Scene, style: LevelStyle): void {
  const make = (key: string, def: Def, pose: Pose, flip: boolean) => put(scene, key, grit(frame(def, pose), def.w * 7 + def.h), flip, SC);
  const base: Pose = { phase: 0, charge: false, moving: false, t: 0 };
  if (style === 'drowned' || style === 'void' || style === 'spores') {
    for (let f = 0; f < 6; f++) make(`crawler-w${f}`, TARANTULA, { ...base, phase: (f / 6) * TAU, moving: true, t: f * 0.4 }, true);
    make('crawler-a', TARANTULA, base, true);
    make('crawler-b', TARANTULA, { ...base, phase: Math.PI, moving: true }, true);
    const def = style === 'drowned' ? RAY : BAT;
    for (let f = 0; f < 6; f++) make(`flyer-${style}-f${f}`, def, { ...base, phase: (f / 6) * TAU, t: f * 0.3 }, false);
    make(`flyer-${style}-dive`, def, { ...base, dive: true, t: 0.2 }, false);
    make(`flyer-${style}-a`, def, base, false);
    make(`flyer-${style}-b`, def, { ...base, phase: Math.PI }, false);
  } else {
    for (let f = 0; f < 6; f++) make(`skeleton-w${f}`, SOLDIER, { ...base, phase: (f / 6) * TAU, moving: true, t: f * 0.4 }, true);
    make('skeleton-a', SOLDIER, base, true);
    make('skeleton-b', SOLDIER, { ...base, phase: Math.PI, moving: true }, true);
    make('skeleton-aim', SOLDIER, { ...base, aim: true, t: 0.3 }, true);
    make('skeleton-fire', SOLDIER, { ...base, aim: true, fire: true, t: 0.3 }, true);
  }
}
