import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ProgressService } from '../progress.service';
import { BOSSES, LEVELS } from '../game/levels';
import { RouterLink } from '@angular/router';
import { FocusOnLoad } from './focus-heading';
import { dailyBoard, dailyLevel, todayKey } from '../daily';

/** One accent colour per level look, used for the stripe on each level card. */
const ACCENT: Record<string, string> = {
  city: '#8fa1c4', hollow: '#b7a1e8', wastes: '#e08a45', drowned: '#4fd1a1', void: '#ff4fd8', spores: '#7dffc0', war: '#e0813a',
};

/** A concept-art sheet in /public/art. The sheets carry their own hand-lettered labels, so the text next to them says the same in words. */
interface Sheet {
  file: string;
  name: string;
  text: string;
  alt: string;
}

/** Which sheet belongs to which boss, by level look. */
const BOSS_SHEET: Record<string, string> = {
  city: 'enforcer-nine', hollow: 'grandfather-gloom', wastes: 'dust-scorpion', drowned: 'deep-diver', void: 'neon-warden', spores: 'spore-mother', war: 'iron-marshal',
};

/** Specific descriptions for sheets that have been looked at closely; the others fall back to the boss's one-line blurb. */
const BOSS_ALT: Record<string, string> = {
  spores: 'Concept art sheet for the Spore Mother, the boss of level 6: a towering riveted mech under a huge domed mushroom cap with gills, glowing orange eyes and a fanged mouth, standing on three heavy hydraulic legs. One arm is a spore emitter and the other a claw with a ground drill. Smaller drawings show its back view, the claw, and a porthole vent.',
};

