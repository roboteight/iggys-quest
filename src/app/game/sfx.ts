/** Tiny synthesised sound effects (no audio files). Volume comes from the Settings page (0–100). */
export class Sfx {
  private ctx?: AudioContext;
  private closed = false;

  constructor(private volume: number) {}

  setVolume(v: number) {
    this.volume = v;
  }

  /** Release the audio context (the scene is over); later calls make no sound. */
  close() {
    this.closed = true;
    const ctx = this.ctx;
    this.ctx = undefined;
    if (ctx) void ctx.close().catch(() => undefined);
  }

  private ensure(): AudioContext | undefined {
    if (this.volume <= 0 || this.closed) return undefined;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return undefined;
    }
  }

  private tone(freq: number, to: number, dur: number, type: OscillatorType, gain = 1, delay = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    const peak = 0.18 * (this.volume / 100) * gain;
    amp.gain.setValueAtTime(peak, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A metallic "ping": inharmonic partials with a fast decay, like a struck tin can or bolt. */
  private clink(base: number, dur: number, gain: number, delay = 0) {
    [1, 2.76, 5.4, 8.9].forEach((m, i) => this.tone(base * m, base * m * 0.97, dur / (1 + i * 0.6), i % 2 ? 'square' : 'sine', gain / (1 + i * 0.8), delay));
  }

  /** Short burst of band-passed noise: the "tick" of small metal bits hitting each other. */
  private tick(freq: number, dur: number, gain: number, delay = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 6;
    const amp = ctx.createGain();
    amp.gain.value = 0.5 * (this.volume / 100) * gain;
    src.connect(bp).connect(amp).connect(ctx.destination);
    src.start(t0);
  }

  /** Clanking footstep. `loose` (0..1) = how rattly the current suit is. */
  step(loose: number, alt: boolean) {
    const base = (alt ? 190 : 230) * (0.9 + Math.random() * 0.2);
    this.clink(base, 0.14, 0.7 * (0.5 + loose * 0.5));
    this.tick(3200, 0.04, 0.9);
    if (loose > 0.3) for (let i = 0; i < 2; i++) this.tick(4200 + Math.random() * 2500, 0.025, 0.5, 0.03 + Math.random() * 0.08);
  }

  /** Jump: it sounds like someone dropped a bag of nuts and bolts. */
  jump(loose = 1) {
    this.tone(150, 90, 0.08, 'triangle', 0.8); // the thump of the bag
    const bits = 9 + Math.round(loose * 8);
    for (let i = 0; i < bits; i++) {
      // scattering: dense at first, then spaced out
      const delay = 0.02 + Math.pow(Math.random(), 1.6) * 0.45;
      this.tick(2500 + Math.random() * 4500, 0.02 + Math.random() * 0.02, 0.5 + Math.random() * 0.6, delay);
      if (Math.random() < 0.6) this.clink(900 + Math.random() * 1800, 0.07 + Math.random() * 0.06, 0.25 + Math.random() * 0.3, delay);
    }
  }

  /** Double jump: a springy "boing" with a lighter scatter of bits. */
  air(loose = 1) {
    this.tone(220, 700, 0.14, 'triangle', 0.9);
    this.tone(440, 1400, 0.1, 'sine', 0.35);
    for (let i = 0; i < 5 + Math.round(loose * 4); i++) this.tick(3000 + Math.random() * 4000, 0.02, 0.5, 0.03 + Math.random() * 0.25);
  }

  shoot() { this.tone(900, 220, 0.09, 'square', 0.55); this.tick(5000, 0.02, 0.4); }
  charged() { this.tone(500, 1200, 0.12, 'triangle', 0.6); }
  rocket() { this.tone(180, 60, 0.3, 'sawtooth', 0.8); this.tick(1200, 0.18, 0.7); }
  boom() { this.tone(110, 28, 0.5, 'sawtooth', 1.2); this.tick(700, 0.3, 1.2); this.tick(1800, 0.2, 0.8, 0.03); }
  bricks() { this.tone(90, 45, 0.18, 'triangle', 1); for (let i = 0; i < 8; i++) this.tick(900 + Math.random() * 1800, 0.03, 0.8, Math.random() * 0.25); }
  zap() { this.tone(700, 120, 0.15, 'sawtooth', 0.6); this.tick(4000, 0.05, 0.6); }

  win() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, f * 1.01, 0.22, 'square', 0.55, i * 0.1)); }

  land() {
    this.tone(130, 50, 0.14, 'triangle', 1.2);
    this.clink(170, 0.2, 0.8);
    for (let i = 0; i < 4; i++) this.tick(3000 + Math.random() * 3500, 0.025, 0.6, 0.02 + Math.random() * 0.12);
  }
  collect() { this.tone(880, 1320, 0.09, 'sine'); this.tone(1320, 1760, 0.1, 'sine', 1, 0.07); }
  /** a bright rising chime; each ring in a chain is a step higher */
  ring(chain = 1) { const f = 660 * Math.pow(1.122, Math.min(chain, 6) - 1); this.tone(f, f * 1.5, 0.14, 'triangle', 0.9); this.tone(f * 1.5, f * 2, 0.18, 'sine', 0.7, 0.08); }
  power() { [440, 554, 659, 880].forEach((f, i) => this.tone(f, f * 1.02, 0.12, 'square', 0.5, i * 0.07)); }
  hurt() { this.tone(240, 70, 0.3, 'sawtooth', 0.9); }
  suit() { [330, 415, 494, 659, 830].forEach((f, i) => this.tone(f, f * 1.01, 0.18, 'triangle', 1, i * 0.09)); }
  // ---- boss mechs, platforms and checkpoints
  /** a mech powering up: a rising growl */
  bossCharge(long = false) { const d = long ? 0.8 : 0.5; this.tone(70, 260, d, 'sawtooth', 0.7); this.tone(140, 520, d, 'square', 0.25); this.tick(900, d * 0.8, 0.4); }
  bossFire() { this.tone(620, 80, 0.22, 'square', 0.7); this.tone(310, 60, 0.26, 'sawtooth', 0.5); this.tick(2200, 0.05, 0.6); }
  /** a lobbed bomb: a hollow thump and a falling whistle */
  bossMortar() { this.tone(120, 50, 0.18, 'triangle', 1); this.tone(1100, 350, 0.5, 'sine', 0.35, 0.06); }
  bossStomp() { this.tone(70, 25, 0.7, 'sawtooth', 1.3); this.tone(45, 30, 0.9, 'sine', 1.2); this.tick(500, 0.4, 1.2); this.clink(110, 0.4, 0.8, 0.02); }
  bossHit() { this.clink(320, 0.22, 0.9); this.tick(2600, 0.05, 0.7); this.tone(160, 90, 0.1, 'triangle', 0.8); }
  /** a big mech arriving: two low brass-like notes */
  bossAppear() { this.tone(98, 96, 0.9, 'sawtooth', 0.8); this.tone(147, 146, 0.9, 'sawtooth', 0.5, 0.25); this.tick(400, 0.5, 0.6); }
  bossDown() {
    for (let i = 0; i < 5; i++) { this.tone(130 - i * 14, 30, 0.45, 'sawtooth', 1, i * 0.26); this.tick(700 + i * 150, 0.3, 1, i * 0.26); }
    this.tone(260, 40, 1.6, 'sawtooth', 0.5);
  }
  /** wood splintering: a low creak and a scatter of clicks */
  crumble() { this.tone(95, 70, 0.4, 'triangle', 0.7); for (let i = 0; i < 6; i++) this.tick(500 + Math.random() * 900, 0.04, 0.6, Math.random() * 0.35); }
  firework() { this.tone(900, 3200, 0.1, 'sine', 0.15); this.tick(900, 0.25, 0.8, 0.02); this.tone(110, 50, 0.3, 'triangle', 0.7, 0.02); for (let i = 0; i < 5; i++) this.tick(4000 + Math.random() * 2500, 0.03, 0.4, 0.1 + Math.random() * 0.4); }
  perfect() { [523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, f * 1.01, 0.2, 'square', 0.5, i * 0.09)); }
  checkpoint() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f * 1.005, 0.2, 'triangle', 0.9, i * 0.08)); this.tick(5000, 0.12, 0.4, 0.05); }

  over() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.98, 0.25, 'sawtooth', 0.6, i * 0.18)); }
}
