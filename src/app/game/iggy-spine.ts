import Phaser from 'phaser';
import type { SpineGameObject } from '@esotericsoftware/spine-phaser-v4';

/**
 * Iggy as Spine skeletons cut from his concept sheets, one per suit (art-src/spine/iggy/iggy.spine, exported to
 * public/spine/iggy/). An art test: the scene still moves Iggy exactly as before and still draws the old robot; when the
 * "Use the new Iggy" setting is on and he is doing something these skeletons have an animation for, the skeleton for his
 * current suit is shown in the robot's place instead.
 */
/** file names by suit index (SUITS in art.ts): Rusty Original, Patchwork, Steel Sentinel, Night Guardian, Gold Circuit */
const SUIT_FILES = ['iggy', 'iggy-patchwork', 'iggy-steel', 'iggy-night', 'iggy-gold'];
const key = (file: string) => `spine-${file}`;
/** gun pictures by gun level (from Iggy's arsenal sheet) */
const GUNS = ['', 'gun-blaster', 'gun-twin', 'gun-spread', 'gun-rocket'];
/** skeleton units (sheet pixels) to game pixels at the robot's usual 1.15 scale: about the same height as the drawn Iggy */
const SCALE = 0.1 / 1.15;
/** the drawn robot flips around a point this far above his feet (scaled); the skeleton turns around the same point */
const SPIN_Y = 30 * 1.15;
const MIX = 0.1;

export function preloadIggySpine(scene: Phaser.Scene) {
  for (const f of SUIT_FILES) {
    scene.load.spineJson(`${key(f)}-data`, `spine/iggy/${f}.json`);
    scene.load.spineAtlas(`${key(f)}-atlas`, `spine/iggy/${f}.atlas`);
  }
}

export interface IggyState {
  suit: number; // index into SUITS
  x: number; // feet
  y: number;
  scaleX: number; // the robot's own scale (facing and squash and stretch included)
  scaleY: number;
  spin: number; // radians, the double-jump flip
  alpha: number;
  onGround: boolean;
  vx: number;
  vy: number;
  duck: number; // 0..1
  /** hanging from a roof edge: -1 = not hanging, 0 = just hanging, 0..1 = how far through climbing up */
  climb: number;
  hanging: boolean;
  /** the gun he holds: 0 none, 1 Blaster, 2 Twin blaster, 3 Spread gun, 4 Rocket launcher (the near arm aims it; both hands are
   *  needed to hang, so it is put away then) */
  gun: number;
}

export class IggySpine {
  private shown = -1;
  /** the gun picture each skeleton is showing ('' = none) */
  private held = new Map<SpineGameObject, string>();
  private constructor(private readonly suits: (SpineGameObject | undefined)[]) {}

  /** One skeleton per suit; a suit whose files didn't load is left out (the drawn robot stands in for it). */
  static create(scene: Phaser.Scene, depth: number): IggySpine | undefined {
    if (!('spine' in scene.add)) return undefined;
    const suits = SUIT_FILES.map((f) => {
      const data = `${key(f)}-data`, atlas = `${key(f)}-atlas`;
      if (!scene.cache.json.exists(data) || !scene.cache.text.exists(atlas)) return undefined;
      try {
        const s = scene.add.spine(0, 0, data, atlas).setDepth(depth).setVisible(false);
        s.animationStateData.defaultMix = MIX;
        s.animationState.setAnimation(0, 'idle', true);
        return s;
      } catch (err) {
        console.warn(`Iggy: the ${f} skeleton failed, using the drawn robot for that suit.`, err);
        return undefined;
      }
    });
    return suits.some(Boolean) ? new IggySpine(suits) : undefined;
  }

  /** Whether there is a skeleton for this suit. */
  has(suit: number) {
    return !!this.suits[suit];
  }

  hide() {
    for (const s of this.suits) s?.setVisible(false);
    this.shown = -1;
  }

  show(p: IggyState) {
    const s = this.suits[p.suit];
    if (!s) return this.hide();
    if (this.shown !== p.suit) {
      this.suits.forEach((o, i) => o?.setVisible(i === p.suit));
      this.shown = p.suit;
    }
    const climbing = p.hanging && p.climb >= 0;
    const anim = climbing ? 'climb' : p.hanging ? 'hang' : p.duck > 0.5 ? 'duck' : !p.onGround ? (p.vy < 0 ? 'jump' : 'fall') : Math.abs(p.vx) > 25 ? 'run' : 'idle';
    let cur = s.animationState.getTrack(0);
    if (cur?.animation?.name !== anim) cur = s.animationState.setAnimation(0, anim, !climbing);
    // the run is one full stride a second, and the drawn Iggy takes one stride every 70 pixels: keep the feet in step with the ground
    s.animationState.timeScale = anim === 'run' ? Math.abs(p.vx) / 70 : 1;
    if (climbing && cur?.animation) {
      // the climb follows the game's climb exactly (its hands stay on the roof while the game lifts him)
      cur.timeScale = 0;
      cur.trackTime = Math.min(1, p.climb) * cur.animation.duration;
    }
    // the gun: the aim animation on track 1 holds the near arm out over whatever else he's doing
    const gun = p.hanging ? '' : GUNS[p.gun] ?? '', was = this.held.get(s) ?? '';
    if (gun !== was) {
      if (gun && !was) s.animationState.setAnimation(1, 'aim', true);
      if (!gun) s.animationState.setEmptyAnimation(1, MIX);
      s.skeleton.setAttachment('gun', gun || null);
      this.held.set(s, gun);
    }
    // turn around the robot's flip point, not the feet. The robot spins inside its own (flipped) drawing, so facing left
    // reverses the turn on screen; this object's rotation comes after its flip, so match that by hand
    const rot = p.spin * Math.sign(p.scaleX || 1), c = Math.cos(rot), sn = Math.sin(rot);
    s.setPosition(p.x - sn * SPIN_Y, p.y - SPIN_Y + c * SPIN_Y);
    s.setRotation(rot);
    s.setScale(p.scaleX * SCALE, p.scaleY * SCALE);
    s.setAlpha(p.alpha);
  }
}
