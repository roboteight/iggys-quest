import Phaser from 'phaser';
import { Settings } from '../settings.service';
import {
  H, SUITS, W, drawBuilding, drawHollowBuilding, drawRobot, makeFlakes, makeFog, makeHollowFog, makeHollowLayer, makeHollowSky,
  makeRain, makeSky, makeSkyline, makeSmallTextures, suitFor,
} from './art';
import { LEVEL_GOAL, LevelDef, levelById } from './levels';
import { Sfx } from './sfx';
import { Music } from './music';

/** What the Angular HUD shows. Emitted as game.events 'hud'. */
export interface HudState {
  level: string;
  goal: number;
  score: number;
  breadboards: number;
  lives: number;
  nextLifeIn: number; // breadboards until the next free life
  suit: string;
  nextSuit: string | null;
  nextSuitNeed: number;
  powerUps: { id: string; label: string; detail: string }[];
}
export interface GameOverState {
  level: string; // level id
  score: number;
  breadboards: number;
  distance: number;
  suit: string;
  best: number;
  newBest: boolean;
}
export interface TouchInput { left: boolean; right: boolean; jump: boolean; fire: boolean }

type PowerId = 'spring' | 'magnet' | 'shield' | 'turbo' | 'gun';
const GUN_NAMES = ['', 'Blaster', 'Twin blaster', 'Spread gun', 'Rocket launcher'];
const GUN_MAX = 4;
const GUN_AMMO = 30; // shots per gun pickup; ammo never times out, so players can save it
const GUN_AMMO_MAX = 99;
const POWER: Record<PowerId, { label: string; secs: number | null; tex: string; text: string }> = {
  spring: { label: 'Spring legs', secs: 12, tex: 'pu-spring', text: 'Spring legs! Jump much higher.' },
  magnet: { label: 'Magnet', secs: 12, tex: 'pu-magnet', text: 'Magnet! Breadboards fly to you.' },
  shield: { label: 'Shield', secs: null, tex: 'pu-shield', text: 'Shield! Blocks the next hit.' },
  turbo: { label: 'Overclock', secs: 10, tex: 'pu-turbo', text: 'Overclock! Faster running.' },
  gun: { label: 'Gun', secs: null, tex: 'pu-blaster', text: '' }, // power.gun holds the ammo count
};

interface Shot { s: Phaser.GameObjects.Image; vx: number; vy: number; kind: 'bolt' | 'rocket'; trail: number }
interface Building { x: number; top: number; w: number; gfx: Phaser.GameObjects.Graphics; zone: Phaser.GameObjects.Zone; collider: Phaser.Physics.Arcade.Collider }
interface Item { kind: 'bb' | 'pu' | 'pylon' | 'wall'; hp?: number; power?: PowerId; sprite: Phaser.GameObjects.Image; baseY: number; phase: number; taken?: boolean }

const RUN = 250;
const GRAVITY = 1500;
const JUMP = 620;
const SPRING_JUMP = 800;
const LIFE_EVERY = 100;
const MAX_LIVES = 9;
const BLASTER_BOLT_SPEED = 640;
const ROCKET_SPEED = 380;
const BEST_KEY = 'iggys-quest.best';
const OLD_BEST_KEY = 'side-scroller.best'; // project's old name: still read once so level 1's best score carries over

export class PlayScene extends Phaser.Scene {
  private settings!: Settings;
  private sfx!: Sfx;
  private music?: Music;
  private level!: LevelDef;
  private reduced = false;
  private hc = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'A' | 'D' | 'W' | 'X' | 'F', Phaser.Input.Keyboard.Key>;
  private touch!: TouchInput;

  private player!: Phaser.GameObjects.Zone;
  private body!: Phaser.Physics.Arcade.Body;
  private robot!: Phaser.GameObjects.Graphics;
  private buildings: Building[] = [];
  private items: Item[] = [];
  private nextX = 0;
  private lastTop = 400;
  private rand = Math.random;

  private layers: { sprite: Phaser.GameObjects.TileSprite; f: number }[] = [];
  private fog!: Phaser.GameObjects.TileSprite;
  private rain?: Phaser.GameObjects.TileSprite;
  private flash?: Phaser.GameObjects.Rectangle;
  private nextLightning = 0;

  private t = 0;
  private over = false;
  private breadboards = 0;
  private lives = 3;
  private suitIdx = 0;
  private maxX = 0;
  private invuln = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private wasGround = true;
  private prevVy = 0;
  private jumpHeld = false;
  private landSquash = 0;
  private stumble = 0;
  private dustTimer = 0;
  private stepTimer = 0;
  private stepAlt = false;
  private wallCoyote = 0;
  private wallDir = 0; // direction to kick off in: +1 = right (wall is on his left)
  private wallLock = 0;
  private shots: Shot[] = [];
  private gunLevel = 0; // 0 = no gun, 1..4 = Blaster, Twin blaster, Spread gun, Rocket launcher
  private fireCD = 0;
  private fireAnim = 0;
  private slowT = 0;
  private bonus = 0;
  private airJumps = 1; // extra jumps left in the air (double jump)
  private spinT = 0; // seconds left of the double-jump flip
  private partTimer = 2;
  private tripTimer = 6;
  private facing = 1;
  private power: Record<PowerId, number> = { spring: 0, magnet: 0, shield: 0, turbo: 0, gun: 0 };
  private lastSafe = { x: 100, top: 400 };
  private hudTimer = 0;
  private lastHud = '';

