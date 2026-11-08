import { effect, Injectable, signal } from '@angular/core';
import { LEVELS } from './game/levels';

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
  /** top scores per level id, best first */
  scores: Record<string, ScoreEntry[]>;
}

const KEY = 'iggys-quest.progress';
export const MAX_SCORES = 5;

function load(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { completed: Array.isArray(p.completed) ? p.completed : [], perfect: Array.isArray(p.perfect) ? p.perfect : [], scores: p.scores && typeof p.scores === 'object' ? p.scores : {} };
  } catch {
    return { completed: [], perfect: [], scores: {} };
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

  cleared(levelId: string): boolean {
    return this.progress().completed.includes(levelId);
  }

  perfected(levelId: string): boolean {
    return this.progress().perfect.includes(levelId);
  }

  best(levelId: string): number {
    return this.progress().scores[levelId]?.[0]?.score ?? 0;
  }

  /** Records a finished run. Returns the 1-based place on that level's board, or null if it did not make the top five. */
  record(levelId: string, name: string, score: number, cleared: boolean, perfect = false): number | null {
    let rank: number | null = null;
    this.progress.update((p) => {
      const completed = cleared && !p.completed.includes(levelId) ? [...p.completed, levelId] : p.completed;
      const perfects = perfect && !p.perfect.includes(levelId) ? [...p.perfect, levelId] : p.perfect;
      const list = [...(p.scores[levelId] ?? [])];
      const entry: ScoreEntry = { name: name.trim() || 'Iggy', score, cleared, date: new Date().toISOString().slice(0, 10) };
      if (score > 0) {
        const at = list.findIndex((e) => score > e.score);
        const idx = at === -1 ? list.length : at;
        if (idx < MAX_SCORES) {
          list.splice(idx, 0, entry);
          list.length = Math.min(list.length, MAX_SCORES);
          rank = idx + 1;
        }
      }
      return { completed, perfect: perfects, scores: { ...p.scores, [levelId]: list } };
    });
    return rank;
  }

  reset() {
    this.progress.set({ completed: [], perfect: [], scores: {} });
  }
}
