import Phaser from 'phaser';
import type { LevelStyle } from './levels';

/**
 * The seven bosses as animated 16-bit-style characters. Each frame is drawn in code on a small grid with real moving parts
 * (two-bone legs that step, swinging pendulums, sweeping tails, opening claws, a spinning hover ring, rolling tracks),
 * then made crisp (hard edges, no smoothing) and scaled up 2x. The concept sheets are the inspiration for the shapes and colours;
 * the sprites don't try to copy them.
 *
 * Texture keys per boss: boss-<style>-a (standing), -b (charging an attack), -w0..w7 (moving), -i0..i3 (idle breathing).
 */
export const TAU = Math.PI * 2;
export const OUT = '#150f1c';
export const BOSS_PIXEL = 2; // each drawn pixel is 2x2 on screen

export type Ctx = CanvasRenderingContext2D;
export interface Pose { phase: number; charge: boolean; moving: boolean; t: number; aim?: boolean; fire?: boolean; dive?: boolean }

// ---------------------------------------------------------------- colours
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- drawing kit (lit from the upper left, thin dark outline)
function path(c: Ctx, pts: number[]) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}
function bounds(pts: number[]) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
  return { x0, y0, x1, y1 };
}
/** a polygon with an outline, a light top edge and a dark underside */
export function poly(c: Ctx, pts: number[], fill: string) {
  path(c, pts);
  c.lineJoin = 'round';
  c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = fill; c.fill();
  const b = bounds(pts), h = b.y1 - b.y0, w = b.x1 - b.x0;
  c.save(); path(c, pts); c.clip();
  c.fillStyle = shade(fill, -0.34); c.fillRect(b.x0, b.y0 + h * 0.62, w, h);
  c.fillStyle = shade(fill, -0.2); c.fillRect(b.x0 + w * 0.72, b.y0, w, h);
  c.fillStyle = shade(fill, 0.38); c.fillRect(b.x0, b.y0, w, Math.max(1.2, h * 0.2));
  c.fillStyle = shade(fill, 0.22); c.fillRect(b.x0, b.y0, Math.max(1.2, w * 0.14), h);
  c.restore();
}
export function rect(c: Ctx, x: number, y: number, w: number, h: number, fill: string) {
  poly(c, [x, y, x + w, y, x + w, y + h, x, y + h], fill);
}
export function circ(c: Ctx, x: number, y: number, r: number, fill: string) {
  c.beginPath(); c.arc(x, y, r, 0, TAU);
  c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke();
  c.fillStyle = fill; c.fill();
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
  c.fillStyle = shade(fill, -0.32); c.beginPath(); c.arc(x + r * 0.45, y + r * 0.5, r * 1.05, 0, TAU); c.fill();
  c.fillStyle = fill; c.beginPath(); c.arc(x + r * 0.1, y + r * 0.1, r * 0.82, 0, TAU); c.fill();
  c.fillStyle = shade(fill, 0.5); c.beginPath(); c.arc(x - r * 0.36, y - r * 0.38, r * 0.36, 0, TAU); c.fill();
  c.restore();
}
/** a thick limb along a line or a bent line */
export function limb(c: Ctx, pts: number[], w: number, fill: string) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  const stroke = (lw: number, col: string, dx = 0, dy = 0) => {
    c.lineWidth = lw; c.strokeStyle = col; c.beginPath(); c.moveTo(pts[0] + dx, pts[1] + dy);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i] + dx, pts[i + 1] + dy);
    c.stroke();
  };
  stroke(w + 2.4, OUT);
  stroke(w, shade(fill, -0.3));
  stroke(w * 0.72, fill, -0.3, -0.3);
  stroke(Math.max(1, w * 0.26), shade(fill, 0.45), -w * 0.18, -w * 0.18);
}
/** a glowing lamp, brighter and haloed when charging */
export function lamp(c: Ctx, x: number, y: number, r: number, color: string, glow: boolean) {
  if (glow) { c.fillStyle = color + '55'; c.beginPath(); c.arc(x, y, r * 2.6, 0, TAU); c.fill(); }
  c.fillStyle = OUT; c.beginPath(); c.arc(x, y, r + 1.1, 0, TAU); c.fill();
  c.fillStyle = glow ? '#ffffff' : color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = glow ? color : shade(color, 0.6); c.beginPath(); c.arc(x - r * 0.3, y - r * 0.3, Math.max(0.6, r * 0.4), 0, TAU); c.fill();
}
/** two-bone leg: where the knee goes for a hip and a foot */
export function knee(hx: number, hy: number, fx: number, fy: number, l1: number, l2: number, bend: number): [number, number] {
  const dx = fx - hx, dy = fy - hy;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx);
  const ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const ang = a + bend * Math.acos(Math.max(-1, Math.min(1, ca)));
  return [hx + Math.cos(ang) * l1, hy + Math.sin(ang) * l1];
}
/** a foot on a stride: planted and sliding back, then lifted and swung forward (forward is to the left) */
export function stride(phase: number, len: number, lift: number): { x: number; y: number } {
  const t = (((phase / TAU) % 1) + 1) % 1;
  if (t < 0.5) { const u = t / 0.5; return { x: -len + 2 * len * u, y: 0 }; } // stance: front to back
  const u = (t - 0.5) / 0.5;
  return { x: len - 2 * len * u, y: -lift * Math.sin(u * Math.PI) };
}