  constructor() {
    super('play');
  }

  create() {
    this.settings = this.registry.get('settings') as Settings;
    this.touch = (this.registry.get('touch') as TouchInput | undefined) ?? { left: false, right: false, jump: false, fire: false };
    this.reduced = this.settings.reducedMotion;
    this.hc = this.settings.highContrast;
    this.level = levelById(this.registry.get('level') as string | undefined);
    this.sfx = new Sfx(this.settings.volume);

    // 8-bit background music. The Angular page changes it live through the 'music' registry entry.
    const m = this.registry.get('music') as { on: boolean; volume: number } | undefined;
    const musicVol = () => {
      const cur = this.registry.get('music') as { on: boolean; volume: number } | undefined;
      return cur && cur.on ? cur.volume : 0;
    };
    this.music = new Music(m && m.on ? m.volume : 0, this.level.music);
    this.music.start();
    const onMusic = () => this.music?.setVolume(musicVol());
    this.registry.events.on('changedata-music', onMusic);
    const onPause = () => this.music?.pause();
    const onResume = () => this.music?.resume();
    this.events.on('pause', onPause);
    this.events.on('resume', onResume);
    this.events.once('shutdown', () => {
      this.registry.events.off('changedata-music', onMusic);
      this.events.off('pause', onPause);
      this.events.off('resume', onResume);
      this.music?.stop();
      this.music = undefined;
    });

    // reset state (scene.restart re-runs create)
    this.buildings = [];
    this.items = [];
    this.layers = [];
    this.t = 0;
    this.over = false;
    this.breadboards = 0;
    this.lives = 3;
    this.suitIdx = 0;
    this.maxX = 0;
    this.invuln = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.wasGround = true;
    this.prevVy = 0;
    this.landSquash = 0;
    this.airJumps = 1;
    this.spinT = 0;
    this.shots = [];
    this.fireCD = 0;
    this.fireAnim = 0;
    this.slowT = 0;
    this.bonus = 0;
    this.stumble = 0;
    this.power = { spring: 0, magnet: 0, shield: 0, turbo: 0, gun: 0 };
    this.gunLevel = 0;
    this.lastHud = '';
    this.nextLightning = 10 + Math.random() * 10;

    this.buildBackdrop();

    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.setBounds(-100000, -2000, 10000000, 5000);

    this.player = this.add.zone(110, 340, 22, 46);
    this.physics.add.existing(this.player);
    this.body = this.player.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(22, 46);
    this.robot = this.add.graphics().setDepth(10);

    // first rooftop is long and flat so Iggy can get his bearings
    this.nextX = -300;
    this.lastTop = 400;
    this.addBuilding(this.nextX, 400, 1000);
    this.nextX += 1000;
    this.generate();

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys('A,D,W,X,F') as typeof this.keys;

    this.cameras.main.setBackgroundColor(this.level.bg);
    this.cameras.main.scrollX = -20;
    this.emitHud(true);
    this.banner(`Level ${this.level.number}: ${this.level.name}`);
    this.announce(`Level ${this.level.number}: ${this.level.name}. ${this.level.blurb}`);
  }

  // ------------------------------------------------------------------ backdrop
  private buildBackdrop() {
    if (!this.textures.exists('dust')) makeSmallTextures(this);
    const hollow = this.level.style === 'hollow';
    let sky: string, layers: [string, number][], fogKey: string, precipKey: string;
    if (hollow) {
      if (!this.textures.exists('h-sky')) {
        makeHollowSky(this);
        makeHollowFog(this);
        makeFlakes(this);
        makeHollowLayer(this, 'h-far', 'hills', 31, 0x1b1636, 0.9);
        makeHollowLayer(this, 'h-mid', 'trees', 57, 0x120e26, 0.6);
        makeHollowLayer(this, 'h-near', 'graves', 77, 0x0a0714, 0.3);
      }
      sky = 'h-sky';
      layers = [['h-far', 0.08], ['h-mid', 0.2], ['h-near', 0.38]];
      fogKey = 'h-fog';
      precipKey = 'h-flakes';
    } else {
      if (!this.textures.exists('sky')) {
        makeSky(this);
        makeFog(this);
        makeRain(this);
        makeSkyline(this, { key: 'sk-far', seed: 21, color: 0x182034, windowColor: 0xd7b25a, windowChance: 0.03, minW: 36, maxW: 80, minH: 200, maxH: 400, detail: 0.5, haze: 0.9 });
        makeSkyline(this, { key: 'sk-mid', seed: 5, color: 0x101725, windowColor: 0xf2c35a, windowChance: 0.07, minW: 50, maxW: 110, minH: 150, maxH: 340, detail: 0.6, haze: 0.6 });
        makeSkyline(this, { key: 'sk-near', seed: 99, color: 0x0a0f19, windowColor: 0xf2c35a, windowChance: 0.1, minW: 70, maxW: 150, minH: 90, maxH: 250, detail: 0.5, haze: 0.3 });
      }
      sky = 'sky';
      layers = [['sk-far', 0.08], ['sk-mid', 0.18], ['sk-near', 0.35]];
      fogKey = 'fog';
      precipKey = 'rain';
    }
    this.add.image(0, 0, sky).setOrigin(0).setScrollFactor(0).setDepth(-100);
    const a = this.hc ? 0.45 : 1;
    layers.forEach(([key, f], i) => {
      const s = this.add.tileSprite(0, 0, W, H, key).setOrigin(0).setScrollFactor(0).setDepth(-90 + i).setAlpha(a);
      this.layers.push({ sprite: s, f });
    });
    this.fog = this.add.tileSprite(0, H - 190, W, 120, fogKey).setOrigin(0).setScrollFactor(0).setDepth(-80).setAlpha(this.reduced ? 0.5 : 0.9);
    if (!this.reduced) {
      this.rain = this.add.tileSprite(0, 0, W, H, precipKey).setOrigin(0).setScrollFactor(0).setDepth(20);
      this.flash = this.add.rectangle(0, 0, W, H, 0xdde8ff, 0).setOrigin(0).setScrollFactor(0).setDepth(21);
    }
  }

