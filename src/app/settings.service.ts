import { effect, Injectable, signal } from '@angular/core';

export interface Settings {
  volume: number; // sound effects, 0–100
  musicVolume: number; // background music, 0–100
  musicOn: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

const KEY = 'iggys-quest.settings';
const OLD_KEY = 'side-scroller.settings'; // project's old name: still read once so saved settings carry over

function load(): Settings {
  const defaults: Settings = {
    volume: 80,
    musicVolume: 40,
    musicOn: true,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: more)').matches,
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<Settings>(load());

  constructor() {
    effect(() => {
      const s = this.settings();
      document.documentElement.dataset['contrast'] = s.highContrast ? 'high' : 'normal';
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        /* storage unavailable: settings last for this visit only */
      }
    });
  }

  update(patch: Partial<Settings>) {
    this.settings.update((s) => ({ ...s, ...patch }));
  }
}
