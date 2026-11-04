import { Component } from '@angular/core';
import { LEVELS } from '../game/levels';
import { RouterLink } from '@angular/router';
import { FocusOnLoad } from './focus-heading';

@Component({
  selector: 'app-menu',
  imports: [RouterLink, FocusOnLoad],
  template: `
    <main class="page">
      <h1 tabindex="-1" appFocusOnLoad>Iggy’s Quest</h1>
      <p style="max-width:40ch">Help Iggy, an old and very clumsy robot, run across the rooftops of strange places. Collect breadboards to upgrade his suit.</p>
      <nav aria-label="Main menu" class="stack">
        @for (l of levels; track l.id) {
          <a class="btn" [class.primary]="l.number === 1" [routerLink]="['/play', l.id]">Level {{ l.number }}: {{ l.name }}</a>
        }
        <a class="btn" routerLink="/settings">Settings</a>
      </nav>
    </main>
  `,
})
export class MenuPage {
  protected readonly levels = LEVELS;
}
