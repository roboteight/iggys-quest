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
/** game pixels to draw him below his feet, so the far boot (drawn higher, further back) stands on the ground line too */
const SINK = 3;

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
  /** how fast his feet run (usually his speed; on ice faster while he scrambles for grip, 0 while he glides) */
  footSpeed: number;
  /** scrambling on ice: his body wobbles too */
  scramble: boolean;
  duck: number; // 0..1
  /** hanging from a roof edge: -1 = not hanging, 0 = just hanging, 0..1 = how far through climbing up */
  climb: number;
  hanging: boolean;
  /** just caught a ledge: 1 → 0, how hard his feet kick and scrabble at the wall for a grip */
  kick?: number;
  /** curled up in the double jump */
  tuck: boolean;
  /** the Steel Sentinel's dash and the Night Guardian's ground pound */
  dash: boolean;
  pound: boolean;
  /** the gun he holds: 0 none, 1 Blaster, 2 Twin blaster, 3 Spread gun, 4 Rocket launcher (the near arm aims it; both hands are
   *  needed to hang, so it is put away then) */
  gun: number;
  /** 1 the moment he fires, easing back to 0 (the recoil) */
  fire: number;
  /** let him fidget (check his watch, jumping jacks, a stretch with squats, tap his foot, pose with his gun) when he's left standing; off with reduced motion */
  fidget?: boolean;
  /** his loose, springy body (lean, head lag, arm swing, breathing); off with reduced motion */
  sway?: boolean;
}

/** waiting fidgets: the first comes after he has stood still this long (seconds), then one every FIDGET_EVERY */
const FIDGET_AFTER = 4;
const FIDGET_EVERY = 6;
/** picked at random (never the same twice running); he holsters his gun for them, except for his secret-agent poses ('spy'),
 *  which need it (with a gun out they come up half the time). The foot tap needs a suit with ankles. */
const FIDGETS = ['watch', 'jacks', 'stretch', 'tap', 'helmet'];
const GUN_FIDGET = 'spy';
/** the same, with no gun to hand */
const AGENT_FIDGET = 'agent';

/** how fast his feet kick while he scrambles for a grip on a ledge (radians a second: a little over two kicks a second) */
const KICK_RATE = 15;
/** at the top of a jump his body tilts forward this far (degrees), easing in below this vertical speed (pixels a second) */
const APEX_TILT = 10;
const APEX_SPEED = 260;
/** and his whole body pitches forward this far (degrees) with it */
const APEX_PITCH = 6;

export class IggySpine {
  private shown = -1;
  /** the gun picture each skeleton is showing ('' = none) */
  private held = new Map<SpineGameObject, string>();
  /** whether each skeleton's near arm is aiming (the aim animation on track 1) */
  private aimed = new Map<SpineGameObject, string>();
  private lastFire = 0;
  private current = ''; // the animation playing on track 0
  /** the scrabble on a fresh ledge hang (IggyState.kick), laid over the hang pose's legs */
  private kick = 0;
  /** how long he has stood idle, the fidget playing (if any) and which one comes next */
  private still = 0;
  private fidgeting = '';
  private lastFidget = '';
  /** the loose, springy body (see sway()): the extra lean of his torso (degrees) and the lag of his head and arms, with their
   *  speeds, and last frame's velocity and footing */
  private lean = 0;
  private leanV = 0;
  private nod = 0;
  private nodV = 0;
  private swing = 0;
  private swingV = 0;
  private lastVx = 0;
  private lastVy = 0;
  private wasGrounded = true;
  private aiming = false;
  /** how far he tilts forward at the top of a jump (degrees, 0 on the ground) */
  private apex = 0;
  private constructor(private readonly suits: (SpineGameObject | undefined)[]) {
    for (const s of suits) {
      if (!s) continue;
      const legs = ['thighL', 'shinL', 'thighR', 'shinR'].map((n) => s.skeleton.findBone(n));
      const [torso, belly, head, armL, armR, foreL, foreR] = ['torso', 'belly', 'head', 'upperArmL', 'upperArmR', 'foreArmL', 'foreArmR'].map((n) => s.skeleton.findBone(n));
      // after the animation has posed him, before his bones are placed: lay the springy body over the pose (see sway()), and
      // kick the legs, the two out of step (a scramble)
      s.beforeUpdateWorldTransforms = () => {
        // (a suit with a waist bends there: half the lean at the abdomen, half at the chest on top)
        const lean = this.lean + this.apex;
        if (belly) belly.pose.rotation += lean * 0.5;
        if (torso) torso.pose.rotation += belly ? lean * 0.5 : lean;
        if (head) head.pose.rotation += this.nod;
        // the arms hang from his shoulders: they lag the lean and swing back (not the near arm while it aims the gun)
        if (armL && !this.aiming) armL.pose.rotation += this.swing;
        if (armR) armR.pose.rotation += this.swing * 0.8;
        if (foreL && !this.aiming) foreL.pose.rotation += this.swing * 0.4;
        if (foreR) foreR.pose.rotation += this.swing * 0.35;
        if (this.kick <= 0) return;
        const a = (performance.now() / 1000) * KICK_RATE;
        const [thL, shL, thR, shR] = legs;
        if (thL) thL.pose.rotation += this.kick * 22 * Math.sin(a);
        if (shL) shL.pose.rotation += this.kick * 26 * Math.sin(a - 1.1);
        if (thR) thR.pose.rotation += this.kick * 22 * Math.sin(a + Math.PI);
        if (shR) shR.pose.rotation += this.kick * 26 * Math.sin(a + Math.PI - 1.1);
      };
    }
  }

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