@Component({
  selector: 'app-menu',
  imports: [RouterLink, FocusOnLoad],
  styles: `
    /* The landing page is a portfolio of vintage concept-art sheets: aged paper, pencil and ink, hand-lettered titles. */
    :host {
      --paper: #efe3c8; --paper-2: #e4d4b0; --ink: #2a1d12; --ink-2: #5b4632; --rust: #a8431f; --line: #3a2a1c;
      display: block; min-height: 100dvh; color: var(--ink); text-align: left;
      font: 1.05rem/1.55 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
      background-color: var(--paper);
      background-image:
        radial-gradient(ellipse at 14% 6%, rgb(255 252 240 / .6), transparent 48%),
        radial-gradient(ellipse at 92% 94%, rgb(150 105 55 / .22), transparent 55%),
        linear-gradient(90deg, transparent 33%, rgb(120 90 50 / .07) 33.2%, transparent 33.6%, transparent 66%, rgb(120 90 50 / .06) 66.2%, transparent 66.6%),
        url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .25  0 0 0 0 .12  0 0 0 .28 0'/></filter><rect width='220' height='220' filter='url(%23n)'/></svg>");
    }
    :host-context([data-contrast='high']) { --paper: #fff; --paper-2: #fff; --ink: #000; --ink-2: #000; --rust: #000; --line: #000; background: #fff; }
    @media (forced-colors: active) { :host { background: Canvas; color: CanvasText; } }

    .landing { width: 100%; max-width: 74rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; display: grid; gap: 3.5rem; }
    h1, h2, h3, .eyebrow, .btn, .num, .where { font-family: 'Marker Felt', 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive; }
    h2 { font-size: clamp(1.6rem, 4vw, 2.3rem); margin: 0 0 .25rem; letter-spacing: .03em; text-transform: uppercase; display: inline-block; border-bottom: 3px solid var(--line); padding-bottom: .1rem; }
    .sub { margin: .4rem 0 1.25rem; max-width: 60ch; color: var(--ink-2); }

    /* hero */
    .hero { display: grid; gap: 2.5rem; align-items: center; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); }
    .eyebrow { margin: 0 0 .4rem; font-size: .95rem; letter-spacing: .16em; text-transform: uppercase; color: var(--rust); font-weight: 700; }
    h1 { font-size: clamp(3rem, 8.5vw, 5.6rem); line-height: .98; letter-spacing: .02em; margin: 0 0 1rem; text-transform: uppercase; display: inline-block; border-bottom: 5px solid var(--line); padding-bottom: .12em; }
    .tag { margin: 0 0 1.5rem; max-width: 42ch; font-size: 1.25rem; }
    .cta { display: flex; flex-wrap: wrap; gap: .8rem; margin-bottom: 1.4rem; }
    .btn { display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: 11rem; min-height: 48px; padding: .6rem 1.4rem; font-size: 1.1rem; font-weight: 700; text-decoration: none;
           color: var(--ink); background: transparent; border: 2.5px solid var(--line); border-radius: 12px 5px 14px 6px / 6px 14px 5px 12px; box-shadow: 3px 3px 0 var(--line); }
    .btn:hover { background: rgb(255 255 255 / .35); border-color: var(--line); }
    .btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--line); }
    .btn.primary { background: var(--ink); color: var(--paper); border-color: var(--ink); box-shadow: 3px 3px 0 var(--rust); }
    .btn.big { font-size: 1.25rem; min-height: 56px; padding-inline: 1.8rem; }
    .facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .5rem; }
    .facts li { padding: .25rem .8rem; border: 2px solid var(--line); border-radius: 999px 40px 999px 40px / 40px 999px 40px 999px; font-size: .95rem; font-weight: 600; background: rgb(255 255 255 / .25); }

    /* a sheet pinned to the board */
    .sheet { margin: 0; }
    .sheet a { display: block; background: #f6edd6; padding: .55rem; border: 2px solid var(--line); border-radius: 3px; box-shadow: 6px 8px 0 rgb(40 25 10 / .28), 0 14px 28px rgb(40 25 10 / .22); line-height: 0; }
    .sheet img { display: block; width: 100%; height: auto; aspect-ratio: 765 / 1024; object-fit: cover; background: var(--paper-2); }
    .hero .sheet { justify-self: center; width: min(26rem, 100%); }
    @media (prefers-reduced-motion: no-preference) {
      .hero .sheet { transform: rotate(1.6deg); transition: transform .2s; }
      .hero .sheet:hover { transform: rotate(0deg) scale(1.01); }
      .grid-sheets .sheet a { transition: transform .15s; }
      .grid-sheets li:nth-child(odd) .sheet { transform: rotate(-.6deg); }
      .grid-sheets li:nth-child(even) .sheet { transform: rotate(.5deg); }
      .grid-sheets .sheet a:hover { transform: translateY(-4px); }
    }
    @media (max-width: 52rem) { .hero { grid-template-columns: 1fr; } .hero .sheet { order: -1; width: min(20rem, 100%); } }

    /* grids of sheets */
    .grid-sheets { list-style: none; margin: 0; padding: 0; display: grid; gap: 2rem 1.5rem; grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr)); }
    .grid-sheets li { display: flex; flex-direction: column; gap: .8rem; }
    .caption h3 { margin: 0 0 .15rem; font-size: 1.3rem; letter-spacing: .02em; }
    .caption p { margin: 0; font-size: .98rem; }
    .where { margin: 0 0 .1rem; font-size: .85rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; color: var(--rust); }

    .features { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .features li { border: 2.5px solid var(--line); border-radius: 8px 3px 10px 4px / 4px 10px 3px 8px; padding: 1rem 1.2rem; background: rgb(255 255 255 / .28); }
    .features h3 { margin: 0 0 .2rem; font-size: 1.15rem; }
    .features p { margin: 0; font-size: .97rem; }
    .ico { display: inline-grid; place-items: center; width: 2.1rem; height: 2.1rem; margin-bottom: .45rem; border: 2.5px solid var(--line); border-radius: 50%; font-family: 'Marker Felt', 'Bradley Hand', cursive; font-weight: 800; background: #f6edd6; }

    /* levels */
    .grid { list-style: none; margin: 0; padding: 0; width: 100%; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); }
    .grid > li { display: flex; flex-direction: column; gap: .5rem; }
    .grid > li > .card { flex: 1; }
    .modes { display: flex; gap: .5rem; margin: 0; }
    .modes .btn { flex: 1; min-width: 0; min-height: 44px; padding: .2rem .5rem; font-size: .95rem; box-shadow: 2px 2px 0 var(--line); }
    .card { position: relative; display: grid; gap: .25rem; height: 100%; padding: 1.2rem 1.1rem 1rem; text-decoration: none; color: var(--ink);
            background: rgb(255 255 255 / .3); border: 2.5px solid var(--line); border-radius: 8px 3px 10px 4px / 4px 10px 3px 8px; overflow: hidden; min-height: 44px; }
    .card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 7px; background: var(--c); border-bottom: 2px solid var(--line); }
    .card:hover { background: rgb(255 255 255 / .5); }
    .num { font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-2); font-weight: 700; }
    .name { font-size: 1.3rem; font-weight: 700; font-family: 'Marker Felt', 'Bradley Hand', cursive; }
    .blurb { font-size: .97rem; }
    .status { font-size: .9rem; font-weight: 700; }
    .locked { border-style: dashed; color: var(--ink-2); }
    .start { color: var(--rust); font-size: .9rem; font-weight: 700; }
    .bottom { display: flex; gap: .9rem; flex-wrap: wrap; justify-content: center; }
    /* the full-size viewer */
    .viewer { width: min(96vw, 62rem); max-width: none; max-height: 96dvh; padding: .75rem; border: 3px solid var(--line); border-radius: 6px; background: #f6edd6; color: var(--ink); box-shadow: 0 20px 60px rgb(0 0 0 / .6); overflow: auto; }
    .viewer::backdrop { background: rgb(24 14 6 / .82); }
    .viewer-bar { display: flex; align-items: center; gap: 1rem; margin-bottom: .6rem; }
    .viewer-bar h2 { margin: 0; font-size: 1.3rem; border: 0; padding: 0; }
    .viewer .btn { min-width: 6rem; }
    .viewer img { display: block; margin: 0 auto; max-width: 100%; max-height: calc(96dvh - 6.5rem); width: auto; height: auto; }
    a:focus-visible, .viewer button:focus-visible { outline: 3px solid var(--rust); outline-offset: 3px; }
    :host-context([data-contrast='high']) a:focus-visible { outline-color: #000; }
    @media (forced-colors: active) { .card, .btn, .facts li, .features li, .sheet a, .viewer { border-color: CanvasText; } .btn.primary { background: ButtonText; color: ButtonFace; } }
  `,
  template: `
    <main class="landing">
      <section class="hero" aria-labelledby="title">
        <div class="copy">
          <p class="eyebrow">A side-scrolling robot platformer</p>
          <h1 id="title" tabindex="-1" appFocusOnLoad>Iggy’s Quest</h1>
          <p class="tag">Help Iggy, an old and very clumsy robot, run home across seven strange worlds. Jump through rings to upgrade his suit, dodge the shells and beat every boss mech on the way.</p>
          <div class="cta">
            <a class="btn primary big" [routerLink]="['/play', next().id]">{{ started() ? 'Continue: ' + next().name : 'Play now' }}</a>
            <a class="btn big" routerLink="/daily">Daily challenge</a>
          </div>
          <ul class="facts" aria-label="Highlights">
            <li>7 worlds</li><li>7 boss mechs</li><li>Keyboard, gamepad and touch</li><li>Remappable controls</li><li>Works offline</li>
          </ul>
        </div>
        <figure class="sheet">
          <a href="art/iggy.webp" aria-haspopup="dialog" (click)="show($event, 'art/iggy.webp', heroAlt, 'Iggy')">
            <img src="art/iggy.webp" width="765" height="1024" [alt]="heroAlt"/>
            <span class="visually-hidden">View the full-size concept sheet for Iggy</span>
          </a>
        </figure>
      </section>

      <section aria-labelledby="meet">
        <h2 id="meet">Meet the trouble</h2>
        <p class="sub">Patrols, chargers, bombers and flyers. The concept sheets carry the details; the notes here say what each one does and how to beat it.</p>
        <ul class="grid-sheets">
          @for (e of enemies; track e.file) {
            <li>
              <figure class="sheet">
                <a [href]="'art/' + e.file + '.webp'" aria-haspopup="dialog" (click)="show($event, 'art/' + e.file + '.webp', e.alt, e.name)">
                  <img [src]="'art/' + e.file + '.webp'" width="765" height="1024" loading="lazy" [alt]="e.alt"/>
                  <span class="visually-hidden">View the full-size concept sheet for {{ e.name }}</span>
                </a>
              </figure>
              <div class="caption"><h3>{{ e.name }}</h3><p>{{ e.text }}</p></div>
            </li>
          }
        </ul>
      </section>

      <section aria-labelledby="bosses">
        <h2 id="bosses">The boss mechs</h2>
        <p class="sub">One waits at the end of every world, with its own attacks and its own music.</p>
        <ul class="grid-sheets">
          @for (b of bosses; track b.name) {
            <li>
              <figure class="sheet">
                <a [href]="'art/' + b.file + '.webp'" aria-haspopup="dialog" (click)="show($event, 'art/' + b.file + '.webp', b.alt, b.name)">
                  <img [src]="'art/' + b.file + '.webp'" width="765" height="1024" loading="lazy" [alt]="b.alt"/>
                  <span class="visually-hidden">View the full-size concept sheet for {{ b.name }}</span>
                </a>
              </figure>
              <div class="caption"><p class="where">Level {{ b.number }}: {{ b.level }}</p><h3>{{ b.name }}</h3><p>{{ b.text }}</p></div>
            </li>
          }
        </ul>
      </section>

      <section aria-labelledby="features">
        <h2 id="features">What’s inside</h2>
        <ul class="features">
          @for (f of features; track f.title) {
            <li><span class="ico" aria-hidden="true">{{ f.icon }}</span><h3>{{ f.title }}</h3><p>{{ f.text }}</p></li>
          }
        </ul>
      </section>

      <section aria-labelledby="levels">
        <h2 id="levels">Choose a level</h2>
        <nav aria-label="Levels" style="margin-top:1rem">
          <ul class="grid">
            <li>
              <a class="card" [style.--c]="accent(daily.style)" routerLink="/daily">
                <span class="num">Daily challenge · {{ today }}</span>
                <span class="name">Today: {{ daily.name }}</span>
                <span class="blurb">The same level layout for everyone today, with its own high-score table.</span>
                @if (progress.best(board)) { <span class="status">Best today {{ progress.best(board) }}</span> } @else { <span class="start">Play today’s level →</span> }
              </a>
            </li>
            @for (l of levels; track l.id) {
              <li>
                @if (progress.unlocked(l.id)) {
                  <a class="card" [style.--c]="accent(l.style)" [routerLink]="['/play', l.id]">
                    <span class="num">Level {{ l.number }}</span>
                    <span class="name">{{ l.name }}</span>
                    <span class="blurb">{{ l.blurb }}</span>
                    @if (progress.cleared(l.id)) { <span class="status">Cleared ✓ @if (progress.perfected(l.id)) { · Perfect ★ } · best {{ progress.best(l.id) }}</span> }
                    @else if (progress.best(l.id)) { <span class="status">Best {{ progress.best(l.id) }}</span> }
                    @else if (l.number === 1) { <span class="start">Start here →</span> }
                  </a>
                  <p class="modes" [attr.aria-label]="'Other ways to play level ' + l.number">
                    <a class="btn" [routerLink]="['/play', l.id]" [queryParams]="{ mode: 'endless' }">Endless<span class="visually-hidden"> mode, level {{ l.number }}</span></a>
                    <a class="btn" [routerLink]="['/play', l.id]" [queryParams]="{ mode: 'time' }">Time attack<span class="visually-hidden">, level {{ l.number }}</span></a>
                  </p>
                } @else {
                  <div class="card locked" [style.--c]="accent(l.style)">
                    <span class="num">Level {{ l.number }}</span>
                    <span class="name">{{ l.name }}</span>
                    <span class="status">Locked: beat the boss of level {{ l.number - 1 }} first</span>
                  </div>
                }
              </li>
            }
          </ul>
        </nav>
      </section>

      <div class="bottom"><a class="btn" routerLink="/scores">High scores and achievements</a><a class="btn" routerLink="/settings">Settings and controls</a></div>

      <dialog #viewer class="viewer" aria-labelledby="viewer-title" (click)="backdropClick($event)" (close)="closed()">
        <div class="viewer-bar">
          <button type="button" class="btn" (click)="close()">Close</button>
          <h2 id="viewer-title">{{ current()?.name }}</h2>
        </div>
        @if (current(); as c) {
          <img [src]="c.src" [alt]="c.alt"/>
        }
      </dialog>
    </main>
  `,
})
export class MenuPage {
  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');
  protected readonly current = signal<{ src: string; alt: string; name: string } | null>(null);
  protected readonly heroAlt = 'Concept art sheet for Iggy: a tall retro robot in cream and weathered teal metal with copper bands, a glass dome helmet holding a little green alien robot, a spring antenna with a bulb, a chest panel of dials, a tool belt and a raygun holster. Smaller drawings show his back, the raygun and the chest meter.';

