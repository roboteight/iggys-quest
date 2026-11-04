import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  // Injected so saved settings (e.g. high contrast) apply on every page from startup.
  private readonly settings = inject(SettingsService);
}
