import Phaser from 'phaser';
import type { SpineGameObject } from '@esotericsoftware/spine-phaser-v4';

/**
 * The Reclaimer, the final boss, as a Spine rig (art-src/spine/reclaimer, exported to public/spine/reclaimer). The fight
 * itself lives in play.scene.ts (the Reclaimer section); this only shows the machine and plays its animations:
 * idle, windup, slam, stuck, roar, slump (overheated), intake, crawl (phase 3) and die.
 */
const DATA = 'reclaimer-data', ATLAS = 'reclaimer-atlas';
/** skeleton units (sheet pixels) to game pixels */
export const RECLAIMER_SCALE = 0.7;

export function preloadReclaimer(scene: Phaser.Scene) {
  scene.load.spineJson(DATA, 'spine/reclaimer/reclaimer.json');
  scene.load.spineAtlas(ATLAS, 'spine/reclaimer/reclaimer.atlas');
  scene.load.image('reclaimer-ball', 'foes/reclaimer-ball.png');
}

export class ReclaimerRig {
  private current = '';
  private constructor(readonly spine: SpineGameObject) {}

  static create(scene: Phaser.Scene, x: number, y: number, depth: number): ReclaimerRig | undefined {
    if (!scene.cache.json.exists(DATA) || !scene.cache.text.exists(ATLAS) || !('spine' in scene.add)) return undefined;
    try {
      const s = scene.add.spine(x, y, DATA, ATLAS).setDepth(depth).setScale(RECLAIMER_SCALE);
      s.animationStateData.defaultMix = 0.15;
      const rig = new ReclaimerRig(s);
      rig.play('idle', true);
      return rig;
    } catch (err) {
      console.warn('The Reclaimer: Spine skeleton failed.', err);
      return undefined;
    }
  }

  /** Play an animation unless it is already playing. */
  play(name: string, loop: boolean, speed = 1) {
    if (this.current !== name) {
      this.spine.animationState.setAnimation(0, name, loop);
      this.current = name;
    }
    this.spine.animationState.timeScale = speed;
  }

  get playing() {
    return this.current;
  }
}
