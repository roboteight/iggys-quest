import Phaser from 'phaser';
import type { SpineGameObject } from '@esotericsoftware/spine-phaser-v4';
import type { LevelStyle } from './levels';

/**
 * Bosses drawn as Spine rigs cut from their concept sheets (art-src/spine/<boss>, exported to public/spine/<boss>/).
 *
 * The shared boss logic in play.scene.ts still drives an ordinary (now hidden) image: its position, facing, shudder, squash,
 * fade and texture key say what the boss is doing. Each frame this mirrors that onto the skeleton and picks the matching
 * animation (walk frames -> walk, the charge pose -> charge, anything else -> idle), so the fight plays exactly as before and
 * only the look changes. If a boss's Spine files don't load, its image stays visible.
 */
interface RigDef {
  /** file name under public/spine/<file>/<file>.json|.atlas */
  file: string;
  /** sheet pixels to game pixels */
  scale: number;
  /** the image's origin sits this far (game px) above the skeleton's root, which is at its feet */
  footDrop: number;
  /** the sheet draws it facing right (the image faces left unless flipped) */
  facesRight: boolean;
  /** the image's walk ran this many frames a second over 8 frames; the Spine walk is paced to match */
  speed: number;
  /** shifts the skeleton right of the image (game px): a boss bigger than the screen stands partly off it */
  dx?: number;
  /** the part of it that can be hit, from its middle (game px): half-width, and the top and bottom above the floor.
   *  Without this the hit box comes from the stand-in image the shared boss code uses. */
  hit?: { hw: number; top: number; bottom: number; dx?: number };
  /** draw it behind the floor (so the floor hides its lower part) instead of in front */
  behind?: boolean;
}
const RIGS: Partial<Record<LevelStyle, RigDef>> = {
  // the image sits on origin 0.95 of its 828-sheet-pixel crop; the skeleton's root is at the feet
  city: { file: 'enforcer', scale: 0.27, footDrop: 0.05 * 828 * 0.27, facesRight: true, speed: 9 / 8 },
  // levels 8 to 12 (tools/boss-cut.py + boss-spine.mjs). They face left like Iggy's enemies; footDrop sinks or lifts them.
  // the Icebreaker: twice the size of the others, with its own hit box over the hull
  ice: { file: 'icebreaker', scale: 0.58, footDrop: 8, facesRight: false, speed: 1, dx: 20, hit: { hw: 140, top: 230, bottom: 0, dx: 10 } },
  // the Dune Dredger: a little over twice the size of the others, drawn in front of the floor with the near corner of its
  // tracks (the sheet's lowest point, a three-quarter view) standing on the sand
  dunes: { file: 'dredger', scale: 0.62, footDrop: 0, facesRight: false, speed: 1, dx: 24, hit: { hw: 165, top: 255, bottom: 0, dx: 0 } },
  wind: { file: 'warden', scale: 0.27, footDrop: 2, facesRight: true, speed: 1 },
  // the Brass Kraken: twice the size of the others, rising out of the lock with its tentacles across the walkway
  locks: { file: 'kraken', scale: 0.56, footDrop: 84, facesRight: false, speed: 1, dx: -68, hit: { hw: 80, top: 200, bottom: 10, dx: -40 }, behind: true },
  // the Iron Albatross: twice the size too, hovering at the deck; its bridge (the weak point) hangs at Iggy's height
  sky: { file: 'albatross', scale: 0.6, footDrop: -10, facesRight: false, speed: 1, dx: -40, hit: { hw: 90, top: 150, bottom: 10, dx: -150 } },
  // levels 4 to 7: all drawn facing right (or front-on)
  drowned: { file: 'diver', scale: 0.21, footDrop: 0, facesRight: true, speed: 1 },
  void: { file: 'nwarden', scale: 0.21, footDrop: 0, facesRight: true, speed: 1 },
  spores: { file: 'spore', scale: 0.2, footDrop: 0, facesRight: true, speed: 1 },
  war: { file: 'marshal', scale: 0.26, footDrop: 0, facesRight: true, speed: 1 },
  // the Dust Scorpion (level 3): the sheet draws it facing right
  wastes: { file: 'scorpion', scale: 0.23, footDrop: 14, facesRight: true, speed: 1 }, // (its leg tips sit higher on the sheet than the claw it was measured from)
  hollow: { file: 'gloom', scale: 0.266, footDrop: 0, facesRight: true, speed: 9 / 8 / 1.1 },
};
const MIX = 0.15; // seconds to blend from one animation into the next
const key = (d: RigDef) => [`${d.file}-spine-data`, `${d.file}-spine-atlas`] as const;