  // ------------------------------------------------------------------ world generation
  private difficulty() {
    return Math.min(1, Math.max(0, this.maxX) / 12000);
  }

  private addBuilding(x: number, top: number, w: number) {
    const gfx = this.level.style === 'hollow' ? drawHollowBuilding(this, x, top, w, this.hc) : drawBuilding(this, x, top, w, this.hc);
    const zone = this.add.zone(x + w / 2, top + 300, w, 600);
    this.physics.add.existing(zone, true);
    const collider = this.physics.add.collider(this.player, zone);
    const b: Building = { x, top, w, gfx, zone, collider };
    this.buildings.push(b);
    return b;
  }

  private generate() {
    const lim = this.cameras.main.scrollX + W + 900;
    while (this.nextX < lim) {
      const d = this.difficulty();
      const rise = Phaser.Math.Between(-140, 70); // positive = lower
      let top = Phaser.Math.Clamp(this.lastTop + rise, 290, 450);
      const stepUp = Math.max(0, this.lastTop - top);
      if (stepUp > 75) top = this.lastTop - 75;
      const maxGap = 120 + d * 60 - stepUp * 0.9;
      const gap = Phaser.Math.Between(60, Math.max(70, Math.floor(maxGap)));
      const w = Phaser.Math.Between(170, 440 - Math.floor(d * 120));
      const x = this.nextX + gap;
      const prev = this.buildings[this.buildings.length - 1];
      const b = this.addBuilding(x, top, w);
      this.populate(b, prev, gap);
      this.nextX = x + w;
      this.lastTop = top;
    }
  }

  private populate(b: Building, prev: Building | undefined, gap: number) {
    const d = this.difficulty();
    // breadboards across the gap on a jump arc
    if (prev && this.rand() < 0.8) {
      const n = 3 + (this.rand() < 0.4 ? 1 : 0);
      const x0 = prev.x + prev.w - 4, x1 = b.x + 4;
      const peak = Math.min(prev.top, b.top) - 95;
      for (let i = 0; i < n; i++) {
        const u = (i + 1) / (n + 1);
        const y = Phaser.Math.Linear(prev.top - 30, b.top - 30, u) - Math.sin(u * Math.PI) * (prev.top - 30 - peak) * 0.55;
        this.addItem('bb', x0 + (x1 - x0) * u, y);
      }
    }
    // rooftop pylons
    const hazards: number[] = [];
    if (b.w > 240 && this.rand() < 0.25 + d * 0.5) {
      const px = b.x + Phaser.Math.Between(90, b.w - 90);
      hazards.push(px);
      this.addItem('pylon', px, b.top - 21);
    }
    // brick wall: Iggy can crash through it (slowed, not hurt), or shoot it down
    if (b.w > 260 && this.rand() < 0.22 + d * 0.25) {
      const wx = b.x + Phaser.Math.Between(110, b.w - 110);
      if (!hazards.some((h) => Math.abs(h - wx) < 90)) {
        hazards.push(wx);
        this.addItem('wall', wx, b.top - 32);
      }
    }
    // rooftop breadboards: a trail along the roof, sometimes higher
    if (this.rand() < 0.65) {
      const n = Phaser.Math.Between(2, 5);
      const start = b.x + Phaser.Math.Between(30, Math.max(31, b.w - n * 38 - 20));
      const high = this.rand() < 0.4;
      for (let i = 0; i < n; i++) {
        const x = start + i * 38;
        if (hazards.some((h) => Math.abs(h - x) < 40) && !high) continue;
        this.addItem('bb', x, b.top - (high ? 115 : 34));
      }
    }
    // power-ups
    if (this.maxX > 300 && this.rand() < 0.14) {
      const ids: PowerId[] = ['spring', 'magnet', 'shield', 'turbo', 'gun', 'gun'];
      const id = ids[Math.floor(this.rand() * ids.length)];
      this.addItem('pu', b.x + b.w / 2, b.top - 75, id);
    }
    void gap;
  }

  private addItem(kind: Item['kind'], x: number, y: number, power?: PowerId) {
    const tex = kind === 'bb' ? 'breadboard' : kind === 'pylon' ? 'pylon' : kind === 'wall' ? 'wall' : POWER[power!].tex;
    const sprite = this.add.image(x, y, tex).setDepth(kind === 'pylon' || kind === 'wall' ? 6 : 7);
    this.items.push({ kind, power, sprite, baseY: y, phase: Math.random() * 6, hp: kind === 'wall' ? 5 : undefined });
  }

