/**
 * 8-bit background music, synthesised live with WebAudio (no audio files).
 * Each level has its own theme:
 *  - city:   driving A-minor chiptune, 150 BPM, 4/4
 *  - hollow: creepy music-box waltz in D minor, 3/4
 *  - wastes: gritty E-phrygian square lead, 118 BPM
 *  - drowned: dreamy C-minor sine lead, 88 BPM
 *  - void: F-minor synthwave, 128 BPM
 *  - spores: marimba-like triangle lead in C/D/Em, 100 BPM
 */

const NAMES: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midi = (name: string) => {
  const m = /^([A-G]#?)(\d)$/.exec(name)!;
  return 12 * (Number(m[2]) + 1) + NAMES[m[1]];
};
const freq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const parse = (bars: string[]) => bars.map((s) => s.trim().split(/\s+/));

interface Theme {
  bpm: number; // quarter notes per minute; one step is a sixteenth note
  steps: number; // sixteenth-note steps per bar
  chords: { root: number; arp: number[] }[];
  progression: number[];
  /** one array of `steps` tokens per bar. "." = rest, "_" = hold, otherwise a note name */
  lead: string[][];
  leadWave: OscillatorType;
  leadGain: number;
  /** lead note length as a multiple of its steps (default 0.92, or 1.6 for sine) */
  leadLen?: number;
  kickGain?: number;
  bassLen?: number;
  /** arpeggio index per step, or null for none */
  arp: number[] | null;
  /** chord stabs (all arp notes at once) on these steps, or null */
  stabs: number[] | null;
  /** semitone offset for a bass note on this step, or null for silence */
  bass: (s: number) => number | null;
  kick: (s: number, bar: number) => boolean;
  snare: (s: number) => boolean;
  hat: (s: number) => number; // gain, 0 = none
}

export type ThemeName = 'city' | 'hollow' | 'wastes' | 'drowned' | 'void' | 'spores';

const THEMES: Record<ThemeName, Theme> = {
  city: {
    bpm: 150,
    steps: 16,
    chords: [
      { root: 45, arp: [69, 72, 76] }, // Am
      { root: 41, arp: [65, 69, 72] }, // F
      { root: 38, arp: [62, 65, 69] }, // Dm
      { root: 40, arp: [64, 68, 71] }, // E
    ],
    progression: [0, 1, 2, 3, 0, 1, 2, 3],
    lead: parse([
      'E5 _ _ _ A5 _ C6 _ B5 _ A5 _ G5 _ E5 _',
      'F5 _ _ _ A5 _ C6 _ A5 _ F5 _ _ _ . .',
      'D5 _ F5 _ A5 _ _ _ G5 _ F5 _ D5 _ . .',
      'E5 _ G#5 _ B5 _ _ _ B5 _ G#5 _ E5 _ _ _',
      'A5 _ _ A5 C6 _ B5 _ A5 _ E5 _ A5 _ _ _',
      'C6 _ _ A5 F5 _ A5 _ C6 _ _ _ A5 _ F5 _',
      'D6 _ C6 _ A5 _ F5 _ A5 _ C6 _ D6 _ _ _',
      'B5 _ G#5 _ E5 _ G#5 _ B5 _ _ _ . . . .',
    ]),
    leadWave: 'square',
    leadGain: 0.2,
    arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2],
    stabs: null,
    bass: (s) => (s % 2 === 0 ? (s % 8 === 6 ? 12 : 0) : null),
    kick: (s, bar) => s % 8 === 0 || (bar % 2 === 1 && s === 10),
    snare: (s) => s === 4 || s === 12,
    hat: (s) => (s % 2 === 0 ? (s % 4 === 2 ? 0.1 : 0.06) : 0),
  },
  hollow: {
    bpm: 104,
    steps: 12,
    chords: [
      { root: 38, arp: [62, 65, 69] }, // Dm
      { root: 34, arp: [58, 62, 65] }, // Bb
      { root: 43, arp: [62, 67, 70] }, // Gm
      { root: 45, arp: [61, 64, 69] }, // A
    ],
    progression: [0, 0, 1, 3, 0, 2, 3, 3],
    lead: parse([
      'D5 _ _ F5 _ _ A5 _ _ F5 _ _',
      'E5 _ _ D5 _ _ C#5 _ _ D5 _ _',
      'D5 _ _ F5 _ _ A#5 _ _ A5 _ _',
      'C#5 _ _ E5 _ _ A5 _ _ G5 _ _',
      'F5 _ _ A5 _ _ D6 _ _ A5 _ _',
      'G5 _ _ A#5 _ _ D6 _ _ A#5 _ _',
      'A5 _ _ G5 _ _ F5 _ _ E5 _ _',
      'C#5 _ _ E5 _ _ A5 _ _ . . .',
    ]),
    leadWave: 'sine', // music-box tone
    leadGain: 0.34,
    arp: null,
    stabs: [4, 8],
    bass: (s) => (s === 0 ? 0 : null),
    kick: (s) => s === 0,
    snare: () => false,
    hat: (s) => (s === 4 || s === 8 ? 0.05 : 0),
  },
  wastes: {
    bpm: 118,
    steps: 16,
    chords: [
      { root: 40, arp: [64, 67, 71] }, // Em
      { root: 41, arp: [65, 69, 72] }, // F
      { root: 38, arp: [62, 65, 69] }, // Dm
      { root: 43, arp: [67, 71, 74] }, // G
    ],
    progression: [0, 0, 1, 0, 0, 2, 1, 3],
    lead: parse([
      'E5 _ _ _ . . F5 _ E5 _ _ _ B4 _ . .',
      'E5 _ G5 _ B5 _ _ _ A5 _ G5 _ E5 _ . .',
      'F5 _ _ _ . . A5 _ F5 _ _ _ C5 _ . .',
      'E5 _ _ F5 E5 _ B4 _ E5 _ _ _ . . . .',
      'B5 _ _ _ A5 _ G5 _ E5 _ _ G5 A5 _ _ _',
      'F5 _ A5 _ C6 _ _ _ A5 _ F5 _ D5 _ . .',
      'C6 _ _ A5 F5 _ _ _ A5 _ _ F5 C5 _ . .',
      'D5 _ G5 _ B5 _ _ _ A5 _ F5 _ D5 _ E5 _',
    ]),
    leadWave: 'square',
    leadGain: 0.17,
    arp: null,
    stabs: [6, 14],
    bass: (s) => (s % 4 === 0 ? 0 : s % 8 === 6 ? 1 : null),
    kick: (s) => s % 4 === 0,
    snare: (s) => s === 4 || s === 12,
    hat: (s) => (s % 4 === 2 ? 0.09 : s % 2 === 1 ? 0.03 : 0),
    bassLen: 2.2,
  },
  drowned: {
    bpm: 88,
    steps: 16,
    chords: [
      { root: 36, arp: [60, 63, 67] }, // Cm
      { root: 32, arp: [56, 60, 63] }, // Ab
      { root: 39, arp: [58, 63, 67] }, // Eb
      { root: 34, arp: [58, 62, 65] }, // Bb
    ],
    progression: [0, 1, 2, 3, 0, 1, 3, 2],
    lead: parse([
      'G5 _ _ _ _ _ _ _ D#5 _ _ _ F5 _ _ _',
      'C5 _ _ _ _ _ D#5 _ _ _ _ _ G5 _ _ _',
      'A#5 _ _ _ _ _ G5 _ _ _ _ _ D#5 _ _ _',
      'D5 _ _ _ F5 _ _ _ A#5 _ _ _ _ _ _ _',
      'G5 _ _ _ A#5 _ _ _ C6 _ _ _ A#5 _ _ _',
      'G#5 _ _ _ _ _ G5 _ _ _ D#5 _ _ _ _ _',
      'F5 _ _ _ D5 _ _ _ A#4 _ _ _ D5 _ F5 _',
      'D#5 _ _ _ _ _ _ _ G5 _ _ _ . . . .',
    ]),
    leadWave: 'sine',
    leadGain: 0.3,
    arp: null,
    stabs: [0, 8],
    bass: (s) => (s === 0 || s === 10 ? 0 : null),
    kick: (s) => s === 0 || s === 10,
    snare: () => false,
    hat: (s) => (s === 4 || s === 12 ? 0.03 : 0),
    kickGain: 0.28,
    bassLen: 3.6,
  },
  void: {
    bpm: 128,
    steps: 16,
    chords: [
      { root: 41, arp: [65, 68, 72] }, // Fm
      { root: 37, arp: [61, 65, 68] }, // Db
      { root: 44, arp: [68, 72, 75] }, // Ab
      { root: 39, arp: [63, 67, 70] }, // Eb
    ],
    progression: [0, 1, 2, 3, 0, 1, 2, 3],
    lead: parse([
      'C6 _ _ _ . . G#5 _ C6 _ _ _ D#6 _ . .',
      'C#6 _ _ _ . . G#5 _ F5 _ _ _ . . . .',
      'C6 _ _ _ . . D#6 _ G6 _ _ _ D#6 _ . .',
      'D#6 _ _ _ A#5 _ _ _ G5 _ _ _ . . . .',
      'F6 _ _ _ D#6 _ C6 _ G#5 _ _ _ C6 _ . .',
      'C#6 _ _ _ G#5 _ F5 _ G#5 _ C#6 _ F6 _ _ _',
      'G6 _ _ _ D#6 _ C6 _ G5 _ C6 _ D#6 _ _ _',
      'D#6 _ C6 _ A#5 _ G5 _ A#5 _ D#6 _ . . . .',
    ]),
    leadWave: 'sawtooth',
    leadGain: 0.09,
    arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1],
    stabs: null,
    bass: (s) => (s % 4 === 2 ? 12 : s % 2 === 0 ? 0 : null),
    kick: (s) => s % 4 === 0,
    snare: (s) => s === 4 || s === 12,
    hat: (s) => (s % 2 === 1 ? 0.07 : 0.03),
    bassLen: 1.3,
  },
  spores: {
    bpm: 100,
    steps: 16,
    chords: [
      { root: 36, arp: [60, 64, 67] }, // C
      { root: 38, arp: [62, 66, 69] }, // D
      { root: 40, arp: [64, 67, 71] }, // Em
      { root: 43, arp: [62, 67, 71] }, // G
    ],
    progression: [0, 1, 2, 3, 0, 1, 2, 1],
    lead: parse([
      'E5 _ G5 _ C6 _ G5 _ E5 _ G5 _ C6 _ _ _',
      'F#5 _ A5 _ D6 _ A5 _ F#5 _ A5 _ D6 _ _ _',
      'G5 _ B5 _ E6 _ B5 _ G5 _ B5 _ E6 _ _ _',
      'D6 _ B5 _ G5 _ B5 _ D6 _ _ _ . . . .',
      'C6 _ E6 _ G6 _ E6 _ C6 _ E6 _ G6 _ _ _',
      'A5 _ D6 _ F#6 _ D6 _ A5 _ D6 _ F#6 _ _ _',
      'B5 _ E6 _ G6 _ E6 _ B5 _ E6 _ G6 _ _ _',
      'F#6 _ D6 _ A5 _ F#5 _ D5 _ . . . . . .',
    ]),
    leadWave: 'triangle',
    leadGain: 0.3,
    leadLen: 1.1,
    arp: null,
    stabs: [8],
    bass: (s) => (s === 0 || s === 6 || s === 10 ? 0 : null),
    kick: (s) => s === 0 || s === 8,
    snare: (s) => s === 12,
    hat: (s) => (s % 4 === 2 ? 0.05 : 0),
    kickGain: 0.4,
    bassLen: 2,
  },
};