  /** Standing idle for a while, he gets impatient: now and then a fidget plays (once) in place of the idle. Anything else he
   *  does, firing included, cuts it short and starts the wait again. */
  private waiting(s: SpineGameObject, p: IggyState, anim: string): string {
    if (anim !== 'idle' || p.fidget === false || p.fire > 0) {
      this.still = 0;
      this.fidgeting = '';
      return anim;
    }
    if (this.fidgeting) {
      const cur = s.animationState.getTrack(0);
      if (cur?.animation?.name === this.fidgeting && !cur.isComplete()) return this.fidgeting;
      this.fidgeting = '';
      this.still = FIDGET_AFTER - FIDGET_EVERY; // the next one after another FIDGET_EVERY seconds
    }
    this.still += Math.min(0.1, s.scene.game.loop.delta / 1000);
    if (this.still < FIDGET_AFTER) return anim;
    const ok = (f: string) => f !== this.lastFidget && !!s.skeleton.data.findAnimation(f) && (f !== 'tap' || !!s.skeleton.findBone('footR'));
    const choices = FIDGETS.filter(ok);
    // secret-agent poses half the time: with the gun if he has one, unarmed if not
    const agent = p.gun > 0 ? GUN_FIDGET : AGENT_FIDGET;
    const spy = ok(agent) && (Math.random() < 0.5 || !choices.length);
    if (!spy && !choices.length) return anim; // (older exported data without the fidgets)
    const next = spy ? agent : choices[Math.floor(Math.random() * choices.length)];
    this.fidgeting = this.lastFidget = next;
    return next;
  }

  /** His body moves loosely on top of the animation, a damped spring at each joint: his torso leans into a change of speed
   *  (forward as he sets off, back as he brakes) and sways back past upright before settling, bends forward as he lands and
   *  jolts back as he jumps; his head lags his torso and catches up with a little nod, and his arms hang a beat behind. Standing,
   *  he breathes. Off with reduced motion and while he hangs from a ledge. */
  private sway(s: SpineGameObject, p: IggyState) {
    const dt = Math.min(0.05, Math.max(0.001, s.scene.game.loop.delta / 1000));
    const facing = Math.sign(p.scaleX || 1);
    const ax = ((p.vx - this.lastVx) / dt) * facing; // forward acceleration
    const landed = p.onGround && !this.wasGrounded, jumped = !p.onGround && this.wasGrounded && p.vy < -50;
    const hitV = this.lastVy;
    this.lastVx = p.vx;
    this.lastVy = p.vy;
    this.wasGrounded = p.onGround;
    if (p.sway === false || p.hanging) {
      this.lean = this.leanV = this.nod = this.nodV = this.swing = this.swingV = 0;
      return;
    }
    // (a negative turn tips him forward, as he faces)
    const breathe = p.onGround && Math.abs(p.vx) < 20 ? Math.sin(performance.now() / 1000 * 1.7) * 1.2 : 0;
    const target = Math.max(-12, Math.min(12, -ax * 0.009)) + breathe;
    if (landed) this.leanV -= Math.min(700, Math.max(0, hitV)) * 0.22; // bends forward under the landing
    if (jumped) this.leanV += 70; // and the take-off throws him back
    const leanA = 140 * (target - this.lean) - 10 * this.leanV; // a little under critical damping: one overshoot
    this.leanV += leanA * dt;
    this.lean += this.leanV * dt;
    // the head is pushed the other way by the torso's turn and springs back faster
    const nodA = 220 * (0 - this.nod) - 12 * this.nodV - leanA * 0.8;
    this.nodV += nodA * dt;
    this.nod = Math.max(-14, Math.min(14, this.nod + this.nodV * dt));
    // the arms: slower and looser, swinging back as he sets off and forward as he stops
    const swingA = 70 * (0 - this.swing) - 6 * this.swingV - leanA * 1.3;
    this.swingV += swingA * dt;
    this.swing = Math.max(-25, Math.min(25, this.swing + this.swingV * dt));
  }

