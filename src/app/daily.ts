import { LEVELS } from './game/levels';

/** Today's date as YYYY-MM-DD in the player's own time zone. */
export function todayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Small string hash (FNV-1a) so every player gets the same number for the same text. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The daily challenge rotates through the levels, one a day. */
export function dailyLevel(key = todayKey()) {
  return LEVELS[hash('level:' + key) % LEVELS.length];
}

export function dailySeed(levelId: string, key = todayKey()): number {
  return hash(`iggy:${key}:${levelId}`) || 1;
}

/** Seeded random numbers (mulberry32): the same seed always gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Key of the daily scoreboard. */
export const dailyBoard = (key = todayKey()) => `daily:${key}`;