/** a tiny deterministic hash so every frame of an enemy gets the same dirt */
export function h(x: number, y: number, k: number): number {
  let n = (x * 374761393 + y * 668265263 + k * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * The grit pass: every enemy is dulled and dirtied after it is drawn. Colours go darker and greyer, rust and soot speckle the plating,
 * grime pools toward the feet, rain-streak drips run down from the top, and a few bright scratches and dents break up the shading.
 * Glowing eyes and lamps are left alone so they still burn.
 */
export function grit(cv: HTMLCanvasElement, seed: number): HTMLCanvasElement {
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  const { width: w, height: ht } = cv;
  const img = c.getImageData(0, 0, w, ht), d = img.data;
  const at = (x: number, y: number) => (y * w + x) * 4;
  for (let y = 0; y < ht; y++) {
    for (let x = 0; x < w; x++) {
      const i = at(x, y);
      if (d[i + 3] === 0) continue;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      const glow = (r > 215 && g < 175 && b < 110) || lum > 238 || (b > 215 && r < 120);
      if (glow) continue;
      // dull it: less colour, less light
      const dull = 0.32;
      r = (r + (lum - r) * dull) * 0.84; g = (g + (lum - g) * dull) * 0.84; b = (b + (lum - b) * dull) * 0.84;
      const n = h(x, y, seed), low = y / ht;
      // grime pooling toward the ground
      const dirt = Math.max(0, low - 0.55) * 1.1 * (0.5 + n);
      r += (46 - r) * dirt; g += (36 - g) * dirt; b += (28 - b) * dirt;
      // streaks that drip down from the top, like rain on old metal
      const streak = h(x, 0, seed + 9) > 0.8 && h(x, Math.floor(y / 5), seed + 3) > 0.35;
      if (streak) { r *= 0.74; g *= 0.74; b *= 0.74; }
      // soot and rust speckle
      if (n < 0.1) { r *= 0.55; g *= 0.55; b *= 0.55; }
      else if (n > 0.945) { r = r * 0.45 + 150 * 0.55; g = g * 0.45 + 74 * 0.55; b = b * 0.45 + 30 * 0.55; }
      d[i] = Math.max(0, Math.min(255, r)); d[i + 1] = Math.max(0, Math.min(255, g)); d[i + 2] = Math.max(0, Math.min(255, b));
    }
  }
  // scratches: short pale diagonal nicks, only on solid plating
  for (let k = 0; k < Math.ceil((w * ht) / 90); k++) {
    const sx = Math.floor(h(k, 1, seed + 21) * (w - 4)), sy = Math.floor(h(k, 2, seed + 21) * (ht - 4));
    for (let j = 0; j < 3; j++) {
      const i = at(sx + j, sy + j);
      if (d[i + 3] === 255 && 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] < 215) { d[i] = Math.min(255, d[i] + 55); d[i + 1] = Math.min(255, d[i + 1] + 52); d[i + 2] = Math.min(255, d[i + 2] + 48); }
    }
  }
  // chipped edges: knock a few pixels off the outline so the silhouette looks battered
  for (let y = 1; y < ht - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = at(x, y);
    if (d[i + 3] === 255 && h(x, y, seed + 40) > 0.985 && (d[at(x - 1, y) + 3] === 0 || d[at(x, y - 1) + 3] === 0)) d[i + 3] = 0;
  }
  c.putImageData(img, 0, 0);
  return cv;
}


// ---------------------------------------------------------------- the shared look of the concept art
export const PAT = '#5f9a90', PATD = '#3b6a66', RUST = '#b8612c', RUSTD = '#7a3a1a', COP = '#c8803f', IRON = '#59616a', IROND = '#2f353c', BRS = '#d0a652', EYE = '#ff7a22';
/** a riveted armour plate with rust blotches */
export function plate(c: Ctx, pts: number[], base = PAT, seed = 1, amt = 3) {
  poly(c, pts, base);
  const b = bounds(pts);
  c.save(); path(c, pts); c.clip();
  for (let i = 0; i < amt; i++) {
    const x = b.x0 + h(i, seed, 5) * (b.x1 - b.x0), y = b.y0 + h(i, seed, 6) * (b.y1 - b.y0);
    c.fillStyle = h(i, seed, 7) > 0.35 ? RUST : RUSTD;
    c.fillRect(x, y, 1.5 + h(i, seed, 8) * 4, 1 + h(i, seed, 9) * 2.5);
  }
  c.restore();
}
export function rivets(c: Ctx, x: number, y: number, n: number, dx: number, dy = 0) {
  for (let i = 0; i < n; i++) { c.fillStyle = '#e0ece6'; c.fillRect(x + i * dx, y + i * dy, 1, 1); c.fillStyle = OUT; c.fillRect(x + i * dx + 1, y + i * dy + 1, 1, 1); }
}
export function spike(c: Ctx, x: number, y: number, dx: number, dy: number) {
  const nx = -dy, ny = dx, n = Math.hypot(nx, ny) || 1;
  poly(c, [x + (nx / n) * 2.2, y + (ny / n) * 2.2, x - (nx / n) * 2.2, y - (ny / n) * 2.2, x + dx, y + dy], '#9aa4aa');
}

// ---------------------------------------------------------------- the bosses
export type Draw = (c: Ctx, p: Pose) => void;
export interface Def { w: number; h: number; draw: Draw; hover?: boolean }

/** 1. Enforcer Nine: a bird-legged peacekeeper with a head turret and a cannon on each arm. */
const enforcer: Draw = (c, p) => {
  const STEEL = PAT, DARK = IRON, LIGHT = PATD, ORANGE = EYE, RED = EYE;
  const G = 94, bob = p.moving ? Math.abs(Math.sin(p.phase)) * 3 : Math.sin(p.t * 2.4) * 1;
  const hipX = 50, hipY = 58 + bob;
  // legs: reverse-knee bird legs with piston shins and claw feet
  for (const side of [1, 0]) {
    const ph = p.moving ? p.phase + side * Math.PI : 0;
    const f = p.moving ? stride(ph, 9, 8) : { x: side ? -4 : 5, y: 0 };
    const fx = hipX + (side ? 5 : -5) + f.x, fy = G + f.y;
    const [kx, ky] = knee(hipX + (side ? 3 : -3), hipY + 4, fx, fy - 4, 20, 20, -1); // bird legs: the knee points back
    const col = side ? DARK : STEEL;
    limb(c, [hipX + (side ? 3 : -3), hipY + 4, kx, ky], 7, col);
    limb(c, [kx, ky, fx, fy - 4], 5, shade(col, 0.1));
    circ(c, kx, ky, 4.5, COP);
    spike(c, kx + 3, ky, 7, -1);
    poly(c, [fx - 10, fy - 4, fx + 6, fy - 4, fx + 9, fy, fx - 12, fy], col);
    for (const tx of [-12, -7, -2]) poly(c, [fx + tx, fy - 1, fx + tx + 4, fy - 1, fx + tx + 2, fy + 2], LIGHT);
  }
  rect(c, hipX - 12, hipY - 2, 26, 11, DARK);
  // torso, shoulder armour, vents
  plate(c, [27, hipY - 34, 66, hipY - 38, 76, hipY - 14, 64, hipY + 2, 34, hipY + 2, 24, hipY - 14], STEEL, 3, 5);
  rivets(c, 30, hipY - 28, 4, 4, 1);
  for (let i = 0; i < 3; i++) rect(c, 40, hipY - 26 + i * 7, 22, 4, '#1a2434');
  lamp(c, 63, hipY - 26, 2.2, ORANGE, p.charge); lamp(c, 63, hipY - 19, 2.2, ORANGE, p.charge);
  plate(c, [56, hipY - 40, 80, hipY - 40, 86, hipY - 22, 58, hipY - 22], STEEL, 8, 4);
  rect(c, 62, hipY - 50, 4, 10, IROND); rect(c, 70, hipY - 49, 4, 9, IROND);
  // head turret with a red visor
  const nod = p.moving ? Math.sin(p.phase * 2) * 0.8 : 0;
  circ(c, 27, hipY - 46 + nod, 15, STEEL);
  poly(c, [13, hipY - 44 + nod, 41, hipY - 46 + nod, 42, hipY - 32 + nod, 14, hipY - 31 + nod], PATD);
  lamp(c, 19, hipY - 41 + nod, 2.2, EYE, p.charge); lamp(c, 27, hipY - 44 + nod, 3, EYE, true); lamp(c, 35, hipY - 41 + nod, 2.2, EYE, p.charge);
  rect(c, 19, hipY - 36 + nod, 16, 5, IROND); c.fillStyle = '#7d8a90'; for (let i = 0; i < 5; i++) c.fillRect(21 + i * 3, hipY - 35 + nod, 1, 3);
  rivets(c, 18, hipY - 52 + nod, 5, 4, -0.5);
  // the big arm cannons, pulled back while charging
  const kick = p.charge ? 3 : 0, sway = p.moving ? Math.sin(p.phase) * 1.5 : 0;
  circ(c, 34, hipY - 18, 6, DARK);
  rect(c, 8 + kick, hipY - 24 + sway, 30, 12, STEEL);
  rect(c, 1 + kick, hipY - 22 + sway, 14, 8, '#0f1722');
  if (p.charge) { c.fillStyle = '#ffd24a'; c.fillRect(-1 + kick, hipY - 20 + sway, 4, 4); c.fillStyle = '#ffffff99'; c.fillRect(-3 + kick, hipY - 21 + sway, 3, 6); }
  rect(c, 12 + kick, hipY - 8 + sway, 22, 7, DARK);
  rect(c, 2 + kick, hipY - 15 + sway, 20, 3, IROND);
  circ(c, 34 + kick, hipY - 6 + sway, 5, ORANGE); lamp(c, 34 + kick, hipY - 6 + sway, 2, ORANGE, true);
};

/** 2. Spindle Hollow: Grandfather Gloom, a crooked clockwork giant on striped stilts with a swinging pendulum. */
const gloom: Draw = (c, p) => {
  const WOOD = '#8a5a34', DARKW = '#3a2214', BRASS = COP, CREAM = '#e6d9b8', PURPLE = PAT;
  const G = 100, bob = p.moving ? Math.abs(Math.sin(p.phase)) * 2.5 : Math.sin(p.t * 2.4) * 1;
  const hipX = 38, hipY = 66 + bob;
  for (const side of [1, 0]) {
    const ph = p.moving ? p.phase + side * Math.PI : 0;
    const f = p.moving ? stride(ph, 8, 9) : { x: side ? -3 : 3, y: 0 };
    const fx = hipX + (side ? 6 : -6) + f.x, fy = G + f.y;
    const [kx, ky] = knee(hipX + (side ? 5 : -5), hipY + 6, fx, fy - 4, 17, 17, -1);
    limb(c, [hipX + (side ? 5 : -5), hipY + 6, kx, ky, fx, fy - 4], 5, side ? PATD : PURPLE);
    c.save(); c.strokeStyle = CREAM; c.lineWidth = 2; c.lineCap = 'butt';
    for (let i = 1; i < 5; i++) { const u = i / 5; c.beginPath(); c.moveTo(kx + (fx - kx) * u - 2.6, ky + (fy - 4 - ky) * u); c.lineTo(kx + (fx - kx) * u + 2.6, ky + (fy - 4 - ky) * u); c.stroke(); }
    c.restore();
    circ(c, kx, ky, 3.4, BRASS);
    poly(c, [fx - 8, fy - 5, fx + 7, fy - 5, fx + 9, fy, fx - 9, fy], DARKW);
  }
  // the clock case, its window and the swinging pendulum
  poly(c, [22, hipY - 40, 56, hipY - 44, 58, hipY + 8, 20, hipY + 8], WOOD);
  rect(c, 27, hipY - 30, 26, 30, '#1a0f08');
  const sw = p.charge ? 0.95 : p.moving ? Math.sin(p.phase) * 0.6 : Math.sin(p.t * 2.2) * 0.5;
  const px = 40 + Math.sin(sw) * 11, py = hipY - 28 + Math.cos(sw) * 22;
  limb(c, [40, hipY - 29, px, py], 1.6, BRASS);
  circ(c, px, py, 4.6, BRASS);
  rect(c, 19, hipY + 4, 42, 5, BRASS);
  // spires and glowing lanterns on the tower
  poly(c, [20, hipY - 42, 24, hipY - 66, 28, hipY - 42], IRON); poly(c, [52, hipY - 42, 56, hipY - 66, 60, hipY - 42], IRON);
  lamp(c, 22, hipY - 50, 2.4, EYE, true); lamp(c, 58, hipY - 50, 2.4, EYE, true);
  // the dial that is the head
  poly(c, [18, hipY - 40, 40, hipY - 60, 62, hipY - 44], WOOD);
  circ(c, 40, hipY - 48, 13, CREAM);
  const hand = p.t * 3;
  limb(c, [40, hipY - 48, 40 + Math.sin(hand) * 8, hipY - 48 - Math.cos(hand) * 8], 1.4, DARKW);
  limb(c, [40, hipY - 48, 40 + Math.sin(hand * 0.2) * 5, hipY - 48 - Math.cos(hand * 0.2) * 5], 1.8, DARKW);
  lamp(c, 35, hipY - 49, 2.3, EYE, true); lamp(c, 45, hipY - 49, 2.3, EYE, true);
  // the bell cannon on top, and the key on its back
  poly(c, [10, hipY - 62, 28, hipY - 66, 31, hipY - 52, 8, hipY - 52], BRASS);
  rect(c, 6, hipY - 54, 28, 4, DARKW);
  if (p.charge) { c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(9, hipY - 57, 5, 0, TAU); c.fill(); }
  limb(c, [58, hipY - 22, 68, hipY - 22], 3, BRASS);
  const key = p.t * 2.5; circ(c, 71, hipY - 22 + Math.sin(key) * 3, 4, BRASS);
  // gear arms
  for (const s of [0, 1]) {
    const ax = s ? 56 : 24, a = p.moving ? Math.sin(p.phase + s * Math.PI) * 5 : Math.sin(p.t * 2 + s) * 1.5;
    limb(c, [ax, hipY - 22, ax + (s ? 11 : -11), hipY - 8 + a, ax + (s ? 14 : -14), hipY + 8 + a], 3.4, DARKW);
    circ(c, ax + (s ? 14 : -14), hipY + 9 + a, 5.4, BRASS);
    c.fillStyle = OUT; c.fillRect(ax + (s ? 14 : -14) - 1, hipY + 8 + a, 2, 2);
  }
};

/** 3. Rust Wastes: the Dust Scorpion, four stepping legs, a sweeping tail with a cannon, and snapping claws. */
const scorpion: Draw = (c, p) => {
  const SAND = PAT, DARKS = PATD, PLATE = RUST, STEEL = IRON;
  const G = 66, bob = p.moving ? Math.abs(Math.sin(p.phase * 2)) * 1.2 : Math.sin(p.t * 2.4) * 0.8;
  const bx = 44, by = 38 + bob;
  // four jointed legs, walking in diagonal pairs
  [[-12, 0], [-4, Math.PI], [8, Math.PI], [16, 0]].forEach(([ox, off], i) => {
    const ph = p.moving ? p.phase + off : 0;
    const f = p.moving ? stride(ph, 5, 6) : { x: 0, y: 0 };
    const hx = bx + ox, hy = by + 8;
    const fx = hx + (ox < 0 ? -16 : 12) + f.x, fy = G + f.y;
    const [kx, ky] = knee(hx, hy, fx, fy, 14, 15, ox < 0 ? -1 : 1);
    limb(c, [hx, hy, kx, ky, fx, fy], 4.2, i % 2 ? DARKS : SAND);
    circ(c, kx, ky, 2.8, STEEL);
  });
  // the tail: five segments that sweep, ending in a cannon
  const sweep = p.charge ? -0.55 : Math.sin(p.t * 2) * 0.12 + (p.moving ? Math.sin(p.phase) * 0.08 : 0);
  let tx = bx + 14, ty = by - 2, ang = -0.35 + sweep;
  const segs: [number, number][] = [];
  for (let i = 0; i < 5; i++) { ang -= 0.34 - sweep * 0.35; tx += Math.cos(ang) * 9; ty += Math.sin(ang) * 9; segs.push([tx, ty]); }
  limb(c, [bx + 10, by, ...segs.flat()], 5.2, SAND);
  segs.forEach(([sx, sy], i) => circ(c, sx, sy, 3.6 - i * 0.2, i % 2 ? PLATE : SAND));
  const [hx2, hy2] = segs[4];
  poly(c, [hx2 - 4, hy2 - 5, hx2 + 5, hy2 - 3, hx2 + 5, hy2 + 5, hx2 - 3, hy2 + 5], DARKS);
  rect(c, hx2 - 13, hy2 - 3, 12, 4, '#2a1a10');
  lamp(c, hx2 + 1, hy2 + 1, 2, EYE, true);
  if (p.charge) { c.fillStyle = '#ffffffaa'; c.fillRect(hx2 - 16, hy2 - 3, 4, 5); }
  // carapace
  poly(c, [bx - 24, by - 2, bx - 10, by - 12, bx + 16, by - 10, bx + 22, by + 4, bx + 12, by + 14, bx - 18, by + 14], SAND);
  poly(c, [bx - 16, by - 2, bx - 4, by - 6, bx - 2, by + 6, bx - 14, by + 8], PLATE);
  poly(c, [bx + 2, by - 6, bx + 14, by - 4, bx + 14, by + 6, bx + 2, by + 8], PLATE);
  lamp(c, bx - 20, by + 1, 1.9, EYE, true); lamp(c, bx - 15, by - 2, 1.5, EYE, true);
  rivets(c, bx - 8, by - 9, 6, 4, 0.3);
  // claws that snap open and shut
  const snap = p.moving ? (Math.sin(p.phase * 2) + 1) * 0.5 : (Math.sin(p.t * 3) + 1) * 0.3;
  for (const [cy0, arm] of [[by + 4, 1], [by + 11, 0.8]] as const) {
    const ex = bx - 38 + (1 - arm) * 6, ey = cy0 + 2;
    limb(c, [bx - 20, cy0, ex, ey], 4, DARKS);
    poly(c, [ex - 4, ey - 6 - snap * 5, ex + 4, ey - 2, ex - 7, ey + 1], SAND);
    poly(c, [ex - 4, ey + 6 + snap * 5, ex + 4, ey + 2, ex - 7, ey - 1], shade(SAND, -0.1));
  }
};

/** 4. Drowned Metropolis: the Deep Diver, a barrel-bodied diving-suit mech with a glass dome and clanking claws. */
const diver: Draw = (c, p) => {
  const TEAL = PAT, DARKT = PATD, BRASS = COP, KELP = '#8a949a', GLASS = '#2a3438';
  const G = 94, bob = p.moving ? Math.abs(Math.sin(p.phase)) * 2.5 : Math.sin(p.t * 2.4) * 1;
  const hipX = 40, hipY = 62 + bob;
  for (const side of [1, 0]) {
    const ph = p.moving ? p.phase + side * Math.PI : 0;
    const f = p.moving ? stride(ph, 6, 6) : { x: side ? -2 : 3, y: 0 };
    const fx = hipX + (side ? 7 : -7) + f.x, fy = G + f.y;
    const [kx, ky] = knee(hipX + (side ? 6 : -6), hipY + 6, fx, fy - 6, 13, 14, -1);
    limb(c, [hipX + (side ? 6 : -6), hipY + 6, kx, ky, fx, fy - 6], 9, side ? DARKT : TEAL);
    rect(c, kx - 5, ky - 2, 10, 4, BRASS);
    poly(c, [fx - 9, fy - 7, fx + 8, fy - 7, fx + 11, fy, fx - 12, fy], BRASS);
  }
  // barrel hull, riveted
  circ(c, hipX, hipY - 12, 22, TEAL);
  c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.ellipse(hipX, hipY - 12, 14, 22, 0, 0, TAU); c.stroke();
  for (const [rx, ry] of [[-16, -22], [16, -22], [-20, -8], [20, -8], [-14, 2], [14, 2]]) { c.fillStyle = BRASS; c.fillRect(hipX + rx - 1, hipY + ry - 1, 3, 3); }
  rect(c, hipX - 11, hipY - 16, 22, 11, '#0e2e2c');
  lamp(c, hipX - 5, hipY - 10, 2.2, '#4affc0', p.charge); lamp(c, hipX + 5, hipY - 10, 2.2, '#4affc0', p.charge);
  // the glass dome with a pair of angry eyes inside
  const nod = p.moving ? Math.sin(p.phase * 2) * 0.8 : 0;
  circ(c, hipX, hipY - 40 + nod, 15, TEAL);
  plate(c, [hipX - 14, hipY - 46 + nod, hipX - 4, hipY - 54 + nod, hipX - 3, hipY - 36 + nod, hipX - 13, hipY - 30 + nod], TEAL, 5, 4);
  circ(c, hipX, hipY - 39 + nod, 8.5, BRASS); lamp(c, hipX, hipY - 39 + nod, 5, EYE, true);
  c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.moveTo(hipX - 5, hipY - 39 + nod); c.lineTo(hipX + 5, hipY - 39 + nod); c.moveTo(hipX, hipY - 44 + nod); c.lineTo(hipX, hipY - 34 + nod); c.stroke();
  rect(c, hipX - 9, hipY - 27 + nod, 18, 5, BRASS);
  limb(c, [hipX + 10, hipY - 52 + nod, hipX + 22, hipY - 62 + nod, hipX + 28, hipY - 44 + nod], 1.6, '#1a2a2a');
  rect(c, hipX - 6, hipY - 56 + nod, 12, 4, BRASS); lamp(c, hipX, hipY - 57 + nod, 2, '#fff0a8', true);
  // piston arms ending in claws that open and close
  const open = p.charge ? 1 : p.moving ? (Math.sin(p.phase * 2) + 1) * 0.5 : (Math.sin(p.t * 2.6) + 1) * 0.25;
  const swing = p.moving ? Math.sin(p.phase) * 4 : Math.sin(p.t * 2) * 1.5;
  for (const s of [0, 1]) {
    const sx = s ? hipX + 18 : hipX - 18, dir = s ? 1 : -1;
    const ex = sx + dir * 8, ey = hipY - 12 + (s ? swing : -swing);
    const hx = ex + dir * 6, hy = ey + 17;
    limb(c, [sx, hipY - 24, ex, ey, hx, hy], 6, BRASS);
    poly(c, [hx - 5 * dir, hy - 1, hx + 8 * dir, hy + 5 + open * 4, hx + 2 * dir, hy + 11], KELP);
    poly(c, [hx + 5 * dir, hy - 1, hx - 8 * dir, hy + 5 + open * 4, hx - 2 * dir, hy + 11], shade(KELP, -0.15));
  }
};

/** 5. Neon Void: the Neon Warden, a spinning-top gyro with a saucer deck, a drill point, spiked outriggers and a cannon and claw. */
const warden: Draw = (c, p) => {
  const bob = Math.sin(p.t * 3) * 2 + (p.moving ? Math.sin(p.phase * 2) * 1 : 0);
  const cx = 46, top = 20 + bob, G = 100;
  const spin = p.t * 9;
  // the drill tip with spinning grooves, sparks at the ground
  poly(c, [cx - 10, top + 54, cx + 10, top + 54, cx + 1, G - 2 + bob * 0.3, cx - 1, G - 2 + bob * 0.3], IRON);
  c.save(); c.strokeStyle = IROND; c.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) { const y = top + 58 + ((i * 9 + spin * 3) % 36); c.beginPath(); c.moveTo(cx - 8 + (y - top - 58) * 0.2, y); c.lineTo(cx + 8 - (y - top - 58) * 0.2, y + 3); c.stroke(); }
  c.restore();
  c.fillStyle = '#ffd24a'; for (let i = 0; i < 4; i++) c.fillRect(cx + (i - 1.5) * 5 + Math.sin(p.t * 30 + i) * 2, G - 4 + bob * 0.3 - (i % 2) * 3, 2, 2);
  // spiked outrigger wheels
  for (const s of [-1, 1]) {
    const wx = cx + s * 24, wy = top + 64 + Math.sin(p.t * 3 + s) * 1;
    limb(c, [cx + s * 10, top + 44, wx, wy - 6], 4, IRON);
    circ(c, wx, wy, 7, IRON);
    for (let k = 0; k < 8; k++) { const a = spin * s + (k * TAU) / 8; spike(c, wx + Math.cos(a) * 6, wy + Math.sin(a) * 6, Math.cos(a) * 4, Math.sin(a) * 4); }
    circ(c, wx, wy, 3, COP);
  }
  // the conical body with diagonal armour bands
  plate(c, [cx - 22, top + 22, cx + 22, top + 22, cx + 12, top + 58, cx - 12, top + 58], PAT, 12, 6);
  c.save(); c.strokeStyle = IROND; c.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(cx - 18 + i * 2.5, top + 28 + i * 8); c.lineTo(cx + 18 - i * 2.5, top + 34 + i * 8); c.stroke(); }
  c.restore();
  // the saucer deck with a rusty rim and a row of orange lights
  poly(c, [cx - 40, top + 22, cx - 30, top + 6, cx + 30, top + 6, cx + 40, top + 22, cx + 30, top + 28, cx - 30, top + 28], RUST);
  plate(c, [cx - 34, top + 10, cx - 24, top + 2, cx + 24, top + 2, cx + 34, top + 10, cx + 30, top + 18, cx - 30, top + 18], PAT, 15, 5);
  rivets(c, cx - 28, top + 14, 10, 6);
  for (let i = 0; i < 4; i++) lamp(c, cx - 15 + i * 10, top + 23, 2.2, EYE, p.charge || (Math.floor(p.t * 6) % 4 === i));
  // dome, gauges, smokestacks and the beacon antenna
  plate(c, [cx - 16, top + 2, cx - 10, top - 10, cx + 10, top - 10, cx + 16, top + 2], PATD, 18, 3);
  rect(c, cx - 26, top - 6, 5, 10, IRON); rect(c, cx - 19, top - 9, 5, 12, IRON);
  limb(c, [cx, top - 10, cx, top - 20], 2, IRON); c.strokeStyle = IRON; c.lineWidth = 1.2; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(cx - 4, top - 12 - i * 2); c.lineTo(cx + 4, top - 13 - i * 2); } c.stroke();
  lamp(c, cx, top - 22, 3, EYE, true);
  circ(c, cx + 22, top - 2, 4, IRON); lamp(c, cx + 22, top - 2, 2.2, '#ffe9b0', p.charge);
  // cannon arm with a long coiled barrel (extends when charging) and a claw arm
  const ext = p.charge ? 6 : Math.sin(p.t * 2.4) * 1.5;
  limb(c, [cx - 30, top + 30, cx - 40, top + 38], 7, IRON);
  rect(c, cx - 64 - ext, top + 32, 28, 11, PATD); rect(c, cx - 70 - ext, top + 34, 10, 7, IROND);
  circ(c, cx - 38, top + 38, 6, COP); lamp(c, cx - 38, top + 38, 2.2, EYE, true);
  if (p.charge) { c.fillStyle = '#ffd24a'; c.fillRect(cx - 74 - ext, top + 35, 4, 5); }
  const clawA = Math.sin(p.t * 2.2) * 3;
  limb(c, [cx + 30, top + 30, cx + 42, top + 40 + clawA, cx + 44, top + 50 + clawA], 7, IRON);
  poly(c, [cx + 40, top + 48 + clawA, cx + 50, top + 48 + clawA, cx + 50, top + 60 + clawA, cx + 46, top + 56 + clawA], '#9aa4aa');
  poly(c, [cx + 42, top + 62 + clawA, cx + 36, top + 50 + clawA, cx + 40, top + 50 + clawA], '#9aa4aa');
};

