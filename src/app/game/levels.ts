import type { ThemeName } from './music';

export type LevelStyle = 'city' | 'hollow' | 'wastes' | 'drowned' | 'void' | 'spores';

/** One entry per level. The scene, art and music all read from here. */
export interface LevelDef {
  id: string;
  number: number;
  name: string;
  blurb: string;
  style: LevelStyle;
  music: ThemeName;
  /** how the falling rain / flakes / spores layer scrolls (pixels per second) */
  precip: { vx: number; vy: number };
  lightning: boolean;
  bg: string;
}

/** Score at which the level's boss arena appears. Defeating the boss finishes the level. */
export const BOSS_SCORE = 4000;

export type BossAttack = 'volley' | 'spread' | 'mortar' | 'stomp';
export interface BossDef {
  name: string;
  blurb: string;
  hp: number;
  /** walking speed in px/s (0 = hovers in place) */
  speed: number;
  attacks: BossAttack[];
  /** where shots leave the mech, relative to the middle of its feet (facing left) */
  muzzle: [number, number];
}

export const BOSSES: Record<LevelStyle, BossDef> = {
  city: { name: 'Enforcer Nine', blurb: 'A hunched, bird-legged peacekeeper with cannons for arms.', hp: 24, speed: 50, attacks: ['volley', 'volley', 'stomp'], muzzle: [-80, -92] },
  hollow: { name: 'Jack-in-the-Boxer', blurb: 'A crooked jester on a spring that lobs exploding gifts.', hp: 26, speed: 40, attacks: ['mortar', 'mortar', 'stomp'], muzzle: [-10, -150] },
  wastes: { name: 'Dune Scorpion', blurb: 'A four-legged walker with a cannon on its tail.', hp: 28, speed: 60, attacks: ['spread', 'volley', 'stomp'], muzzle: [40, -150] },
  drowned: { name: 'Deep Diver', blurb: 'A diving-suit mech with a glass dome and heavy claws.', hp: 30, speed: 35, attacks: ['volley', 'mortar', 'stomp'], muzzle: [-60, -60] },
  void: { name: 'Neon Warden', blurb: 'A hovering sentinel on a ring of light.', hp: 30, speed: 70, attacks: ['spread', 'volley', 'spread', 'stomp'], muzzle: [-70, -88] },
  spores: { name: 'Spore Mother', blurb: 'A tripod walker under a giant mushroom cap.', hp: 34, speed: 30, attacks: ['mortar', 'spread', 'stomp'], muzzle: [-70, -45] },
};

export const LEVELS: LevelDef[] = [
  {
    id: 'rooftops', number: 1, name: 'Rain-soaked Rooftops',
    blurb: 'A stormy night skyline of spires and lit windows.',
    style: 'city', music: 'city', precip: { vx: 130, vy: -520 }, lightning: true, bg: '#05070d',
  },
  {
    id: 'hollow', number: 2, name: 'Spindle Hollow',
    blurb: 'Crooked striped houses, twisted trees and a swirly moon.',
    style: 'hollow', music: 'hollow', precip: { vx: 14, vy: -70 }, lightning: false, bg: '#0a0a1a',
  },
  {
    id: 'wastes', number: 3, name: 'Rust Wastes',
    blurb: 'A dust-choked desert of skeleton towers and a broken highway.',
    style: 'wastes', music: 'wastes', precip: { vx: 320, vy: -20 }, lightning: false, bg: '#2b1210',
  },
  {
    id: 'drowned', number: 4, name: 'Drowned Metropolis',
    blurb: 'Half-sunken towers, hanging vines and drifting green spores.',
    style: 'drowned', music: 'drowned', precip: { vx: 6, vy: 40 }, lightning: false, bg: '#06191c',
  },
  {
    id: 'void', number: 5, name: 'Neon Void',
    blurb: 'Floating islands, a ringed planet and a neon grid horizon.',
    style: 'void', music: 'void', precip: { vx: 10, vy: 60 }, lightning: false, bg: '#0a0224',
  },
  {
    id: 'spores', number: 6, name: 'Spore Garden',
    blurb: 'Giant glowing mushrooms under twin moons and an aurora.',
    style: 'spores', music: 'spores', precip: { vx: 8, vy: 36 }, lightning: false, bg: '#020c14',
  },
];

export const levelById = (id?: string | null): LevelDef => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
