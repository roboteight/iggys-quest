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

/** Score needed to finish a level (placeholder rule: we will revisit this later). */
export const LEVEL_GOAL = 5000;

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
