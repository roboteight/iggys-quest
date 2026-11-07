import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEVELS } from '../game/levels';
import { ProgressService } from '../progress.service';
import { FocusOnLoad } from './focus-heading';

@Component({
  selector: 'app-scores',
  imports: [RouterLink, FocusOnLoad],
  styles: `
    main { max-width: 46rem; }
    .board { width: 100%; text-align: left; background: var(--panel); border: 2px solid var(--border); border-radius: 14px; padding: .5rem 1.25rem 1rem; }
    h2 { font-size: 1.15rem; margin: .75rem 0 .25rem; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid var(--border); }
    th { font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; opacity: .85; }
    td.num, th.num { text-align: right; }
    .empty { margin: .25rem 0 0; opacity: .85; }
  `,
  template: `
    <main class="page">
      <h1 tabindex="-1" appFocusOnLoad>High scores</h1>
      <p class="empty">The five best runs on each level, saved in this browser.</p>
      @for (l of levels; track l.id) {
        <section class="board" [attr.aria-labelledby]="'h-' + l.id">
          <h2 [id]="'h-' + l.id">Level {{ l.number }}: {{ l.name }}</h2>
          @if (rows(l.id).length) {
            <table>
              <thead><tr><th scope="col">Place</th><th scope="col">Name</th><th scope="col" class="num">Score</th><th scope="col">Result</th><th scope="col">Date</th></tr></thead>
              <tbody>
                @for (e of rows(l.id); track $index) {
                  <tr><th scope="row">{{ $index + 1 }}</th><td>{{ e.name }}</td><td class="num">{{ e.score }}</td><td>{{ e.cleared ? 'Beat the boss' : 'Fell apart' }}</td><td>{{ e.date }}</td></tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="empty">No scores yet.</p>
          }
        </section>
      }
      <a class="btn" routerLink="/" style="max-width:24rem">Back to menu</a>
    </main>
  `,
})
export class ScoresPage {
  private readonly progress = inject(ProgressService);
  protected readonly levels = LEVELS;
  protected rows(id: string) {
    return this.progress.progress().scores[id] ?? [];
  }
}