export function preloadBossSpine(scene: Phaser.Scene, style: LevelStyle) {
  const d = RIGS[style];
  if (!d) return;
  const [data, atlas] = key(d);
  scene.load.spineJson(data, `spine/${d.file}/${d.file}.json`);
  scene.load.spineAtlas(atlas, `spine/${d.file}/${d.file}.atlas`);
}

export class BossSpine {
  private constructor(private readonly img: Phaser.GameObjects.Image, private readonly spine: SpineGameObject, private readonly def: RigDef) {}

  /** Puts the boss's skeleton over its image and hides the image. Returns undefined (and leaves the image alone) if there is no rig. */
  static attach(scene: Phaser.Scene, img: Phaser.GameObjects.Image, style: LevelStyle): BossSpine | undefined {
    const def = RIGS[style];
    if (!def) return undefined;
    const [data, atlas] = key(def);
    if (!scene.cache.json.exists(data) || !scene.cache.text.exists(atlas) || !('spine' in scene.add)) return undefined;
    try {
      const spine = scene.add.spine(img.x, img.y, data, atlas).setDepth(def.behind ? -1 : img.depth);
      spine.animationStateData.defaultMix = MIX;
      spine.animationState.setAnimation(0, 'idle', true);
      img.setVisible(false);
      const e = new BossSpine(img, spine, def);
      e.sync(1);
      return e;
    } catch (err) {
      console.warn(`Boss ${def.file}: Spine skeleton failed, using the drawn rig.`, err);
      return undefined;
    }
  }

  /** Copy the image's state onto the skeleton. `speed` scales the animation (the slower-enemies assist). */
  sync(speed: number) {
    const { img, spine, def } = this;
    if (!spine.active) return;
    const k = img.texture.key;
    const anim = /-w\d$/.test(k) ? 'walk' : k.endsWith('-b') ? 'charge' : 'idle';
    const cur = spine.animationState.getTrack(0);
    if (cur?.animation?.name !== anim) spine.animationState.setAnimation(0, anim, true);
    spine.animationState.timeScale = def.speed * speed;
    // the image faces left unless flipped
    const left = !img.flipX;
    spine.setPosition(img.x + (def.dx ?? 0), img.y + def.footDrop * img.scaleY);
    spine.setScale((left === def.facesRight ? -1 : 1) * def.scale * img.scaleX, def.scale * img.scaleY);
    spine.setAngle(img.angle);
    spine.setAlpha(img.alpha);
  }

  /** A short hot flash when it is hit (Spine tints can only darken, so it's a warm orange rather than white). */
  flash(scene: Phaser.Scene) {
    this.spine.setTint(0xffa070);
    scene.time.delayedCall(70, () => this.spine.active && this.spine.setTint(0xffffff));
  }

  /** The rig's own hit box, if it has one: { x0, x1, y0, y1 } in game px. */
  hitBox(): { x0: number; x1: number; y0: number; y1: number } | undefined {
    const h = this.def.hit;
    if (!h) return undefined;
    const x = this.img.x + (h.dx ?? (this.def.dx ?? 0) * 0.4); // (the Kraken's head sits left of its middle)
    return { x0: x - h.hw, x1: x + h.hw, y0: this.img.y - h.top, y1: this.img.y - h.bottom };
  }

  destroy() {
    this.spine.destroy();
  }
}