/** 6. Spore Garden: the Spore Mother, a mushroom-cap hull on a stepping tripod, with glowing pods. */
const mother: Draw = (c, p) => {
  const CAP = PAT, GILL = '#aab6b0', STEM = '#a8512a', GLOW = '#9bd68a';
  const G = 100, bob = p.moving ? Math.abs(Math.sin(p.phase * 1.5)) * 2 : Math.sin(p.t * 2.2) * 1;
  const hipX = 42, hipY = 62 + bob;
  // tripod legs that step in turn, with a centre post
  [[-9, 0], [9, (Math.PI * 4) / 3], [0, (Math.PI * 2) / 3]].forEach(([ox, off], i) => {
    const ph = p.moving ? p.phase + off : 0;
    const f = p.moving ? stride(ph, 6, 9) : { x: 0, y: 0 };
    const spread = ox === 0 ? 0 : ox < 0 ? -14 : 14;
    const fx = hipX + spread + f.x, fy = G + f.y;
    const [kx, ky] = knee(hipX + ox * 0.5, hipY + 8, fx, fy - 3, 18, 19, ox >= 0 ? -1 : 1);
    limb(c, [hipX + ox * 0.5, hipY + 8, kx, ky, fx, fy - 3], 6.4, i === 2 ? shade(STEM, -0.15) : STEM);
    circ(c, kx, ky, 3.6, '#8fbf9c');
    poly(c, [fx - 7, fy - 4, fx + 7, fy - 4, fx + 9, fy, fx - 9, fy], '#355a42');
  });
  rect(c, hipX - 9, hipY - 8, 18, 18, STEM);
  c.fillStyle = GLOW; for (const [dx, dy] of [[-3, -3], [3, 2], [-2, 5]]) c.fillRect(hipX + dx, hipY + dy, 2, 2);
  // the big cap, pulsing as it breathes (and flaring when charging)
  const puff = p.charge ? 3 : Math.sin(p.t * 2.2) * 1.2;
  poly(c, [hipX - 42, hipY - 8, hipX - 36, hipY - 30 - puff, hipX - 18, hipY - 46 - puff, hipX + 18, hipY - 46 - puff, hipX + 36, hipY - 30 - puff, hipX + 42, hipY - 8, hipX + 20, hipY - 2, hipX - 20, hipY - 2], CAP);
  c.fillStyle = GILL; c.fillRect(hipX - 30, hipY - 7, 60, 4);
  c.fillStyle = OUT; for (let x = -30; x < 30; x += 4) c.fillRect(hipX + x, hipY - 7, 1, 4);
  for (const [dx, dy, r] of [[-22, -26, 4], [-4, -36, 5], [16, -28, 3.6], [-12, -17, 3], [24, -16, 2.6]]) { circ(c, hipX + dx, hipY + dy - puff * 0.5, r, COP); lamp(c, hipX + dx, hipY + dy - puff * 0.5, r * 0.5, EYE, p.charge); }
  lamp(c, hipX - 7, hipY + 2, 2.4, EYE, true); lamp(c, hipX, hipY + 3, 2.9, EYE, true); lamp(c, hipX + 7, hipY + 2, 2.4, EYE, true);
  // pod launchers that sway, with spores drifting off
  for (const s of [0, 1]) {
    const dir = s ? 1 : -1, sw = Math.sin(p.t * 2 + s * 2) * 2;
    limb(c, [hipX + dir * 8, hipY + 6, hipX + dir * 26, hipY + 4 + sw, hipX + dir * 34, hipY + 14 + sw], 5, STEM);
    circ(c, hipX + dir * 36, hipY + 16 + sw, 6.4, GLOW);
    c.fillStyle = '#ffffffcc'; c.fillRect(hipX + dir * 36 - 2, hipY + 13 + sw, 2, 2);
  }
  for (let i = 0; i < 5; i++) {
    const u = ((p.t * 0.5 + i / 5) % 1);
    c.fillStyle = GLOW + (u > 0.7 ? '66' : 'cc');
    c.fillRect(hipX - 30 + i * 15 + Math.sin(u * 6 + i) * 3, hipY - 4 + u * 22, 2, 2);
  }
};

