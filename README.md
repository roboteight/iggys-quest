# Iggy’s Quest

Angular 22 (menus, settings, routing) + Phaser 4 (gameplay canvas).

- `npm start` – dev server · `npm run build` – production build
- `src/app/pages/` – menu, settings, play (Angular, real HTML for accessibility)
- `src/app/settings.service.ts` – signal-based settings, saved to localStorage
- `src/app/game/` – Phaser scene and `createGame()`; lazy-loaded when you open Play
- Phaser → Angular: `game.events.emit('complete')`. Angular → Phaser: `game.registry.get('settings')`, `scene.pause/resume`.

- Levels live in `src/app/game/levels.ts` (id, name, art style, music theme); the menu links to `/play/:level`. Level art is drawn with code in `src/app/game/art.ts`, music in `music.ts`.
