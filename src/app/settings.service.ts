import { effect, Injectable, signal } from '@angular/core';

export type Action = 'left' | 'right' | 'jump' | 'duck' | 'fire';
export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'left', label: 'Move left' },
  { id: 'right', label: 'Move right' },
  { id: 'jump', label: 'Jump' },
  { id: 'duck', label: 'Duck' },
  { id: 'fire', label: 'Shoot' },
];
/** KeyboardEvent.code values, so bindings follow the key's position on any keyboard layout. */
export const DEFAULT_KEYS: Record<Action, string[]> = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'ArrowUp', 'KeyW'],
  duck: ['ArrowDown', 'KeyS'],
  fire: ['KeyX', 'KeyF'],
};
/** Keys that keep their job: Esc pauses, Tab and Enter move around and press buttons. */
export const RESERVED_KEYS = ['Escape', 'Tab', 'Enter', 'NumpadEnter', 'ContextMenu', 'MetaLeft', 'MetaRight'];

const KEY_NAMES: Record<string, string> = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Space', Backspace: 'Backspace', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift',
  ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', AltRight: 'Right Alt', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
  Semicolon: ';', Quote: "'", Backslash: '\\', Comma: ',', Period: '.', Slash: '/', CapsLock: 'Caps Lock',
};
/** Readable name for a key code, e.g. KeyA → A, ArrowUp → ↑. */
export function keyLabel(code: string): string {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return 'Numpad ' + code.slice(6);
  return code;
}
/** Plain-words key name for screen readers (arrows spelled out). */
export function keySpoken(code: string): string {
  return ({ ArrowLeft: 'Left arrow', ArrowRight: 'Right arrow', ArrowUp: 'Up arrow', ArrowDown: 'Down arrow' } as Record<string, string>)[code] ?? keyLabel(code);
}

export interface Settings {
  volume: number; // sound effects, 0–100
  musicVolume: number; // background music, 0–100
  musicOn: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  /** name shown on the high-score table */
  playerName: string;
  /** which keys do what (KeyboardEvent.code values) */
  keys: Record<Action, string[]>;
  /** show story cards before each level and after each boss */
  storyCards: boolean;
  /** assist: lives at the start and after a checkpoint top-up */
  startLives: number;
  /** assist: how fast enemies and bosses move and attack, in percent */
  enemySpeed: number;
  /** assist: stay protected for longer after a hit */
  longGrace: boolean;
  /** art test: draw Iggy with the new Spine rig of the concept art (moves it doesn't have yet use the old drawing) */
  spineIggy: boolean;
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
    playerName: 'Iggy',
    keys: cloneKeys(DEFAULT_KEYS),
    storyCards: true,
    startLives: 3,
    enemySpeed: 100,
    longGrace: false,
    spineIggy: true,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY) ?? '{}');
    const keys = cloneKeys(DEFAULT_KEYS);
    for (const a of ACTIONS) {
      const k = saved.keys?.[a.id];
      if (Array.isArray(k) && k.length > 0 && k.every((c: unknown) => typeof c === 'string' && !RESERVED_KEYS.includes(c))) keys[a.id] = k;
    }
    return { ...defaults, ...saved, keys };
  } catch {
    return defaults;
  }
}

function cloneKeys(k: Record<Action, string[]>): Record<Action, string[]> {
  return { left: [...k.left], right: [...k.right], jump: [...k.jump], duck: [...k.duck], fire: [...k.fire] };
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

  /** true while the options screen is waiting for a key press (Esc then cancels the capture instead of pausing) */
  readonly capturing = signal(false);

  /**
   * Gives `code` to `action`. A key can only do one thing, so it is taken from whichever action had it.
   * `blockedBy` is set (and nothing changes) when that would leave the other action with no key at all.
   */
  bindKey(action: Action, code: string): { from?: Action; blockedBy?: Action } {
    const keys = cloneKeys(this.settings().keys);
    let from: Action | undefined;
    for (const a of ACTIONS) {
      if (a.id !== action && keys[a.id].includes(code)) {
        if (keys[a.id].length === 1) return { blockedBy: a.id };
        keys[a.id] = keys[a.id].filter((c) => c !== code);
        from = a.id;
      }
    }
    if (!keys[action].includes(code)) keys[action].push(code);
    this.update({ keys });
    return { from };
  }

  unbindKey(action: Action, code: string) {
    const keys = cloneKeys(this.settings().keys);
    if (keys[action].length <= 1) return; // every action keeps at least one key
    keys[action] = keys[action].filter((c) => c !== code);
    this.update({ keys });
  }

  resetKeys() {
    this.update({ keys: cloneKeys(DEFAULT_KEYS) });
  }

  update(patch: Partial<Settings>) {
    this.settings.update((s) => ({ ...s, ...patch }));
  }
}