/** 7. Ember Trenches: the Iron Marshal, a siege tank with rolling tracks, a hull that rocks and a long gun that recoils. */
const tank: Draw = (c, p) => {
  const OLIVE = PAT, DARKO = PATD, STEEL = '#8a949a', RED = EYE;
  const G = 64, roll = p.moving ? Math.sin(p.phase * 2) * 0.8 : Math.sin(p.t * 6) * 0.35;
  const hy = 34 + roll;
  // tracks with links that roll, and big road wheels
  rect(c, 6, G - 22, 80, 22, DARKO);
  const off = (p.moving ? p.phase * 6 : p.t * 2) % 8;
  c.fillStyle = '#10150a'; for (let x = 10 - off; x < 84; x += 8) if (x > 7) c.fillRect(x, G - 21, 3, 5);
  for (const wx of [18, 33, 48, 63, 76]) { circ(c, wx, G - 10, 8, STEEL); c.fillStyle = OUT; c.beginPath(); c.arc(wx + Math.cos(p.t * 3 + wx) * 0, G - 10, 3, 0, TAU); c.fill(); }
  rect(c, 8, G - 28, 76, 8, OLIVE);
  // hull, with rust, a jerry can and a star
  poly(c, [10, G - 26, 18, hy - 2, 76, hy - 6, 86, G - 26], OLIVE);
  rect(c, 30, hy + 2, 32, 5, DARKO); for (let i = 0; i < 4; i++) { c.fillStyle = '#10150a'; c.fillRect(32 + i * 7, hy + 9, 4, 3); }
  rect(c, 66, hy + 4, 14, 12, RUST);
  circ(c, 24, hy + 12, 5, '#ece8d6'); c.fillStyle = RED; c.fillRect(23, hy + 10, 2, 5); c.fillRect(21, hy + 12, 6, 1.6);
  // turret, cupola and the long gun
  poly(c, [34, hy - 6, 42, hy - 26, 74, hy - 28, 82, hy - 8], STEEL);
  poly(c, [52, hy - 30, 54, hy - 44, 70, hy - 44, 72, hy - 30], STEEL);
  poly(c, [51, hy - 44, 56, hy - 50, 68, hy - 50, 73, hy - 44], DARKO); rect(c, 54, hy - 46, 16, 2, '#d0a652');
  lamp(c, 58, hy - 38, 1.8, EYE, true); lamp(c, 66, hy - 38, 1.8, EYE, true);
  rect(c, 46, hy - 22, 12, 16, OLIVE);
  const recoil = p.charge ? 4 : 0;
  rect(c, 2 + recoil, hy - 20, 46, 8, DARKO);
  rect(c, 14 + recoil, hy - 22, 9, 12, STEEL);
  rect(c, -1 + recoil, hy - 23, 13, 14, STEEL);
  c.fillStyle = '#0c0f08'; c.fillRect(-1 + recoil, hy - 20, 3, 8);
  if (p.charge) { c.fillStyle = '#ffb347'; c.beginPath(); c.arc(0 + recoil, hy - 16, 6, 0, TAU); c.fill(); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(1 + recoil, hy - 16, 3, 0, TAU); c.fill(); }
  lamp(c, 70, hy - 18, 2.3, RED, p.charge); lamp(c, 78, hy - 18, 2.3, RED, p.charge);
  rect(c, 76, hy - 40, 4, 14, IROND); rect(c, 82, hy - 38, 4, 12, IROND);
  { const fl = Math.sin(p.t * 22) * 1.5; c.fillStyle = '#ff9a2a'; c.beginPath(); c.moveTo(75, hy - 40); c.lineTo(78, hy - 47 - fl); c.lineTo(81, hy - 40); c.fill(); c.fillStyle = '#ffe27a'; c.beginPath(); c.moveTo(82, hy - 38); c.lineTo(84, hy - 44 - fl); c.lineTo(86, hy - 38); c.fill(); }
  // exhaust puffs
  for (let i = 0; i < 3; i++) { const u = (p.t * 1.2 + i / 3) % 1; c.fillStyle = `rgba(150,150,150,${0.5 * (1 - u)})`; c.beginPath(); c.arc(86 + u * 4, hy - 30 - u * 14, 2 + u * 3, 0, TAU); c.fill(); }
};

