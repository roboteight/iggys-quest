import Phaser from 'phaser';
import { SpinePlugin } from '@esotericsoftware/spine-phaser-v4';
import { PlayScene, TouchInput } from './play.scene';
import { Settings } from '../settings.service';

/**
 * Events the game emits for Angular:
 *  'hud' (HudState) – score, lives, suit, power-ups
 *  'announce' (string) – for the screen-reader live region
 *  'gameover' (GameOverState)
 */
export function createGame(parent: HTMLElement, settings: Settings, touch: TouchInput, levelId: string, seed: number | null = null, mode = 'story', ghost: number[] | null = null, startRings = 0): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: '#05070d',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1500 }, debug: false } },
    scene: [PlayScene],
    // Spine skeletons (Enforcer Nine so far): adds this.load.spineJson/spineAtlas and this.add.spine to every scene
    plugins: { scene: [{ key: 'spine.SpinePlugin', plugin: SpinePlugin, mapping: 'spine' }] },
    callbacks: {
      preBoot: (g) => {
        g.registry.set('settings', settings);
        g.registry.set('touch', touch);
        g.registry.set('level', levelId);
        g.registry.set('seed', seed);
        g.registry.set('mode', mode);
        g.registry.set('ghost', ghost);
        g.registry.set('startRings', startRings); // story mode: the suit he finished the last level in
        g.registry.set('music', { on: settings.musicOn, volume: settings.musicVolume });
      },
    },
  });
}