  /** Open a concept sheet full size. Without scripting the link still opens the image itself. */
  protected show(e: Event, src: string, alt: string, name: string) {
    e.preventDefault();
    this.current.set({ src, alt, name });
    const d = this.viewer().nativeElement;
    if (typeof d.showModal !== 'function') { window.open(src, '_blank', 'noopener'); return; }
    document.documentElement.style.overflow = 'hidden'; // keep the page from scrolling behind the dialog
    d.showModal();
  }
  protected close() {
    this.viewer().nativeElement.close();
  }
  /** a click on the dim area around the picture closes it */
  protected backdropClick(e: MouseEvent) {
    if (e.target === this.viewer().nativeElement) this.close();
  }
  protected closed() {
    document.documentElement.style.overflow = '';
    this.current.set(null);
  }

  protected readonly daily = dailyLevel();
  protected readonly today = todayKey();
  protected readonly board = dailyBoard();
  protected readonly levels = LEVELS;
  protected readonly progress = inject(ProgressService);
  protected accent(style: string) {
    return ACCENT[style] ?? '#ffd23f';
  }
  /** the level to jump back into: the first unlocked level that is not cleared yet */
  protected next() {
    return this.levels.find((l) => this.progress.unlocked(l.id) && !this.progress.cleared(l.id)) ?? this.levels[this.levels.length - 1];
  }
  protected started() {
    return this.levels.some((l) => this.progress.cleared(l.id) || this.progress.best(l.id) > 0);
  }

