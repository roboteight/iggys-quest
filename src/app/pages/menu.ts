import { Component, inject } from '@angular/core';
import { ProgressService } from '../progress.service';
import { LEVELS } from '../game/levels';
import { RouterLink } from '@angular/router';
import { FocusOnLoad } from './focus-heading';
import { EnemyArt, EnemyKind, IggyArt } from './art';
import { dailyBoard, dailyLevel, todayKey } from '../daily';

/** One accent colour per level look, used for the stripe and number badge on each card. */
const ACCENT: Record<string, string> = {
  city: '#8fa1c4', hollow: '#b7a1e8', wastes: '#e08a45', drowned: '#4fd1a1', void: '#ff4fd8', spores: '#7dffc0', war: '#e0813a',
};

@Component({
  selector: 'app-menu',
  imports: [RouterLink, FocusOnLoad, IggyArt, EnemyArt],
  styles: `
    :host { display: block; }
    .landing { width: 100%; max-width: 72rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; display: grid; gap: 3.5rem; box-sizing: border-box; text-align: left; }
    section > h2 { font-size: clamp(1.4rem, 3.5vw, 2rem); margin: 0 0 1rem; }

    /* hero */
    .hero { display: grid; gap: 2rem; align-items: center; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); padding: 1rem 0 0; }
    .eyebrow { margin: 0 0 .5rem; font-size: .85rem; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); font-weight: 700; }
    h1 { font-size: clamp(2.8rem, 8vw, 5.2rem); line-height: 1; letter-spacing: -.02em; margin: 0 0 1rem; color: var(--accent); text-shadow: 0 5px 0 rgb(0 0 0 / .5); }
    .tag { margin: 0 0 1.5rem; max-width: 40ch; font-size: 1.2rem; line-height: 1.5; }
    .cta { display: flex; flex-wrap: wrap; gap: .75rem; margin-bottom: 1.5rem; }
    .cta .btn { width: auto; min-width: 12rem; }
    .cta .big { font-size: 1.2rem; min-height: 56px; padding-inline: 1.75rem; }
    .facts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .5rem; }
    .facts li { padding: .35rem .8rem; border: 2px solid var(--border); border-radius: 999px; background: var(--panel); font-size: .9rem; font-weight: 600; }
    .art { position: relative; justify-self: center; width: min(26rem, 100%); padding: 1.25rem; border-radius: 28px; border: 2px solid var(--border);
           background: radial-gradient(ellipse at 50% 38%, rgb(255 168 90 / .28), transparent 62%), linear-gradient(180deg, #1b2236, #0d1220 70%); box-shadow: 0 18px 48px rgb(0 0 0 / .45); }
    .art app-iggy-art { position: relative; }
    @media (prefers-reduced-motion: no-preference) { .art app-iggy-art { animation: bob 4.2s ease-in-out infinite; } }
    @keyframes bob { 50% { transform: translateY(-8px); } }
    @media (max-width: 52rem) { .hero { grid-template-columns: 1fr; } .art { order: -1; width: min(20rem, 100%); } }

    /* enemies and features */
    .cast, .features { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .cast li { display: flex; flex-direction: column; background: var(--panel); border: 2px solid var(--border); border-radius: 18px; overflow: hidden; }
    .cast .pic { padding: .75rem 1rem 0; background: radial-gradient(ellipse at 50% 80%, rgb(255 190 120 / .35), rgb(255 190 120 / .06) 70%), #26203a; }
    .cast .txt { padding: .9rem 1.1rem 1.1rem; }
    .cast h3, .features h3 { margin: 0 0 .3rem; font-size: 1.1rem; }
    .cast p, .features p { margin: 0; font-size: .95rem; line-height: 1.45; opacity: .92; }
    .features li { background: var(--panel); border: 2px solid var(--border); border-radius: 16px; padding: 1.1rem 1.2rem; }
    .features .ico { display: inline-grid; place-items: center; width: 2.2rem; height: 2.2rem; margin-bottom: .5rem; border-radius: 10px; background: var(--accent); color: #17130a; font-weight: 800; }

    /* levels */
    .grid { list-style: none; margin: 0; padding: 0; width: 100%; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); }
    .grid > li { display: flex; flex-direction: column; gap: .4rem; }
    .grid > li > .card { flex: 1; }
    .modes { display: flex; gap: .5rem; margin: 0; }
    .modes .btn { flex: 1; min-height: 44px; padding: .25rem .5rem; font-size: .9rem; }
    .card { position: relative; display: grid; gap: .25rem; height: 100%; padding: 1.1rem 1.1rem 1rem 1.1rem; text-align: left; text-decoration: none; color: var(--fg);
            background: var(--panel); border: 2px solid var(--border); border-radius: 14px; overflow: hidden; min-height: 44px; }
    .card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 6px; background: var(--c); }
    .card:hover { border-color: var(--c); }
    @media (prefers-reduced-motion: no-preference) { .card { transition: transform .12s, border-color .12s; } .card:hover { transform: translateY(-3px); } }
    .num { font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; color: var(--c); font-weight: 700; }
    .name { font-size: 1.2rem; font-weight: 700; }
    .blurb { font-size: .95rem; opacity: .88; }
    .status { font-size: .85rem; font-weight: 700; }
    .locked { opacity: .6; border-style: dashed; }
    .start { color: var(--accent); font-size: .8rem; font-weight: 700; }
    .bottom { display: flex; gap: .75rem; flex-wrap: wrap; justify-content: center; width: 100%; }
    .bottom .btn { width: auto; min-width: 12rem; }
    :host-context([data-contrast='high']) .locked { opacity: 1; }
    :host-context([data-contrast='high']) .num { color: var(--fg); }
    @media (forced-colors: active) { .card, .art, .cast li, .features li, .facts li { border-color: CanvasText; } .card:hover { border-color: Highlight; } }
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
        <div class="art"><app-iggy-art /></div>
      </section>

      <section aria-labelledby="meet">
        <h2 id="meet">Meet the trouble</h2>
        <ul class="cast">
          @for (e of cast; track e.kind) {
            <li>
              <div class="pic"><app-enemy-art [kind]="e.kind" /></div>
              <div class="txt"><h3>{{ e.name }}</h3><p>{{ e.text }}</p></div>
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
        <nav aria-label="Levels">
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
    </main>
  `,
})
export class MenuPage {
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
  protected readonly cast: { kind: EnemyKind; name: string; text: string }[] = [
    { kind: 'skeleton', name: 'Skeleton soldiers', text: 'They patrol the rooftops and trenches. Land on their heads to stomp them, or shoot them.' },
    { kind: 'crawler', name: 'Crawlers', text: 'Low, quick and sneaky. Duck to shoot them, because standing shots fly right over.' },
    { kind: 'glowray', name: 'Glow-rays', text: 'They hover above the roofs and dive when they flash red. Stomp or shoot them.' },
    { kind: 'tank', name: 'The Iron Marshal', text: 'The siege tank at the end of the trenches, shelling the whole level. Listen for the whistle.' },
  ];
  protected readonly features: { icon: string; title: string; text: string }[] = [
    { icon: '7', title: 'Seven strange worlds', text: 'From rain-soaked rooftops to a drowned city, a neon void and a smoking trench line.' },
    { icon: '★', title: 'A boss mech at every end', text: 'Each one attacks differently and has its own music. Power-ups drop from the sky.' },
    { icon: '↑', title: 'Upgrade the suit', text: 'Jump through rings to earn better suits, then dash, ground-pound and glide.' },
    { icon: '?', title: 'Secrets everywhere', text: 'Hidden paths, golden breadboards and perfect-run fireworks for the thorough.' },
    { icon: '⏱', title: 'Play it your way', text: 'A daily challenge, endless mode and time attack with a ghost of your best run.' },
    { icon: '♿', title: 'Made for everyone', text: 'Remappable keys, gamepad, touch, assist options, reduced motion and screen-reader support.' },
  ];
}