export class Music {
  private ctx?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;
  private timer?: ReturnType<typeof setInterval>;
  private step = 0;
  private nextTime = 0;
  private volume: number;
  private readonly theme: Theme;
  private readonly stepDur: number;
  private suspendedByGame = false;
  private readonly unlock = () => {
    if (this.ctx && this.ctx.state === 'suspended' && !this.suspendedByGame && !document.hidden) void this.ctx.resume().catch(() => undefined);
  };
  private readonly onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend().catch(() => undefined);
    else if (!this.suspendedByGame) void this.ctx.resume().catch(() => undefined);
  };

  /** volume 0..100 */
  constructor(volume: number, theme: ThemeName = 'city') {
    this.volume = volume;
    this.theme = THEMES[theme];
    this.stepDur = 60 / this.theme.bpm / 4;
  }

  start() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.gain();
    this.master.connect(ctx.destination);
    // one second of white noise, reused by every drum hit
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
    // browsers keep audio suspended until the player does something; resume on the first key or tap
    window.addEventListener('keydown', this.unlock);
    window.addEventListener('pointerdown', this.unlock);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.unlock();
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.gain(), this.ctx.currentTime, 0.05);
  }

  pause() {
    this.suspendedByGame = true;
    if (this.ctx) void this.ctx.suspend().catch(() => undefined);
  }

  resume() {
    this.suspendedByGame = false;
    if (this.ctx && !document.hidden) void this.ctx.resume().catch(() => undefined);
  }

  /** Fade out and release the audio context. */
  stop(fade = 0.4) {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    window.removeEventListener('keydown', this.unlock);
    window.removeEventListener('pointerdown', this.unlock);
    document.removeEventListener('visibilitychange', this.onVisibility);
    const ctx = this.ctx;
    this.ctx = undefined;
    if (!ctx) return;
    if (this.master) this.master.gain.setTargetAtTime(0, ctx.currentTime, fade / 4);
    setTimeout(() => void ctx.close().catch(() => undefined), fade * 1000 + 100);
  }

  private gain() {
    return (this.volume / 100) * 0.5;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05; // fell behind (tab was busy)
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime);
      this.step++;
      this.nextTime += this.stepDur;
    }
  }

  private playStep(i: number, t: number) {
    const th = this.theme;
    const bar = Math.floor(i / th.steps) % th.lead.length;
    const s = i % th.steps;
    const chord = th.chords[th.progression[bar]];
    const sd = this.stepDur;

    // lead melody (note length = the note plus any holds that follow)
    const tok = th.lead[bar][s];
    if (tok !== '_' && tok !== '.') {
      let len = 1;
      while (s + len < th.steps && th.lead[bar][s + len] === '_') len++;
      this.tone(th.leadWave, freq(midi(tok)), t, len * sd * (th.leadLen ?? (th.leadWave === 'sine' ? 1.6 : 0.92)), th.leadGain, 0.012);
    }
    // arpeggio or chord stabs
    if (th.arp) this.tone('square', freq(chord.arp[th.arp[s]]), t, sd * 0.85, 0.07, 0.004);
    if (th.stabs?.includes(s)) chord.arp.forEach((n) => this.tone('square', freq(n), t, sd * 1.6, 0.045, 0.004));
    // bass
    const b = th.bass(s);
    if (b !== null) this.tone('triangle', freq(chord.root + b), t, sd * (th.bassLen ?? (th.steps === 12 ? 3.2 : 1.7)), 0.42, 0.005);
    // drums
    if (th.kick(s, bar)) this.kick(t);
    if (th.snare(s)) this.snare(t);
    const h = th.hat(s);
    if (h > 0) this.hat(t, h);
  }

  private tone(type: OscillatorType, f: number, t: number, dur: number, gain: number, attack: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + attack);
    amp.gain.exponentialRampToValueAtTime(gain * 0.45, t + dur * 0.6);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    amp.gain.setValueAtTime(this.theme.kickGain ?? (this.theme.steps === 12 ? 0.3 : 0.55), t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(amp).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  private snare(t: number) {
    this.burst(t, 0.11, 'bandpass', 1900, 0.28);
    this.tone('triangle', 190, t, 0.07, 0.18, 0.002);
  }

  private hat(t: number, gain: number) {
    this.burst(t, 0.035, 'highpass', 7500, gain);
  }

  private burst(t: number, dur: number, filter: BiquadFilterType, f: number, gain: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const flt = ctx.createBiquadFilter();
    flt.type = filter;
    flt.frequency.value = f;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(amp).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}