const DEFS: Record<LevelStyle, Def> = {
  city: { w: 92, h: 98, draw: enforcer },
  hollow: { w: 82, h: 104, draw: gloom },
  wastes: { w: 94, h: 70, draw: scorpion },
  drowned: { w: 84, h: 98, draw: diver },
  void: { w: 100, h: 106, draw: warden, hover: true },
  spores: { w: 92, h: 104, draw: mother },
  war: { w: 94, h: 68, draw: tank },
  plant: { w: 94, h: 68, draw: tank }, // fallback only: the Reclaimer is a Spine rig (reclaimer.ts)
  // levels 8 to 12: Spine rigs (boss-spine.ts); these are only the size of the hit box and a fallback picture
  ice: { w: 94, h: 68, draw: tank },
  dunes: { w: 94, h: 70, draw: scorpion },
  wind: { w: 84, h: 98, draw: diver },
  locks: { w: 84, h: 98, draw: diver },
  sky: { w: 100, h: 106, draw: warden, hover: true },
};

/** render one frame at the small grid and make its edges crisp */
export function frame(def: Def, pose: Pose): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = def.w; cv.height = def.h;
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.lineCap = 'round'; c.lineJoin = 'round';
  def.draw(c, pose);
  const img = c.getImageData(0, 0, def.w, def.h), d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 120 ? 255 : 0; // hard pixels: no anti-aliased fringe
  c.putImageData(img, 0, 0);
  return cv;
}

export function put(scene: Phaser.Scene, key: string, small: HTMLCanvasElement, flipX: boolean, scale = BOSS_PIXEL) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const w = small.width * scale, h = small.height * scale;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  if (flipX) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(small, 0, 0, w, h);
  tex.refresh();
}

/** Build every texture for a boss. Returns the number of walk frames. */
export function makeBossRigTextures(scene: Phaser.Scene, style: LevelStyle): void {
  const def = DEFS[style];
  const base = { phase: 0, charge: false, moving: false, t: 0 };
  const F = (pose: Pose) => grit(frame(def, pose), def.w * 3 + def.h);
  put(scene, `boss-${style}-a`, F({ ...base, t: 0.4 }), false);
  put(scene, `boss-${style}-b`, F({ ...base, charge: true, t: 0.9 }), false);
  for (let f = 0; f < 8; f++) put(scene, `boss-${style}-w${f}`, F({ phase: (f / 8) * TAU, charge: false, moving: true, t: f * 0.35 }), false);
  for (let f = 0; f < 4; f++) put(scene, `boss-${style}-i${f}`, F({ ...base, t: f * 0.9 }), false);
}