  protected readonly enemies: Sheet[] = [
    { file: 'skeleton-soldier', name: 'Skeleton soldiers', text: 'They patrol the rooftops and trenches. Land on their heads to stomp them, or shoot them.',
      alt: 'Concept art sheet for the Skeleton-Soldier: a mechanical skeleton in a dented soldier’s helmet with a glowing orange ribcage, carrying a retro rifle with a bayonet. Smaller drawings show its back, ribcage and knee joint.' },
    { file: 'crawler', name: 'Crawlers', text: 'Low, quick and sneaky. Duck to shoot them, because standing shots fly right over.',
      alt: 'Concept art sheet for the Crawler: a riveted, rusty mech tarantula with a cluster of glowing orange eyes, fangs, a gun under its mandibles and spiked, multi-jointed legs. Smaller drawings show its eyes, a spiked leg and the front pincers.' },
    { file: 'death-ray', name: 'Death-rays', text: 'Riveted metal manta rays that hover above the roofs and dive when they flash red. Stomp them or shoot them.',
      alt: 'Concept art sheet for the Death Ray: a riveted, weathered metal manta ray with glowing orange eyes, a segmented stinger tail and an under-mounted emitter dish. Smaller drawings show the emitter, the stinger and the wing plating.' },
    { file: 'rust-hound', name: 'Rust Hounds', text: 'Fast, low robot dogs that charge the moment they spot Iggy. Their springy legs coil when they land, so stomp them then.',
      alt: 'Concept art sheet for the Rust Hound: a low-slung robot dog of rusty, teal-patched scrap metal with a spiked back, a crushing jaw, a glowing orange eye and a chain-segmented tail. Smaller drawings show its charging pose, its skull and a coiled spring leg joint.' },
    { file: 'grenadier', name: 'Grenadiers', text: 'Armoured bombers with a lobber arm and an ammo hopper on their backs. They throw fused bombs in high arcs, and a bomb can be shot down in flight.',
      alt: 'Concept art sheet for the Grenadier: a heavily armoured skeleton-faced robot in a grate helmet with a spring-loaded lobber arm, a bandolier and a hopper of fuse-lit bombs on its back. Smaller drawings show its back and a single round bomb.' },
    { file: 'shield-guard', name: 'Shield Guards', text: 'They hide behind a huge round shield that bounces shots away. Jump on the flat head, or get round behind them to the exposed gears.',
      alt: 'Concept art sheet for the Shield Guard: a bulky, spiked robot in a flat-topped helmet behind a massive round riveted shield, with sparks bouncing off it. Smaller drawings show the shield, the exposed rear gears and the vulnerable head.' },
    { file: 'gearbat', name: 'Gearbats', text: 'Erratic flyers with spinning, gear-spoked wings and chain-segmented tails. They swoop in wild arcs, so wait for the gap.',
      alt: 'Concept art sheet for the Gearbat: a bat-like flying robot with a skull face, glowing orange eyes, ragged gear-spoked wings, small rocket vents and a chain-segmented tail. Smaller drawings show its wing, head, pincer claws and back view.' },
    { file: 'burrower', name: 'Burrowers', text: 'Drill-nosed digging mechs that burst up out of the ground ahead of Iggy. Watch the dirt move, then get clear.',
      alt: 'Concept art sheet for the Burrower: a hulking, riveted mech with a massive spiral drill nose, huge excavator claws and a turbine engine venting smoke, bursting out of rubble. Smaller drawings show the drill, a claw and a rear view.' },
  ];

