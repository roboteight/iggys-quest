import type { ThemeName } from './music';

export type LevelStyle = 'city' | 'hollow';

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
  // PLANNED, not built yet (art in a new art-levels.ts + a music theme each): 'wastes' Rust Wastes, 'drowned' Drowned Metropolis,
  // 'void' Neon Void, 'spores' Spore Garden. See the project notes in Claude's memory for the design of each.
];

export const levelById = (id?: string | null): LevelDef => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