  private cull() {
    const left = this.cameras.main.scrollX - 300;
    this.buildings = this.buildings.filter((b) => {
      if (b.x + b.w < left) {
        b.collider.destroy();
        b.gfx.destroy();
        b.zone.destroy();
        return false;
      }
      return true;
    });
    this.items = this.items.filter((it) => {
      if (it.taken || it.sprite.x < left) {
        it.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  // ------------------------------------------------------------------ effects
  private dust(x: number, y: number, count: number, spread: number, rise: number, scale = 1) {
    const n = this.reduced ? Math.ceil(count / 2) : count;
    for (let i = 0; i < n; i++) {
      const dir = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const img = this.add.image(x + dir * 6, y, 'dust').setDepth(11).setScale(0.3 * scale).setAlpha(this.hc ? 0.95 : 0.8);
      if (this.hc) img.setTint(0xffffff);
      this.tweens.add({
        targets: img,
        x: x + (this.reduced ? 0 : dir * spread + (Math.random() - 0.5) * 10),
        y: y - (this.reduced ? 0 : rise * (0.5 + Math.random() * 0.8)),
        scale: (0.7 + Math.random() * 0.5) * scale,
        alpha: 0,
        duration: 380 + Math.random() * 220,
        ease: 'Sine.easeOut',
        onComplete: () => img.destroy(),
      });
    }
  }

  private debris(x: number, y: number, tex: 'bolt' | 'cog' | 'spark' | 'brick', n: number, power = 1) {
    for (let i = 0; i < n; i++) {
      const img = this.add.image(x, y, tex).setDepth(12);
      const vx = (Math.random() - 0.5) * 140 * power, up = 40 + Math.random() * 90 * power;
      const dur = 700 + Math.random() * 400;
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: dur,
        onUpdate: (tw) => {
          const p = tw.getValue() ?? 0;
          const tt = (p * dur) / 1000;
          img.x = x + vx * tt;
          img.y = y - up * tt + 450 * tt * tt;
          if (!this.reduced) img.rotation = tt * 8 * (vx > 0 ? 1 : -1);
          img.setAlpha(1 - p * p);
        },
        onComplete: () => img.destroy(),
      });
    }
  }

  private banner(text: string) {
    const t = this.add.text(W / 2, 110, text, { fontFamily: 'system-ui, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#fff6c8', stroke: '#000', strokeThickness: 6, align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(40);
    this.tweens.add({ targets: t, alpha: 0, y: this.reduced ? 110 : 90, delay: 1800, duration: 700, onComplete: () => t.destroy() });
  }

  /** Current gun level (0 = none). */
  private gun(): number {
    return this.power.gun > 0 ? this.gunLevel : 0;
  }

  private shoot() {
    const lvl = this.gun();
    const f = this.facing;
    const x = this.body.center.x + f * 50, y = this.body.bottom - 36;
    const spawn = (kind: 'bolt' | 'rocket', angle: number, yOff: number) => {
      const speed = kind === 'rocket' ? ROCKET_SPEED : BLASTER_BOLT_SPEED;
      const vx = f * speed * Math.cos(angle), vy = speed * Math.sin(angle);
      const img = this.add.image(x, y + yOff, kind === 'rocket' ? 'rocket' : 'shot').setDepth(9);
      img.setRotation(Math.atan2(vy, vx));
      this.shots.push({ s: img, vx, vy, kind, trail: 0 });
    };
    if (lvl >= 4) {
      spawn('rocket', 0, 0);
      this.fireCD = 0.55;
      this.sfx.rocket();
    } else if (lvl === 3) {
      [-0.2, 0, 0.2].forEach((a) => spawn('bolt', a, 0));
      this.fireCD = 0.17;
      this.sfx.shoot();
    } else if (lvl === 2) {
      spawn('bolt', 0, -4);
      spawn('bolt', 0, 4);
      this.fireCD = 0.17;
      this.sfx.shoot();
    } else {
      spawn('bolt', 0, 0);
      this.fireCD = 0.2;
      this.sfx.shoot();
    }
    this.fireAnim = 1;
    this.debris(x, y, 'spark', this.reduced ? 1 : 3, 0.5);
    // ammo: rockets cost 2, everything else 1 per trigger pull
    this.power.gun -= lvl >= 4 ? 2 : 1;
    if (this.power.gun <= 0) {
      this.power.gun = 0;
      this.gunLevel = 0;
      this.announce('Out of ammo. The gun is gone.');
    }
    this.emitHud();
  }

  private updateShots(dt: number) {
    const cam = this.cameras.main;
    this.shots = this.shots.filter((sh) => {
      const s = sh.s;
      s.x += sh.vx * dt;
      s.y += sh.vy * dt;
      if (sh.kind === 'rocket' && !this.reduced) {
        sh.trail -= dt;
        if (sh.trail <= 0) {
          sh.trail = 0.04;
          this.dust(s.x - Math.sign(sh.vx) * 12, s.y, 1, 4, 6, 0.5);
        }
      }
      const hitIt = this.items.find((it) => !it.taken && (it.kind === 'pylon' || it.kind === 'wall') && Math.abs(s.x - it.sprite.x) < (it.kind === 'wall' ? 18 : 18) && Math.abs(s.y - it.sprite.y) < (it.kind === 'wall' ? 34 : 24));
      const hitBuilding = this.buildings.some((b) => s.x >= b.x && s.x <= b.x + b.w && s.y > b.top + 2);
      const off = s.x < cam.scrollX - 60 || s.x > cam.scrollX + W + 120 || s.y < -60 || s.y > H + 60;
      if (hitIt || hitBuilding) {
        if (sh.kind === 'rocket') this.explode(s.x, s.y);
        else if (hitIt) hitIt.kind === 'pylon' ? this.destroyPylon(hitIt) : this.damageWall(hitIt, 1);
        else this.debris(s.x, s.y, 'spark', 2, 0.4);
      }
      if (hitIt || hitBuilding || off) {
        s.destroy();
        return false;
      }
      return true;
    });
  }

  private destroyPylon(it: Item) {
    it.taken = true;
    this.bonus += 10;
    this.sfx.zap();
    this.debris(it.sprite.x, it.sprite.y, 'spark', this.reduced ? 3 : 10, 1.2);
    this.debris(it.sprite.x, it.sprite.y, 'bolt', 3, 1);
    this.dust(it.sprite.x, it.sprite.y + 18, 4, 20, 14);
  }

  private damageWall(it: Item, dmg: number) {
    it.hp = (it.hp ?? 1) - dmg;
    this.debris(it.sprite.x, it.sprite.y - 8 + Math.random() * 16, 'brick', 2, 0.7);
    this.sfx.zap();
    it.sprite.setTint(0xffffff);
    this.time.delayedCall(70, () => it.sprite.active && it.sprite.clearTint());
    if (it.hp <= 0) this.breakWall(it, true);
  }

  private breakWall(it: Item, award: boolean) {
    it.taken = true;
    if (award) this.bonus += 25;
    this.sfx.bricks();
    this.debris(it.sprite.x, it.sprite.y, 'brick', this.reduced ? 5 : 12, 1.4);
    this.dust(it.sprite.x, it.sprite.y + 28, 7, 36, 18, 1.3);
  }

  private explode(x: number, y: number) {
    this.sfx.boom();
    this.debris(x, y, 'spark', this.reduced ? 4 : 16, 1.8);
    this.dust(x, y + 10, 8, 50, 26, 1.6);
    if (!this.reduced) this.cameras.main.shake(140, 0.004);
    for (const it of this.items) {
      if (it.taken || (it.kind !== 'pylon' && it.kind !== 'wall')) continue;
      if (Math.hypot(it.sprite.x - x, it.sprite.y - y) < 85) {
        if (it.kind === 'pylon') this.destroyPylon(it);
        else this.breakWall(it, true);
      }
    }
  }

  /** Iggy runs into a brick wall: no damage, but he smashes through and loses his speed for a moment. */
  private crashWall(it: Item) {
    this.breakWall(it, false);
    this.slowT = 2.4;
    this.stumble = Math.max(this.stumble, 0.6);
    this.body.setVelocityX(this.body.velocity.x * 0.25);
    this.announce('Crashed through a brick wall. Slowed down for a moment.');
    this.emitHud(true);
  }

  private announce(text: string) {
    this.game.events.emit('announce', text);
  }

  // ------------------------------------------------------------------ gameplay events
  private collectBreadboard(it: Item) {
    it.taken = true;
    this.breadboards++;
    this.sfx.collect();
    this.debris(it.sprite.x, it.sprite.y, 'spark', this.reduced ? 2 : 5, 0.6);
    if (this.breadboards % LIFE_EVERY === 0) {
      if (this.lives < MAX_LIVES) this.lives++;
      this.sfx.suit();
      this.banner('Free life!');
      this.announce(`${this.breadboards} breadboards! Free life. You now have ${this.lives} lives.`);
      this.debris(this.body.center.x, this.body.center.y, 'spark', this.reduced ? 3 : 12, 1.2);
    }
    const idx = suitFor(this.breadboards);
    if (idx !== this.suitIdx) {
      this.suitIdx = idx;
      const s = SUITS[idx];
      this.sfx.suit();
      this.banner(`New suit: ${s.name}`);
      this.announce(`New suit unlocked: ${s.name}. ${s.blurb}`);
      this.dust(this.body.center.x, this.body.bottom, 8, 50, 40, 1.4);
      this.debris(this.body.center.x, this.body.center.y, 'cog', 6, 1.2);
      this.debris(this.body.center.x, this.body.center.y, 'bolt', 6, 1.2);
      if (this.flash && !this.reduced) {
        this.flash.setAlpha(0.18);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 400 });
      }
    }
    this.emitHud(true);
  }

  private collectPower(it: Item) {
    it.taken = true;
    const id = it.power!;
    const p = POWER[id];
    if (id === 'gun') {
      // a second gun while the first is still active upgrades it
      const active = this.power.gun > 0 && this.gunLevel > 0;
      const prev = this.gunLevel;
      this.gunLevel = active ? Math.min(GUN_MAX, prev + 1) : 1;
      this.power.gun = Math.min(GUN_AMMO_MAX, this.power.gun + GUN_AMMO);
      const name = GUN_NAMES[this.gunLevel];
      this.banner(active ? `Gun upgrade: ${name}` : name);
      this.announce(
        !active
          ? `${name} with ${this.power.gun} shots! Press X or F to shoot. Ammo doesn't run out over time, so you can save it. Grab another gun to upgrade this one.`
          : prev >= GUN_MAX
            ? `${name} ammo topped up to ${this.power.gun} shots.`
            : `Gun upgraded to ${name}, level ${this.gunLevel} of ${GUN_MAX}. ${this.power.gun} shots.`,
      );
      if (active && prev < GUN_MAX) this.sfx.suit();
      else this.sfx.power();
    } else {
      this.power[id] = p.secs ?? 1;
      this.sfx.power();
      this.banner(p.label);
      this.announce(p.text);
    }
    this.debris(it.sprite.x, it.sprite.y, 'spark', this.reduced ? 3 : 10, 1);
    this.emitHud(true);
  }

  private hit(reason: 'pylon' | 'fall') {
    if (this.over) return;
    if (reason === 'pylon') {
      if (this.invuln > 0) return;
      if (this.power.shield > 0) {
        this.power.shield = 0;
        this.invuln = 1;
        this.sfx.hurt();
        this.announce('Shield absorbed the zap and broke.');
        this.debris(this.body.center.x, this.body.center.y, 'spark', 10, 1.4);
        this.emitHud(true);
        return;
      }
    }
    this.lives--;
    this.sfx.hurt();
    this.stumble = 1;
    this.debris(this.body.center.x, this.body.center.y, 'bolt', 5, 1.4);
    this.debris(this.body.center.x, this.body.center.y, 'cog', 3, 1.2);
    this.debris(this.body.center.x, this.body.center.y, 'spark', this.reduced ? 3 : 8, 1.4);
    if (this.lives <= 0) {
      this.announce('Iggy is out of spare parts. Game over.');
      this.gameOver();
      return;
    }
    this.announce(reason === 'fall' ? `Iggy fell. ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left.` : `Zapped! ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left.`);
    this.invuln = 1.8;
    if (reason === 'fall') {
      const safe = this.lastSafe;
      this.body.reset(safe.x, safe.top - 30);
      this.items.forEach((it) => {
        if (it.kind === 'pylon' && Math.abs(it.sprite.x - safe.x) < 90) it.taken = true;
      });
      this.body.setVelocity(0, 0);
    } else {
      this.body.setVelocity(-this.facing * 280, -380);
    }
    this.emitHud(true);
  }

  private gameOver() {
    this.endRun(false);
  }

  /** The run is over: out of lives (won = false) or the score goal was reached (won = true). */
  private endRun(won: boolean) {
    this.over = true;
    this.music?.stop(1.2);
    this.music = undefined;
    if (won) {
      this.sfx.win();
      this.banner('Level complete!');
      this.announce(`Level complete! You reached ${LEVEL_GOAL} points.`);
    } else {
      this.sfx.over();
    }
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    const score = this.score();
    let best = 0;
    const bestKey = this.level.id === 'rooftops' ? BEST_KEY : `${BEST_KEY}.${this.level.id}`; // level 1 uses the plain key
    try { best = Number(localStorage.getItem(bestKey) ?? (this.level.id === 'rooftops' ? localStorage.getItem(OLD_BEST_KEY) : null) ?? 0) || 0; } catch { /* ignore */ }
    const newBest = score > best;
    if (newBest) {
      best = score;
      try { localStorage.setItem(bestKey, String(best)); } catch { /* ignore */ }
    }
    const state: GameOverState = { level: this.level.id, score, breadboards: this.breadboards, distance: Math.floor(this.maxX / 10), suit: SUITS[this.suitIdx].name, best, newBest };
    this.game.events.emit(won ? 'complete' : 'gameover', state);
  }

  private score() {
    return Math.floor(Math.max(0, this.maxX) / 10) + this.breadboards * 25 + this.bonus;
  }

  private emitHud(force = false) {
    const next = SUITS[this.suitIdx + 1];
    const state: HudState = {
      level: `Level ${this.level.number}: ${this.level.name}`,
      goal: LEVEL_GOAL,
      score: this.score(),
      breadboards: this.breadboards,
      lives: this.lives,
      nextLifeIn: LIFE_EVERY - (this.breadboards % LIFE_EVERY),
      suit: SUITS[this.suitIdx].name,
      nextSuit: next?.name ?? null,
      nextSuitNeed: next ? next.need - this.breadboards : 0,
      powerUps: [
        ...(Object.keys(this.power) as PowerId[])
          .filter((k) => this.power[k] > 0)
          .map((k) => ({
            id: k,
            label: k === 'gun' ? `${GUN_NAMES[this.gunLevel]} (level ${this.gunLevel} of ${GUN_MAX})` : POWER[k].label,
            detail: k === 'gun' ? `${Math.ceil(this.power.gun)} shots` : POWER[k].secs === null ? '' : `${Math.ceil(this.power[k])}s`,
          })),
        ...(this.slowT > 0 ? [{ id: 'slow', label: 'Slowed', detail: `${Math.ceil(this.slowT)}s` }] : []),
      ],
    };
    const key = JSON.stringify(state);
    if (force || key !== this.lastHud) {
      this.lastHud = key;
      this.game.events.emit('hud', state);
    }
  }

  // ------------------------------------------------------------------ loop
  override update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    const cam = this.cameras.main;
    const body = this.body;

    // -- input
    const left = this.cursors.left.isDown || this.keys.A.isDown || this.touch.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || this.touch.right;
    const jumpDown = this.cursors.space.isDown || this.cursors.up.isDown || this.keys.W.isDown || this.touch.jump;
    if (jumpDown && !this.jumpHeld) this.jumpBuffer = 0.12;
    if (!jumpDown && this.jumpHeld && body.velocity.y < -200) body.setVelocityY(body.velocity.y * 0.55); // short hop on early release
    this.jumpHeld = jumpDown;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    if (!this.over) {
      const ground = body.touching.down || body.blocked.down;
      this.coyote = ground ? 0.1 : Math.max(0, this.coyote - dt);
      if (ground) this.airJumps = 1;

      const speed = RUN * (this.power.turbo > 0 ? 1.35 : 1) * (this.slowT > 0 ? 0.45 : 1);
      const target = left === right ? 0 : left ? -speed : speed;
      if (target !== 0) this.facing = Math.sign(target);
      // wall contact: remember which side, with a little grace time after leaving it
      const wallL = !ground && body.touching.left, wallR = !ground && body.touching.right;
      if (wallL || wallR) {
        this.wallCoyote = 0.09;
        this.wallDir = wallL ? 1 : -1;
        // slide down the wall slowly so there is time to kick off
        if (body.velocity.y > 160) body.setVelocityY(160);
      } else {
        this.wallCoyote = Math.max(0, this.wallCoyote - dt);
      }
      this.wallLock = Math.max(0, this.wallLock - dt);
      if (this.wallLock <= 0) {
        const k = Math.min(1, dt * (ground ? 14 : 7));
        body.setVelocityX(body.velocity.x + (target - body.velocity.x) * k);
      }

      // wall jump: kick off the side of a building (works in the gaps between them)
      if (this.jumpBuffer > 0 && this.coyote <= 0 && this.wallCoyote > 0) {
        const v = this.power.spring > 0 ? SPRING_JUMP : JUMP;
        body.setVelocity(this.wallDir * RUN * 1.05, -v * 0.95);
        this.facing = this.wallDir;
        this.wallLock = 0.2;
        this.airJumps = 1; // a wall kick refills the double jump
        this.wallCoyote = 0;
        this.jumpBuffer = 0;
        this.sfx.jump(SUITS[this.suitIdx].loose);
        this.dust(body.center.x - this.wallDir * 11, body.center.y + 10, 4, 18, 10);
        this.debris(body.center.x - this.wallDir * 11, body.center.y, 'spark', this.reduced ? 1 : 4, 0.6);
      }

      // jump
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        const v = this.power.spring > 0 ? SPRING_JUMP : JUMP;
        body.setVelocityY(-v);
        this.jumpBuffer = 0;
        this.coyote = 0;
        this.sfx.jump(SUITS[this.suitIdx].loose);
        this.dust(body.center.x, body.bottom, 5, 26, 14);
      }

      // double jump: one extra jump in mid-air
      if (this.jumpBuffer > 0 && !ground && this.coyote <= 0 && this.wallCoyote <= 0 && this.airJumps > 0) {
        const v = (this.power.spring > 0 ? SPRING_JUMP : JUMP) * 0.92;
        body.setVelocityY(-v);
        this.airJumps--;
        this.jumpBuffer = 0;
        this.spinT = this.reduced ? 0 : 0.5;
        this.sfx.air(SUITS[this.suitIdx].loose);
        // a puff of steam and sparks from his feet, and a ring of dust
        this.dust(body.center.x, body.bottom, 7, 34, 8, 0.9);
        this.debris(body.center.x, body.bottom, 'spark', this.reduced ? 2 : 7, 0.8);
      }

      // landing
      if (ground && !this.wasGround && this.prevVy > 220) {
        const big = this.prevVy > 520;
        this.dust(body.center.x, body.bottom, big ? 9 : 6, big ? 44 : 32, big ? 20 : 12, big ? 1.3 : 1);
        this.landSquash = Math.min(1, this.prevVy / 700);
        this.sfx.land();
      }
      this.wasGround = ground;
      this.prevVy = body.velocity.y;

      // clanking footsteps, quicker when he's running faster
      this.stepTimer -= dt;
      if (ground && Math.abs(body.velocity.x) > 80 && this.stepTimer <= 0) {
        this.stepAlt = !this.stepAlt;
        this.sfx.step(SUITS[this.suitIdx].loose, this.stepAlt);
        this.stepTimer = 0.26 * (RUN / Math.max(RUN * 0.6, Math.abs(body.velocity.x)));
      }

      // running dust
      this.dustTimer -= dt;
      if (ground && Math.abs(body.velocity.x) > 120 && this.dustTimer <= 0) {
        this.dust(body.center.x - this.facing * 8, body.bottom, 1, 6, 8, 0.7);
        this.dustTimer = 0.11;
      }

      // standing on a safe stretch of roof?
      if (ground) {
        for (const b of this.buildings) {
          if (body.center.x > b.x + 40 && body.center.x < b.x + b.w - 40 && Math.abs(body.bottom - b.top) < 3) {
            if (!this.items.some((i) => i.kind === 'pylon' && !i.taken && Math.abs(i.sprite.x - body.center.x) < 80)) {
              this.lastSafe = { x: body.center.x, top: b.top };
            }
            break;
          }
        }
      }

      // clumsy robot: parts keep falling off, and he trips now and then
      const suit = SUITS[this.suitIdx];
      this.partTimer -= dt;
      if (this.partTimer <= 0) {
        this.partTimer = (2.2 + Math.random() * 3) / Math.max(0.15, suit.loose);
        if (suit.loose > 0.1) this.debris(body.center.x - this.facing * 6, body.center.y, Math.random() < 0.5 ? 'bolt' : 'cog', 1, 0.5);
      }
      this.tripTimer -= dt;
      if (this.tripTimer <= 0) {
        this.tripTimer = 7 + Math.random() * 8;
        if (suit.loose > 0.3 && ground && Math.abs(body.velocity.x) > 100) this.stumble = Math.max(this.stumble, 0.55);
      }

      // -- items
      const px = body.center.x, py = body.center.y;
      for (const it of this.items) {
        if (it.taken) continue;
        const s = it.sprite;
        if (it.kind === 'wall') {
          if (Math.abs(px - s.x) < 24 && body.bottom > s.y - 32 && body.top < s.y + 32) this.crashWall(it);
        } else if (it.kind !== 'pylon') {
          if (!this.reduced) s.y = it.baseY + Math.sin(this.t * 3 + it.phase) * 4;
          if (it.kind === 'bb' && this.power.magnet > 0) {
            const dx = px - s.x, dy = py - s.y, dist = Math.hypot(dx, dy);
            if (dist < 230 && dist > 1) {
              const pull = Math.min(dist, 520 * dt);
              s.x += (dx / dist) * pull;
              s.y += (dy / dist) * pull;
              it.baseY = s.y;
            }
          }
          if (Math.hypot(px - s.x, py - s.y) < (it.kind === 'bb' ? 30 : 34)) {
            if (it.kind === 'bb') this.collectBreadboard(it);
            else this.collectPower(it);
          }
        } else if (Math.abs(px - s.x) < 17 && body.bottom > s.y - 18 && body.top < s.y + 21) {
          this.hit('pylon');
        }
      }

      // fell off the world
      if (body.top > H + 40) this.hit('fall');

      // timers
      this.invuln = Math.max(0, this.invuln - dt);
      this.slowT = Math.max(0, this.slowT - dt);
      (['spring', 'magnet', 'turbo'] as const).forEach((id) => {
        if (this.power[id] > 0) {
          this.power[id] -= dt;
          if (this.power[id] <= 0) {
            this.power[id] = 0;
            this.announce(`${POWER[id].label} ran out.`);
          }
        }
      });
    }

    // -- shooting
    this.fireCD = Math.max(0, this.fireCD - dt);
    this.fireAnim = Math.max(0, this.fireAnim - dt * 6);
    if (!this.over && (this.keys.X.isDown || this.keys.F.isDown || this.touch.fire) && this.gun() && this.fireCD <= 0) this.shoot();
    this.updateShots(dt);

    // -- camera only moves forward; Iggy can't run off the left edge
    const want = body.center.x - 330;
    if (want > cam.scrollX) cam.scrollX += this.reduced ? want - cam.scrollX : (want - cam.scrollX) * Math.min(1, dt * 8);
    if (body.left < cam.scrollX + 8) {
      body.x = cam.scrollX + 8;
      if (body.velocity.x < 0) body.setVelocityX(0);
    }
    this.maxX = Math.max(this.maxX, body.center.x - 110);
    this.generate();
    this.cull();

    // -- backdrop
    this.layers.forEach((l) => (l.sprite.tilePositionX = cam.scrollX * l.f));
    this.fog.tilePositionX = cam.scrollX * 0.5 + (this.reduced ? 0 : this.t * 10);
    if (this.rain) {
      this.rain.tilePositionY += dt * this.level.precip.vy;
      this.rain.tilePositionX += dt * this.level.precip.vx;
    }
    if (this.flash && this.level.lightning && this.t > this.nextLightning) {
      this.nextLightning = this.t + 14 + Math.random() * 16;
      this.flash.setAlpha(0.3);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 350 });
    }

    // -- draw Iggy
    this.landSquash = Math.max(0, this.landSquash - dt * 4);
    this.stumble = Math.max(0, this.stumble - dt * 1.6);
    this.robot.setPosition(body.center.x, body.bottom + 1);
    // cartoon squash & stretch: stretch while rising/falling fast, squash on landing
    const grounded = body.touching.down || body.blocked.down;
    const stretch = this.reduced || grounded ? 0 : Phaser.Math.Clamp(Math.abs(body.velocity.y) / 1800, 0, 0.18);
    const squash = this.reduced ? 0 : this.landSquash * 0.28;
    this.robot.setScale(this.facing * 1.15 * (1 - stretch * 0.6 + squash), 1.15 * (1 + stretch - squash));
    this.spinT = Math.max(0, this.spinT - dt);
    const sp = this.spinT > 0 ? 1 - this.spinT / 0.5 : 1;
    const spin = this.spinT > 0 ? Math.PI * 2 * (1 - Math.pow(1 - sp, 2)) : 0;
    // invulnerable = flicker (or steady dim when motion is reduced)
    this.robot.setAlpha(this.invuln > 0 ? (this.reduced ? 0.6 : Math.sin(this.t * 40) > 0 ? 1 : 0.35) : 1);
    drawRobot(this.robot, SUITS[this.suitIdx], {
      t: this.t,
      vx: body.velocity.x,
      vy: body.velocity.y,
      onGround: body.touching.down || body.blocked.down,
      stumble: this.stumble,
      landSquash: this.landSquash,
      spin,
      shield: this.power.shield > 0,
      turbo: this.power.turbo > 0,
      reduced: this.reduced,
      gun: this.gun(),
      fire: this.fireAnim,
    });

    // -- HUD (throttled)
    if (!this.over && this.score() >= LEVEL_GOAL) this.endRun(true);
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.2;
      this.emitHud();
    }
  }
}