  protected readonly bosses = LEVELS.map((l) => ({
    file: BOSS_SHEET[l.style],
    name: BOSSES[l.style].name,
    text: BOSSES[l.style].blurb,
    number: l.number,
    level: l.name,
    alt: BOSS_ALT[l.style] ?? `Concept art sheet for ${BOSSES[l.style].name}, the boss of level ${l.number}: ${BOSSES[l.style].blurb}`,
  }));

  protected readonly features: { icon: string; title: string; text: string }[] = [
    { icon: '7', title: 'Seven strange worlds', text: 'From rain-soaked rooftops to a drowned city, a neon void and a smoking trench line.' },
    { icon: '★', title: 'A boss mech at every end', text: 'Each one attacks differently and has its own music. Power-ups drop from the sky.' },
    { icon: '↑', title: 'Upgrade the suit', text: 'Jump through rings to earn better suits, then dash, ground-pound and glide.' },
    { icon: '?', title: 'Secrets everywhere', text: 'Hidden paths, golden breadboards and perfect-run fireworks for the thorough.' },
    { icon: '⏱', title: 'Play it your way', text: 'A daily challenge, endless mode and time attack with a ghost of your best run.' },
    { icon: '♿', title: 'Made for everyone', text: 'Remappable keys, gamepad, touch, assist options, reduced motion and screen-reader support.' },
  ];
}