  show(p: IggyState) {
    const s = this.suits[p.suit];
    if (!s) return this.hide();
    if (this.shown !== p.suit) {
      this.suits.forEach((o, i) => o?.setVisible(i === p.suit));
      this.shown = p.suit;
    }
    this.sway(s, p);
    // at the top of a jump he tilts in: the slower he rises or falls, the further (a negative turn tips him forward)
    const plainJump = !p.onGround && !p.tuck && !p.hanging && !p.dash && !p.pound;
    this.apex = plainJump ? -APEX_TILT * Math.max(0, 1 - Math.abs(p.vy) / APEX_SPEED) : 0;
    const climbing = p.hanging && p.climb >= 0;
    this.kick = p.hanging && !climbing ? (p.kick ?? 0) : 0;
    // (at sprint speed, the high-kneed sprint; the switch has a little give so it doesn't flicker at the edge)
    const sprinting = p.footSpeed > (this.current === 'sprint' ? 280 : 295) && !p.scramble;
    let anim = climbing ? 'climb' : p.hanging ? 'hang' : p.dash ? 'dash' : p.pound ? 'pound' : p.tuck ? 'tuck' : p.duck > 0.5 ? (p.footSpeed > 20 ? 'crawl' : 'duck') : !p.onGround ? (p.vy < 0 ? 'jump' : 'fall') : sprinting ? 'sprint' : p.footSpeed > 25 ? 'run' : 'idle';
    anim = this.waiting(s, p, anim);
    this.current = anim;
    let cur = s.animationState.getTrack(0);
    if (cur?.animation?.name !== anim) cur = s.animationState.setAnimation(0, anim, !climbing && !this.fidgeting);
    // the run is one full stride a second, and the drawn Iggy takes one stride every 70 pixels: keep the feet in step with the ground
    s.animationState.timeScale = anim === 'run' ? p.footSpeed / 70 : anim === 'sprint' ? p.footSpeed / 92 : anim === 'crawl' ? p.footSpeed / 45 : 1; // (a sprint stride covers more ground, a crawl's much less)
    if (climbing && cur?.animation) {
      // the climb follows the game's climb exactly (its hands stay on the roof while the game lifts him)
      cur.timeScale = 0;
      cur.trackTime = Math.min(1, p.climb) * cur.animation.duration;
    }
    // the gun: the aim animation on track 1 holds the near arm out over whatever else he's doing (put away while hanging or fidgeting)
    // (his secret-agent poses keep the gun in hand but move the arm themselves, so the aim stands down for them)
    const posing = this.fidgeting === GUN_FIDGET;
    const gun = p.hanging || (this.fidgeting && !posing) ? '' : GUNS[p.gun] ?? '', aim = gun && !posing ? gun : '';
    this.aiming = !!aim;
    const was = this.held.get(s) ?? '', wasAim = this.aimed.get(s) ?? '';
    if (gun !== was) {
      s.skeleton.setAttachment('gun', gun || null);
      this.held.set(s, gun);
    }
    if (!!aim !== !!wasAim) {
      if (aim) s.animationState.setAnimation(1, 'aim', true);
      else s.animationState.setEmptyAnimation(1, MIX);
    }
    this.aimed.set(s, aim);
    // each shot: a quick kick of the arm, then back to aiming
    if (aim && p.fire > 0.9 && this.lastFire <= 0.9) {
      s.animationState.setAnimation(1, 'shoot', false);
      s.animationState.addAnimation(1, 'aim', true, 0);
    }
    this.lastFire = p.fire;
    // turn around the robot's flip point, not the feet. The robot spins inside its own (flipped) drawing, so facing left
    // reverses the turn on screen; this object's rotation comes after its flip, so match that by hand
    // (plus the pitch forward at the top of a jump: on screen, clockwise when he faces right)
    const pitch = (this.apex / APEX_TILT) * -APEX_PITCH * (Math.PI / 180);
    const rot = (p.spin + pitch) * Math.sign(p.scaleX || 1), c = Math.cos(rot), sn = Math.sin(rot);
    s.setPosition(p.x - sn * SPIN_Y, p.y + SINK * (p.scaleY || 1) / 1.15 - SPIN_Y + c * SPIN_Y);
    // scrambling on ice: a quick wobble as his feet fight for grip
    s.setRotation(rot + (p.scramble ? Math.sin(performance.now() / 45) * 0.07 : 0));
    s.setScale(p.scaleX * SCALE, p.scaleY * SCALE);
    s.setAlpha(p.alpha);
  }
}
