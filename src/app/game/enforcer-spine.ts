import Phaser from 'phaser';
import type { SpineGameObject } from '@esotericsoftware/spine-phaser-v4';

/**
 * Enforcer Nine as a Spine skeleton (exported from art-src/spine/enforcer/enforcer.spine into public/spine/enforcer/).
 *
 * The boss logic in play.scene.ts still drives an ordinary (now hidden) image: its position, facing, shudder, squash, fade and
 * texture key say what the boss is doing. Each frame this mirrors that onto the Spine skeleton and picks the matching animation,
 * so the fight plays exactly as before and only the look changes. If the Spine files don't load, the image stays visible.
 */
const DATA = 'enf-spine-data', ATLAS = 'enf-spine-atlas';
const SCALE = 0.27; // sheet pixels to game pixels, as in enforcer-rig.ts
const FOOT_DROP = 0.05 * 828 * SCALE; // the image sits on origin 0.95 of its 828-sheet-pixel crop; the skeleton's root is at the feet
const SPEED = 9 / 8; // the image walk ran 8 frames at 9 a second; the Spine walk is 1 second long (idle is paced to match)
const MIX = 0.15; // seconds to blend from one animation into the next

export function preloadEnforcerSpine(scene: Phaser.Scene) {
  scene.load.spineJson(DATA, 'spine/enforcer/enforcer.json');
  scene.load.spineAtlas(ATLAS, 'spine/enforcer/enforcer.atlas');
}

export class EnforcerSpine {
  private constructor(private readonly img: Phaser.GameObjects.Image, private readonly spine: SpineGameObject) {}

  /** Puts the Spine Enforcer over the boss image and hides the image. Returns undefined (and leaves the image alone) if the files are missing. */
  static attach(scene: Phaser.Scene, img: Phaser.GameObjects.Image): EnforcerSpine | undefined {
    if (!scene.cache.json.exists(DATA) || !scene.cache.text.exists(ATLAS) || !('spine' in scene.add)) return undefined;
    try {
      const spine = scene.add.spine(img.x, img.y, DATA, ATLAS).setDepth(img.depth);
      spine.animationStateData.defaultMix = MIX;
      spine.animationState.setAnimation(0, 'idle', true);
      img.setVisible(false);
      const e = new EnforcerSpine(img, spine);
      e.sync(1);
      return e;
    } catch (err) {
      console.warn('Enforcer Nine: Spine skeleton failed, using the drawn rig.', err);
      return undefined;
    }
  }

  /** Copy the image's state onto the skeleton. `speed` scales the animation (the slower-enemies assist). */
  sync(speed: number) {
    const { img, spine } = this;
    if (!spine.active) return;
    const key = img.texture.key;
    const anim = /-w\d$/.test(key) ? 'walk' : key.endsWith('-b') ? 'charge' : 'idle';
    const cur = spine.animationState.getTrack(0);
    if (cur?.animation?.name !== anim) spine.animationState.setAnimation(0, anim, anim !== 'charge');
    spine.animationState.timeScale = SPEED * speed;
    // the image faces left unless flipped; the skeleton faces right
    spine.setPosition(img.x, img.y + FOOT_DROP * img.scaleY);
    spine.setScale((img.flipX ? 1 : -1) * SCALE * img.scaleX, SCALE * img.scaleY);
    spine.setAngle(img.angle);
    spine.setAlpha(img.alpha);
  }

  /** A short hot flash when he is hit (Spine tints can only darken, so it's a warm orange rather than white). */
  flash(scene: Phaser.Scene) {
    this.spine.setTint(0xffa070);
    scene.time.delayedCall(70, () => this.spine.active && this.spine.setTint(0xffffff));
  }

  destroy() {
    this.spine.destroy();
  }
}
