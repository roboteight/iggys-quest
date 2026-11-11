import { effect, Injectable, signal } from '@angular/core';
import { LEVELS } from './game/levels';
import { ACHIEVEMENTS, Achievement } from './achievements';

export interface ScoreEntry {
  name: string;
  score: number;
  /** true when the run ended by beating the boss */
  cleared: boolean;
  date: string; // ISO date
}

export interface Progress {
  /** ids of levels whose boss has been beaten */
  completed: string[];
  /** ids of levels cleared with every breadboard collected */
  perfect: string[];
  /** ids of levels whose golden breadboard has been found */
  secrets: string[];
  /** ids of achievements earned */
  achievements: string[];
  /** top scores per level id, best first */
  scores: Record<string, ScoreEntry[]>;
  /** story mode: the most rings Iggy has finished each level with, so his suit carries on into the next level */
  suits: Record<string, number>;
}

const KEY = 'iggys-quest.progress';
export const MAX_SCORES = 5;

function load(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { completed: Array.isArray(p.completed) ? p.completed : [], perfect: Array.isArray(p.perfect) ? p.perfect : [], secrets: Array.isArray(p.secrets) ? p.secrets : [], achievements: Array.isArray(p.achievements) ? p.achievements : [], scores: p.scores && typeof p.scores === 'object' ? p.scores : {}, suits: p.suits && typeof p.suits === 'object' ? p.suits : {} };
  } catch {
    return { completed: [], perfect: [], secrets: [], achievements: [], scores: {}, suits: {} };
  }
}

/** Saved progress (which levels are cleared) and the high-score table. Lives in localStorage; fine to lose it. */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  readonly progress = signal<Progress>(load());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.progress()));
      } catch {
        /* storage unavailable: progress lasts for this visit only */
      }
    });
  }

  /** Level 1 is always open; every other level opens when the one before it has been cleared. */
  unlocked(levelId: string): boolean {
    const i = LEVELS.findIndex((l) => l.id === levelId);
    return i <= 0 || this.progress().completed.includes(LEVELS[i - 1].id);
  }

  /** Story mode: the rings Iggy starts a level with, the most he has finished the level before it with (none for level 1). */
  startRings(levelId: string): number {
    const i = LEVELS.findIndex((l) => l.id === levelId);
    const prev = i > 0 ? LEVELS[i - 1].id : null;
    const n = prev ? this.progress().suits[prev] : 0;
    return typeof n === 'number' && n > 0 ? Math.floor(n) : 0;
  }

  /** Story mode: remember the rings he finished a level with (keeping his best), for the start of the next level. */
  keepSuit(levelId: string, rings: number) {
    if (rings > (this.progress().suits[levelId] ?? 0)) this.progress.update((p) => ({ ...p, suits: { ...p.suits, [levelId]: rings } }));
  }

  cleared(levelId: string): boolean {
    return this.progress().completed.includes(levelId);
  }

  secretFound(levelId: string): boolean {
    return this.progress().secrets.includes(levelId);
  }

  findSecret(levelId: string) {
    if (!this.secretFound(levelId)) this.progress.update((p) => ({ ...p, secrets: [...p.secrets, levelId] }));
  }

  hasAchievement(id: string): boolean {
    return this.progress().achievements.includes(id);
  }

  /** Earns achievements (ignoring ones already held). Returns the ones that are new, as names ready to show. */
  award(...ids: string[]): Achievement[] {
    const fresh = ids.filter((id, i) => ids.indexOf(id) === i && !this.hasAchievement(id));
    if (fresh.length === 0) return [];
    this.progress.update((p) => ({ ...p, achievements: [...p.achievements, ...fresh] }));
    return ACHIEVEMENTS.filter((a) => fresh.includes(a.id));
  }

  /** Achievements that follow from the saved progress itself (cleared levels, perfects, secrets). */
  milestones(): Achievement[] {
    const p = this.progress(), n = LEVELS.length;
    const ids: string[] = [];
    if (p.completed.length >= 1) ids.push('first-boss');
    if (p.completed.length >= n) ids.push('all-bosses');
    if (p.perfect.length >= 1) ids.push('perfect-1');
    if (p.perfect.length >= n) ids.push('perfect-all');
    if (p.secrets.length >= 1) ids.push('secret-1');
    if (p.secrets.length >= n) ids.push('secret-all');
    return this.award(...ids);
  }

  perfected(levelId: string): boolean {
    return this.progress().perfect.includes(levelId);
  }

  /** best score on a board (for time boards: the fastest time in ms, 0 if none) */
  best(levelId: string): number {
    return this.progress().scores[levelId]?.[0]?.score ?? 0;
  }

  /** Records a finished run. Returns the 1-based place on that level's board, or null if it did not make the top five. */
  record(levelId: string, name: string, score: number, cleared: boolean, perfect = false, board = levelId): number | null {
    let rank: number | null = null;
    this.progress.update((p) => {
      const own = board === levelId; // the daily challenge has its own board and doesn't unlock or star levels
      const completed = own && cleared && !p.completed.includes(levelId) ? [...p.completed, levelId] : p.completed;
      const perfects = own && perfect && !p.perfect.includes(levelId) ? [...p.perfect, levelId] : p.perfect;
      const list = [...(p.scores[board] ?? [])];
      const entry: ScoreEntry = { name: name.trim() || 'Iggy', score, cleared, date: new Date().toISOString().slice(0, 10) };
      if (score > 0) {
        const asc = board.startsWith('time:'); // times: lower is better
        const at = list.findIndex((e) => (asc ? score < e.score : score > e.score));
        const idx = at === -1 ? list.length : at;
        if (idx < MAX_SCORES) {
          list.splice(idx, 0, entry);
          list.length = Math.min(list.length, MAX_SCORES);
          rank = idx + 1;
        }
      }
      const scores = { ...p.scores, [board]: list };
      // keep only the last week of daily boards
      const days = Object.keys(scores).filter((k) => k.startsWith('daily:')).sort().reverse();
      for (const k of days.slice(7)) delete scores[k];
      return { ...p, completed, perfect: perfects, scores };
    });
    return rank;
  }

  reset() {
    this.progress.set({ completed: [], perfect: [], secrets: [], achievements: [], scores: {}, suits: {} });
  }
}
