import Phaser from 'phaser';
import { Settings } from '../settings.service';
import {
  H, SUITS, W, drawBuilding, drawHollowBuilding, drawRobot, makeFlakes, makeFog, makeHollowFog, makeHollowLayer, makeHollowSky,
  makeRain, makeSky, makeSkyline, makeSmallTextures, suitFor,
} from './art';
import { ensureStyle, drawLevelBuilding, makeEnemyTextures, makeFlyerTextures, makeRingTextures, makeWarTextures, makePlatformTextures, ExtraStyle } from './art-levels';
import { BOSSES, BOSS_SCORE, BossAttack, BossDef, LevelDef, levelById } from './levels';
import { makeBossShots } from './boss-shots';
import { makeEnemyRigTextures } from './enemy-rigs';
import { makeBossRigTextures } from './boss-rigs';
import { makeForeTexture } from './art-fore';
import { Sfx } from './sfx';
import { Music } from './music';
import { seededRandom } from '../daily';

/** What the Angular HUD shows. Emitted as game.events 'hud'. */
export interface HudState {
  level: string;
  goal: number;
  mode: 'story' | 'endless' | 'time';
  /** whole seconds on the clock (time attack) */
  time: number;
  boss: { name: string; hp: number; max: number } | null;
  score: number;
  breadboards: number;
  lives: number;
  nextLifeIn: number; // breadboards until the next free life
  perfect: boolean; // every breadboard so far has been collected
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
  perfect: boolean;
  /** the boss fight ended without Iggy being hit */
  untouched: boolean;
  mode: 'story' | 'endless' | 'time';
  /** run time in milliseconds */
  time: number;
  /** the route Iggy took, as x,y pairs every 0.1s (time attack wins only), kept as the ghost */
  trace?: number[];
}
export interface TouchInput { left: boolean; right: boolean; jump: boolean; fire: boolean; duck: boolean }

type PowerId = 'spring' | 'magnet' | 'shield' | 'turbo' | 'star' | 'gun' | 'oil';
const GUN_NAMES = ['', 'Blaster', 'Twin blaster', 'Spread gun', 'Rocket launcher'];
const GUN_MAX = 4;
const GUN_AMMO = 30; // shots per gun pickup; ammo never times out, so players can save it
const GUN_AMMO_MAX = 99;
const POWER: Record<PowerId, { label: string; secs: number | null; tex: string; text: string }> = {
  spring: { label: 'Spring legs', secs: 12, tex: 'pu-spring', text: 'Spring legs! Jump much higher.' },
  magnet: { label: 'Magnet', secs: 12, tex: 'pu-magnet', text: 'Magnet! Breadboards fly to you.' },
  shield: { label: 'Shield', secs: null, tex: 'pu-shield', text: 'Shield! Blocks the next hit.' },
  turbo: { label: 'Overclock', secs: 10, tex: 'pu-turbo', text: 'Overclock! Faster running.' },
  star: { label: 'Invincible', secs: 8, tex: 'pu-star', text: 'Invincible for 8 seconds! Pylons, walls and enemies are smashed when you touch them. Gaps are still dangerous.' },
  oil: { label: 'Oil', secs: 15, tex: 'pu-oil', text: 'Oiled up! Joints run smooth for 15 seconds: a little faster, no stumbling and no rattling.' },
  gun: { label: 'Gun', secs: null, tex: 'pu-blaster', text: '' }, // power.gun holds the ammo count
};

interface Shot { s: Phaser.GameObjects.Image; vx: number; vy: number; kind: 'bolt' | 'rocket'; trail: number; big?: boolean; bossHit?: boolean; hit?: Set<Item> }
interface Building { x: number; top: number; w: number; gfx: Phaser.GameObjects.Graphics; zone: Phaser.GameObjects.Zone; collider: Phaser.Physics.Arcade.Collider }
interface Item { kind: 'bb' | 'pu' | 'pylon' | 'wall' | 'patrol' | 'ring' | 'flyer' | 'secret' | 'hazard' | 'switch' | 'mine'; mT?: number; hint?: boolean; bonus?: boolean; pressed?: boolean; hz?: Haz; flyer?: Flyer; back?: Phaser.GameObjects.Image; hp?: number; walker?: { kind: 'skeleton' | 'crawler'; min: number; max: number; dir: number; speed: number; frame: number; cd?: number; aim?: number }; power?: PowerId; sprite: Phaser.GameObjects.Image; baseY: number; phase: number; taken?: boolean; falling?: boolean }

/** Roof hazards that run on a timer: falling debris (city, hollow, wastes), steam vents (drowned), laser grids (void, spores). */
interface Haz {
  type: 'debris' | 'vent' | 'laser'; gfx: Phaser.GameObjects.Graphics; x: number; top: number;
  state: 'idle' | 'warn' | 'active' | 'done'; t: number; fall: number; ticks: number;
}
interface Bullet { img: Phaser.GameObjects.Rectangle; trail: Phaser.GameObjects.Rectangle; vx: number; y: number }
interface Shell { x: number; top: number; state: 'warn' | 'boom'; t: number; gfx: Phaser.GameObjects.Graphics; boomed: boolean }
interface Plat {
  kind: 'moving' | 'crumble' | 'secret'; img: Phaser.Physics.Arcade.Image; collider: Phaser.Physics.Arcade.Collider; baseX: number; baseY: number; amp: number; phase: number;
  stood: boolean; timer: number; state: 'idle' | 'shaking' | 'falling';
}
type FlyerStyle = 'drowned' | 'void' | 'spores';
const FLYER_NAME: Record<FlyerStyle, string> = { drowned: 'death-ray', void: 'gearbat', spores: 'gearbat' };
interface Flyer {
  style: FlyerStyle; homeX: number; homeY: number; state: 'idle' | 'windup' | 'dive' | 'rise';
  timer: number; cd: number; vx: number; vy: number; frame: number; fromX: number; fromY: number;
}
interface BossState {
  def: BossDef; sprite: Phaser.GameObjects.Image; hp: number; max: number;
  state: 'intro' | 'walk' | 'telegraph' | 'stagger' | 'dead';
  timer: number; cd: number; attack: BossAttack; stomped: boolean; touchCD: number; said: number;
}
interface BossShot { img: Phaser.GameObjects.Image; vx: number; vy: number; g: number; mortar: boolean }
interface BossWave { img: Phaser.GameObjects.Image; vx: number }
interface Flag { x: number; top: number; sprite: Phaser.GameObjects.Image; on: boolean }

const RUN = 250;
const GRAVITY = 1500;
const JUMP = 620;
const SPRING_JUMP = 800;
const LIFE_EVERY = 100;
const MAX_LIVES = 9;
/** time attack: how far the road runs before the boss arena, in pixels */
const TIME_DISTANCE = 8000;
type Mode = 'story' | 'endless' | 'time';
const DASH_V = 600, DASH_TIME = 0.22, DASH_COOLDOWN = 1.1;
const POUND_V = 950, POUND_RADIUS = 120;
const GLIDE_FALL = 110;
/** what each suit can do beyond soaking a hit, by suit index */
const ABILITY: Record<number, string> = {
  2: 'Dash: press Shoot when you have no gun.',
  3: 'Ground pound: press Duck in mid-air.',
  4: 'Glide: hold Jump while falling after your double jump.',
};
/** how far above the lower roof the secret floats: a plain jump falls short, a double jump (or spring legs) gets there */
const SECRET_RISE = 230;
const BLASTER_BOLT_SPEED = 640;
const ROCKET_SPEED = 380;
const CHARGE_MIN = 0.35; // hold at least this long (secs) and the release is a charged shot
const CHARGE_FULL = 0.9;
const BEST_KEY = 'iggys-quest.best';
const OLD_BEST_KEY = 'side-scroller.best'; // project's old name: still read once so level 1's best score carries over

export class PlayScene extends Phaser.Scene {
  private settings!: Settings;
  private sfx!: Sfx;
  private music?: Music;
  private level!: LevelDef;
  private reduced = false;
  private hc = false;

  /** KeyboardEvent.code of every key that is held down right now */
  private readonly down = new Set<string>();
  private touch!: TouchInput;

  private player!: Phaser.GameObjects.Zone;
  private body!: Phaser.Physics.Arcade.Body;
  private robot!: Phaser.GameObjects.Graphics;
  private buildings: Building[] = [];
  private items: Item[] = [];
  private plats: Plat[] = [];
  private flags: Flag[] = [];
  private nextFlagX = 1800;
  private arenaX: number | null = null;
  private arenaTop = 400;
  private camLock: number | null = null;
  private boss?: BossState;
  private bossShots: BossShot[] = [];
  private bossWaves: BossWave[] = [];
  private bossAmmoT = 8;
  private nextX = 0;
  private lastTop = 400;
  /** Level layout randomness: seeded for the daily challenge so everyone gets the same level, plain random otherwise. */
  private rand: () => number = Math.random;
  private seed: number | null = null;
  // suit abilities: Steel Sentinel dashes, Night Guardian ground-pounds, Gold Circuit glides
  private runPhase = 0; // run-cycle phase: advances with distance run so the feet keep pace with the ground
  private dashT = 0;
  private dashCD = 0;
  private pounding = false;
  private firePrev = false;
  private duckPrev = false;
  private mode: Mode = 'story';
  private bossHurtIggy = false;
  private stompChain = 0;
  private runTime = 0;
  private traceT = 0;
  private lastSec = -1;
  private trace: number[] = [];
  private ghost: number[] | null = null;
  private ghostBox?: Phaser.GameObjects.Rectangle;
  private secretAt = 3000;
  private secretPlaced = false;
  // soldiers on the later levels shoot straight along the roof
  private bullets: Bullet[] = [];
  private soldierWarned = false;
  // warzone: random artillery shells and landmines
  private shells: Shell[] = [];
  private shellCD = 3.5;
  private shellWarned = false;
  private switchPlaced = false;
  /** once the hidden path is revealed: the stretch of the level it covers, where breadboards become optional bonus */
  private layerSpan: [number, number] | null = null;
  private landedNow = false;
  private between(a: number, b: number) {
    return Math.floor(this.rand() * (b - a + 1) + a);
  }

  private layers: { sprite: Phaser.GameObjects.TileSprite; f: number }[] = [];
  private fog!: Phaser.GameObjects.TileSprite;
  private fore?: Phaser.GameObjects.TileSprite;
  private trailT = 0;
  private rain?: Phaser.GameObjects.TileSprite;
  private flash?: Phaser.GameObjects.Rectangle;
  private nextLightning = 0;

  private t = 0;
  private over = false;
  private breadboards = 0;
  private bbSpawned = 0;
  private bbCollected = 0; // required breadboards only: bonus ones (the hidden path) don't count

  private bbMissed = false;
  private lives = 3;
  private suitIdx = 0;
  private rings = 0;
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
  private charge = 0; // seconds the fire button has been held
  private chargeFx?: Phaser.GameObjects.Arc;
  private slowT = 0;
  private bonus = 0;
  private ringChain = 0;
  private ringTimer = 0;
  private airJumps = 1; // extra jumps left in the air (double jump)
  private spinT = 0; // seconds left of the double-jump flip
  private partTimer = 2;
  private tripTimer = 6;
  private facing = 1;
  /** 0 standing .. 1 fully crouched (smoothed, drives the pose); `ducked` is the hitbox state */
  private duckAmt = 0;
  private ducked = false;
  private power: Record<PowerId, number> = { spring: 0, magnet: 0, shield: 0, turbo: 0, star: 0, gun: 0, oil: 0 };
  /** where Iggy restarts after losing a life: the start of the level until he touches a checkpoint flag */
  private checkpoint = { x: 110, top: 400, flag: false };
  private hudTimer = 0;
  private lastHud = '';

  constructor() {
    super('play');
  }

  /** The pictures for this level's boss and enemies. */
  create() {
    this.settings = this.registry.get('settings') as Settings;
    this.touch = (this.registry.get('touch') as TouchInput | undefined) ?? { left: false, right: false, jump: false, fire: false, duck: false };
    this.reduced = this.settings.reducedMotion;
    this.seed = (this.registry.get('seed') as number | null | undefined) ?? null;
    this.rand = this.seed ? seededRandom(this.seed) : Math.random;
    this.mode = ((this.registry.get('mode') as Mode | undefined) ?? 'story');
    this.ghost = this.mode === 'time' ? ((this.registry.get('ghost') as number[] | null | undefined) ?? null) : null;
    this.bossHurtIggy = false;
    this.stompChain = 0;
    this.runTime = 0;
    this.traceT = 0;
    this.lastSec = -1;
    this.trace = [];
    this.secretAt = 2200 + this.rand() * 2800; // somewhere along the level a golden breadboard hides above a gap
    this.secretPlaced = false;
    this.bullets.forEach((b) => { b.img.destroy(); b.trail.destroy(); });
    this.bullets = [];
    this.soldierWarned = false;
    this.shells.forEach((sh) => sh.gfx.destroy());
    this.shells = [];
    this.shellCD = 3.5;
    this.shellWarned = false;
    this.switchPlaced = false;
    this.layerSpan = null;
    this.landedNow = false;
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
    // A restart emits 'shutdown', but destroying the whole game (leaving the page) only emits 'destroy': listen to both, or the
    // old level's music keeps playing and the next level's plays on top of it.
    let tornDown = false;
    const teardown = () => {
      if (tornDown) return;
      tornDown = true;
      this.registry.events.off('changedata-music', onMusic);
      this.events.off('pause', onPause);
      this.events.off('resume', onResume);
      this.music?.stop();
      this.music = undefined;
      this.sfx.close();
    };
    this.events.once('shutdown', teardown);
    this.events.once('destroy', teardown);

    // Keyboard: remappable, so read KeyboardEvent.code ourselves. Keys the player bound are kept from scrolling the page while the game has focus.
    const kb = this.input.keyboard!;
    const onDown = (e: KeyboardEvent) => this.down.add(e.code);
    const onUp = (e: KeyboardEvent) => this.down.delete(e.code);
    const onBlur = () => this.down.clear();
    const stopScroll = (e: KeyboardEvent) => {
      const host = this.game.canvas.parentElement;
      if (host && document.activeElement === host && this.isBound(e.code)) e.preventDefault();
    };
    kb.on('keydown', onDown);
    kb.on('keyup', onUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', stopScroll);
    const onSettings = () => this.sfx.setVolume(this.live().volume);
    this.registry.events.on('changedata-settings', onSettings);
    const offKeys = () => {
      kb.off('keydown', onDown);
      kb.off('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', stopScroll);
      this.registry.events.off('changedata-settings', onSettings);
    };
    this.events.once('shutdown', offKeys);
    this.events.once('destroy', offKeys);

    // reset state (scene.restart re-runs create)
    this.buildings = [];
    this.items = [];
    this.plats = [];
    this.flags = [];
    this.nextFlagX = 1800;
    this.checkpoint = { x: 110, top: 400, flag: false };
    this.arenaX = null;
    this.camLock = null;
    this.boss = undefined;
    this.bossShots = [];
    this.bossWaves = [];
    this.bossAmmoT = 8;
    this.layers = [];
    this.t = 0;
    this.over = false;
    this.duckAmt = 0;
    this.ducked = false;
    this.breadboards = 0;
    this.bbSpawned = 0;
    this.bbCollected = 0;
    this.bbMissed = false;
    this.lives = this.live().startLives;
    this.suitIdx = 0;
    this.rings = 0;
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
    this.charge = 0;
    this.slowT = 0;
    this.bonus = 0;
    this.ringChain = 0;
    this.ringTimer = 0;
    this.stumble = 0;
    this.power = { spring: 0, magnet: 0, shield: 0, turbo: 0, star: 0, gun: 0, oil: 0 };
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
    // time attack: a ghost of the best run so far, drawn as a see-through outline so it can't be mistaken for an enemy
    this.ghostBox = this.ghost?.length ? this.add.rectangle(-999, 0, 24, 40, 0x7ad9ff, 0.28).setStrokeStyle(2, 0xffffff, 0.85).setDepth(9) : undefined;

    // first rooftop is long and flat so Iggy can get his bearings
    this.nextX = -300;
    this.lastTop = 400;
    this.addBuilding(this.nextX, 400, 1000);
    this.nextX += 1000;
    this.generate();

    this.down.clear();

    this.cameras.main.setBackgroundColor(this.level.bg);
    this.cameras.main.scrollX = -20;
    this.emitHud(true);
    this.banner(`Level ${this.level.number}: ${this.level.name}`);
    this.announce(`Level ${this.level.number}: ${this.level.name}. ${this.level.blurb}`);
  }

  // ------------------------------------------------------------------ backdrop
  private buildBackdrop() {
    if (!this.textures.exists('dust')) makeSmallTextures(this);
    makeEnemyTextures(this);
    makeFlyerTextures(this);
    makeRingTextures(this);
    makePlatformTextures(this);
    if (this.level.style === 'war') makeWarTextures(this);
    makeBossShots(this);
    makeEnemyRigTextures(this, this.level.style); // enemies are drawn and animated in code, then grimed up
    makeBossRigTextures(this, this.level.style); // the bosses are drawn and animated in code
    const style = this.level.style;
    let sky: string, layers: [string, number][], fogKey: string, precipKey: string;
    if (style !== 'city' && style !== 'hollow') {
      const a = ensureStyle(this, style);
      sky = a.sky;
      layers = a.layers;
      fogKey = a.fog;
      precipKey = a.precip;
    } else if (style === 'hollow') {
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
    this.fore = undefined;
    // foreground parallax frames the top and bottom edges; it is motion that follows the camera, so it is off for reduced motion / high contrast
    if (!this.reduced && !this.hc) this.fore = this.add.tileSprite(0, 0, W, H, makeForeTexture(this, style)).setOrigin(0).setScrollFactor(0).setDepth(15).setAlpha(0.9);
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
    const st = this.level.style;
    const gfx = st === 'hollow' ? drawHollowBuilding(this, x, top, w, this.hc)
      : st === 'city' ? drawBuilding(this, x, top, w, this.hc)
      : drawLevelBuilding(this, st as ExtraStyle, x, top, w, this.hc);
    const zone = this.add.zone(x + w / 2, top + 300, w, 600);
    this.physics.add.existing(zone, true);
    const collider = this.physics.add.collider(this.player, zone);
    const b: Building = { x, top, w, gfx, zone, collider };
    this.buildings.push(b);
    return b;
  }

  private generate() {
    if (this.arenaX !== null) return; // the boss arena is the end of the road
    const lim = this.cameras.main.scrollX + W + 900;
    while (this.nextX < lim) {
      const d = this.difficulty();
      const war = this.level.style === 'war'; // the trenches are one long stretch of low ground with only small craters to jump
      const rise = war ? this.between(-16, 16) : this.between(-140, 70); // positive = lower
      let top = war ? Phaser.Math.Clamp(this.lastTop + rise, 405, 440) : Phaser.Math.Clamp(this.lastTop + rise, 290, 450);
      const stepUp = Math.max(0, this.lastTop - top);
      if (stepUp > 75) top = this.lastTop - 75;
      const maxGap = 120 + d * 60 - stepUp * 0.9;
      const gap = war ? this.between(46, 92) : this.between(60, Math.max(70, Math.floor(maxGap)));
      const w = war ? this.between(250, 520 - Math.floor(d * 110)) : this.between(170, 440 - Math.floor(d * 120));
      const x = this.nextX + gap;
      const prev = this.buildings[this.buildings.length - 1];
      const b = this.addBuilding(x, top, w);
      this.populate(b, prev, gap);
      if (prev) this.addPlatform(prev, b, gap);
      if (b.x >= this.nextFlagX && b.w >= 240) {
        this.addFlag(b);
        this.nextFlagX = b.x + 1800 + this.rand() * 600;
      }
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
    // the level's secret: a golden breadboard high above a gap, out of reach of a plain jump
    if (prev && !this.secretPlaced && b.x > this.secretAt && gap > 70) {
      this.secretPlaced = true;
      this.addItem('secret', (prev.x + prev.w + b.x) / 2, Math.min(prev.top, b.top) - SECRET_RISE);
    }
    // rooftop pylons
    const hazards: number[] = [];
    if (b.w > 240 && this.rand() < 0.25 + d * 0.5) {
      const px = b.x + this.between(90, b.w - 90);
      hazards.push(px);
      this.addItem('pylon', px, b.top - 21);
    }
    // brick wall: Iggy can crash through it (slowed, not hurt), or shoot it down
    if (b.w > 260 && this.rand() < 0.22 + d * 0.25) {
      const wx = b.x + this.between(110, b.w - 110);
      if (!hazards.some((h) => Math.abs(h - wx) < 90)) {
        hazards.push(wx);
        this.addItem('wall', wx, b.top - 32);
      }
    }
    // rings to jump through: a short arc of one to three hoops floating above the roof
    if (b.w > 200 && this.maxX > 100 && this.rand() < 0.3) {
      const n = this.between(1, Math.min(3, Math.floor((b.w - 80) / 90)));
      const x0 = b.x + (b.w - (n - 1) * 90) / 2;
      for (let i = 0; i < n; i++) this.addRing(x0 + i * 90, b.top - (n > 1 && i % 2 === 0 ? 92 : 105));
    }
    // a patrolling enemy walking back and forth across a clear roof
    if (hazards.length === 0 && b.w > 220 && this.maxX > 200 && this.rand() < 0.22 + d * 0.3) this.addPatrol(b);
    // a timed roof hazard on a clear roof, a different kind for each look of level
    if (this.level.style === 'war') {
      // landmines buried in the ground on clear stretches
      if (hazards.length === 0 && b.w > 260 && this.maxX > 500 && this.rand() < 0.3 + d * 0.2) {
        const mx = b.x + this.between(110, b.w - 110);
        this.addMine(mx, b.top);
        hazards.push(mx);
      }
    } else if (hazards.length === 0 && b.w > 280 && this.maxX > 600 && this.rand() < 0.14 + d * 0.18) {
      const hx = b.x + this.between(110, b.w - 110);
      this.addHazard(hx, b.top);
      hazards.push(hx);
    }
    // a flying enemy hovering above the roof (the last three levels)
    if (['drowned', 'void', 'spores'].includes(this.level.style) && b.w > 200 && this.maxX > 300 && this.rand() < 0.12 + d * 0.14) this.addFlyer(b);
    // rooftop breadboards: a trail along the roof, sometimes higher
    if (this.rand() < 0.65) {
      const n = this.between(2, 5);
      const start = b.x + this.between(30, Math.max(31, b.w - n * 38 - 20));
      const high = this.rand() < 0.4;
      for (let i = 0; i < n; i++) {
        const x = start + i * 38;
        if (hazards.some((h) => Math.abs(h - x) < 40) && !high) continue;
        this.addItem('bb', x, b.top - (high ? 115 : 34));
      }
    }
    // level 1's hidden path: a brass button in the roof. Landing on it makes the sky layer appear.
    if (this.level.id === 'rooftops' && !this.switchPlaced && b.x > 2300 && b.w > 220 && hazards.length === 0) {
      this.switchPlaced = true;
      this.addSwitch(b.x + b.w / 2, b.top);
    }
    // power-ups
    if (this.maxX > 300 && this.rand() < 0.14) {
      const ids: PowerId[] = ['spring', 'magnet', 'shield', 'turbo', 'star', 'gun', 'gun', 'oil', 'oil'];
      const id = ids[Math.floor(this.rand() * ids.length)];
      this.addItem('pu', b.x + b.w / 2, b.top - 75, id);
    }
    void gap;
  }

  /** A one-way platform floating in a wide gap: sliding sideways, or crumbling a moment after Iggy lands on it. */
  /**
   * Level 1's hidden sky layer. Landing on a brass button set into a rooftop reveals a staircase of golden slabs leading to a high
   * road of bonus breadboards and a star. None of it is needed to finish the level, and its breadboards don't count against a perfect run.
   */
  private addSwitch(x: number, top: number) {
    const sprite = this.add.image(x, top - 8, 'switch-off').setDepth(6);
    this.items.push({ kind: 'switch', sprite, baseY: sprite.y, phase: 0 });
  }

  private pressSwitch(it: Item) {
    it.pressed = true;
    it.sprite.setTexture('switch-on');
    this.sfx.secret();
    this.banner('Click! A hidden path appears.');
    this.announce('Click! A hidden path has appeared high above, to the right. A staircase of golden slabs leads up to it. Breadboards in that stretch are now optional bonus, so skipping them keeps a perfect run alive.');
    this.burst(it.sprite.x, it.sprite.y - 6, [0x4dff88, 0xffd23a, 0xffffff], 22, 220);
    const x0 = it.sprite.x + 330;
    // everything the hidden path flies over becomes optional, so taking it never costs a perfect run
    this.layerSpan = [x0 - 90, x0 + 1130 + 140];
    for (const o of this.items) {
      if (o.kind === 'bb' && !o.bonus && !o.taken && o.sprite.x >= this.layerSpan[0] && o.sprite.x <= this.layerSpan[1]) {
        o.bonus = true;
        this.bbSpawned--;
      }
    }
    this.addSecretLayer(x0);
    this.emitHud(true);
  }

  private addSecretLayer(x0: number) {
    const steps: [number, number][] = [[0, 270], [145, 235], [290, 200], [435, 165], [590, 150], [725, 150], [860, 150], [995, 150], [1130, 150]];
    steps.forEach(([dx, y], i) => {
      const x = x0 + dx;
      const img = this.physics.add.image(x, y, 'plat-secret').setDepth(7).setAlpha(this.reduced ? 1 : 0);
      const body = img.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false).setImmovable(true);
      body.setSize(84, 12).setOffset(0, 2);
      const plat: Plat = { collider: undefined as unknown as Phaser.Physics.Arcade.Collider, kind: 'secret', img, baseX: x, baseY: y, amp: 0, phase: 0, stood: false, timer: 0, state: 'idle' };
      plat.collider = this.physics.add.collider(this.player, img, undefined, () => this.body.velocity.y >= 0 && this.body.prev.y + this.body.height <= body.top + 6);
      this.plats.push(plat);
      if (!this.reduced) this.tweens.add({ targets: img, alpha: 0.35, duration: 400, delay: i * 90 }); // the slabs light up one after another
    });
    // golden breadboards along the high road (bonus only)
    for (let dx = 590; dx <= 1130; dx += 45) {
      this.addItem('bb', x0 + dx, 108);
      const it = this.items[this.items.length - 1];
      it.bonus = true; // inside the span, so addItem has already left it out of the perfect-run count
      it.sprite.setTint(0xffe27a);
    }
    this.addItem('pu', x0 + 1130, 100, 'star');
  }

  private addPlatform(prev: Building, b: Building, gap: number) {
    if (gap < 120 || this.maxX < 400 || this.rand() > 0.3) return;
    const moving = gap >= 150 && this.rand() < 0.5;
    const x = prev.x + prev.w + gap / 2;
    const y = Math.min(480, prev.top + 20);
    const img = this.physics.add.image(x, y, moving ? 'plat-moving' : 'plat-crumble').setDepth(7);
    const body = img.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false).setImmovable(true);
    body.setSize(84, 12).setOffset(0, 2);
    let collider!: Phaser.Physics.Arcade.Collider;
    const plat: Plat = { collider: undefined as unknown as Phaser.Physics.Arcade.Collider, kind: moving ? 'moving' : 'crumble', img, baseX: x, baseY: y, amp: moving ? Math.min(45, (gap - 90) / 2) : 0, phase: this.rand() * 6, stood: false, timer: 0, state: 'idle' };
    // one-way: only solid while Iggy is falling onto it from above
    collider = this.physics.add.collider(this.player, img, undefined, () => {
      if (plat.state === 'falling') return false;
      const ok = this.body.velocity.y >= 0 && this.body.prev.y + this.body.height <= body.top + 6;
      if (ok) plat.stood = true;
      return ok;
    });
    plat.collider = collider;
    this.plats.push(plat);
    void b;
  }

  // ------------------------------------------------------------------ boss
  private openArena() {
    const top = Phaser.Math.Clamp(400, this.lastTop - 60, this.lastTop + 60);
    this.arenaTop = top;
    this.arenaX = this.nextX + 110;
    this.addBuilding(this.arenaX, top, 1300);
    this.banner('Something big is ahead...');
    this.announce('A boss arena lies ahead. Keep going right.');
  }

  private spawnBoss() {
    const def = BOSSES[this.level.style];
    const sprite = this.add.image(this.camLock! + W - 150, this.arenaTop, `boss-${this.level.style}-a`).setOrigin(0.5, 1).setDepth(8);
    this.boss = { def, sprite, hp: def.hp, max: def.hp, state: 'intro', timer: 2.2, cd: 1.5, attack: 'volley', stomped: false, touchCD: 0, said: 0 };
    this.banner(`Boss: ${def.name}`);
    this.announce(`Boss fight: ${def.name}. ${def.blurb} Shoot it, or stomp on its head when it kneels.`);
    this.sfx.bossAppear();
    this.music?.setIntensity(1);
    this.music?.stinger();
    for (let i = 0; i < 3; i++) this.time.delayedCall(400 + i * 900, () => this.boss && this.dropBossPowerUp(this.camLock!, true));
    this.bossAmmoT = 4;
    this.emitHud(true);
  }

  private bossBox(b: BossState) {
    const s = b.sprite;
    const hw = Phaser.Math.Clamp(s.displayWidth * 0.32, 52, 92); // the body, not the outstretched arms
    return { x0: s.x - hw, x1: s.x + hw, y0: s.y - s.displayHeight + 8, y1: s.y };
  }

  private inBossRect(x: number, y: number) {
    if (!this.boss || this.boss.state === 'dead') return false;
    const r = this.bossBox(this.boss);
    return x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
  }

  private damageBoss(n: number) {
    const b = this.boss;
    if (!b || b.state === 'dead' || b.state === 'intro') return;
    b.hp -= n;
    b.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL); // a quick white flash on every hit
    this.time.delayedCall(70, () => b.sprite.active && b.sprite.clearTint().setTintMode(Phaser.TintModes.MULTIPLY));
    this.sfx.bossHit();
    this.debris(b.sprite.x + Phaser.Math.Between(-30, 30), b.sprite.y - Phaser.Math.Between(30, b.sprite.displayHeight - 20), 'spark', 3, 1);
    const frac = Math.max(0, b.hp) / b.max;
    const step = frac <= 0.25 ? 3 : frac <= 0.5 ? 2 : frac <= 0.75 ? 1 : 0;
    if (b.hp > 0 && step > b.said) {
      b.said = step;
      if (step === 2) this.music?.setIntensity(2);
      this.announce(step === 2 ? `${b.def.name} is half destroyed and fighting harder.` : `${b.def.name} at ${Math.round(frac * 100)} percent.`);
    }
    if (b.hp <= 0) this.defeatBoss(b);
    this.emitHud(true);
  }

  private defeatBoss(b: BossState) {
    b.state = 'dead';
    this.bonus += 1000;
    this.invuln = 10;
    this.bossShots.forEach((s) => s.img.destroy());
    this.bossWaves.forEach((w) => w.img.destroy());
    this.bossShots = [];
    this.bossWaves = [];
    this.sfx.bossDown();
    this.music?.setIntensity(0);
    this.banner(`${b.def.name} destroyed!`);
    this.announce(`${b.def.name} destroyed! Plus 1000 points.`);
    b.sprite.setTexture(`boss-${this.level.style}-a`).setScale(1);
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 260, () => {
        if (!b.sprite.active) return;
        const ex = b.sprite.x + Phaser.Math.Between(-45, 45), ey = b.sprite.y - Phaser.Math.Between(20, 140);
        this.explode(ex, ey, 40);
        this.burst(ex, ey, [0xffd23a, 0xff7a1a, 0xffffff, 0xff3030], 22, 300);
      });
    }
    this.tweens.add({ targets: b.sprite, alpha: 0, duration: 400, delay: 1500 });
    const perfect = this.isPerfect();
    if (perfect) {
      this.bonus += 2500;
      this.time.delayedCall(1400, () => {
        this.banner('PERFECT RUN!');
        this.announce(`Perfect run! You collected all ${this.bbSpawned} breadboards. Plus 2500 points.`);
        this.sfx.perfect();
      });
    }
    if (perfect) this.fireworks(22, 1300, 230);
    this.time.delayedCall(perfect ? 6200 : 2000, () => {
      if (!this.over) this.endRun(true);
    });
  }

  /** Every breadboard that appeared in the level was collected. */
  private isPerfect() {
    return !this.bbMissed && this.bbSpawned > 0 && this.bbCollected >= this.bbSpawned;
  }

  /** Rockets rise from below the view and burst into coloured sprays. With reduced motion they just pop in place, fewer and softer. */
  private fireworks(count: number, start: number, every: number) {
    const cam = this.cameras.main;
    const palettes = [[0xff3d6e, 0xffd23a], [0x4fd3ff, 0xffffff], [0x7dff6a, 0xffe04a], [0xc07bff, 0xff7ad9], [0xffa03a, 0xfff0a0]];
    const n = this.reduced ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i++) {
      this.time.delayedCall(start + i * every * (this.reduced ? 2 : 1), () => {
        if (this.over) return;
        const x = cam.scrollX + 120 + Math.random() * (W - 240), y = 70 + Math.random() * 200;
        const pal = palettes[i % palettes.length];
        const pop = () => {
          this.sfx.firework();
          this.burst(x, y, pal, 46, 250);
          this.burst(x, y, [0xffffff], 12, 140);
        };
        if (this.reduced) { pop(); return; }
        const rocket = this.add.circle(x, H + 10, 3, 0xffffff).setDepth(14).setScrollFactor(0);
        rocket.x = x - cam.scrollX;
        this.tweens.add({ targets: rocket, y, duration: 520, ease: 'Quad.easeOut', onComplete: () => { rocket.destroy(); pop(); } });
      });
    }
  }

  private fireBossShot(x: number, y: number, tx: number, ty: number, speed: number) {
    const a = Math.atan2(ty - y, tx - x);
    const img = this.add.image(x, y, 'boss-orb').setDepth(9);
    this.bossShots.push({ img, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, g: 0, mortar: false });
  }

  private lobBossShot(x: number, y: number, tx: number) {
    const T = 0.95, g = 900;
    const img = this.add.image(x, y, 'boss-orb').setDepth(9).setScale(1.3);
    this.bossShots.push({ img, vx: (tx - x) / T, vy: (this.arenaTop - 8 - y - 0.5 * g * T * T) / T, g, mortar: true });
  }

  private updateBoss(dt: number, edt: number) {
    const b = this.boss;
    if (!b || this.camLock === null) return;
    const s = b.sprite, body = this.body;
    const px = body.center.x;
    const enraged = b.hp <= b.max / 2;
    if (b.state !== 'dead') {
      s.setFlipX(px > s.x);
      s.angle = b.state === 'telegraph' && !this.reduced ? Math.sin(this.t * 70) * 1.4 : 0; // it shudders while it charges
      b.timer -= edt;
      b.touchCD = Math.max(0, b.touchCD - edt);
      const lo = this.camLock + 140, hi = this.camLock + W - 90;
      const face = px > s.x ? 1 : -1;
      if (b.state === 'intro') {
        if (b.timer <= 0) b.state = 'walk';
      } else if (b.state === 'walk') {
        const dx = px - s.x;
        const want = Math.abs(dx) > 360 ? face : Math.abs(dx) < 250 ? -face : 0;
        s.x = Phaser.Math.Clamp(s.x + want * b.def.speed * (enraged ? 1.4 : 1) * edt, lo, hi);
        s.y = this.arenaTop + (!this.reduced && want !== 0 ? Math.abs(Math.sin(this.t * 6)) * -3 : 0);
        // the sprite steps (or hovers, or rumbles) while it moves, and breathes between steps
        const style = this.level.style, moving = want !== 0;
        const wk = moving ? `boss-${style}-w${Math.floor(this.t * 9) % 8}` : `boss-${style}-i${Math.floor(this.t * 3) % 4}`;
        s.setTexture(this.textures.exists(wk) ? wk : `boss-${style}-a`);
        b.cd -= edt;
        if (b.cd <= 0) {
          b.attack = b.def.attacks[Math.floor(Math.random() * b.def.attacks.length)];
          b.state = 'telegraph';
          b.timer = b.attack === 'stomp' ? 0.9 : 0.6;
          s.setTexture(`boss-${this.level.style}-b`);
          this.sfx.bossCharge(b.attack === 'stomp');
          if (b.attack === 'stomp') s.y = this.arenaTop - 14;
        }
      } else if (b.state === 'telegraph') {
        if (b.timer <= 0) this.bossAttack(b, enraged);
      } else if (b.state === 'stagger') {
        if (b.timer <= 0) {
          b.state = 'walk';
          b.cd = enraged ? 1 : 1.6;
          s.setScale(1);
          s.y = this.arenaTop;
        }
      }
      // touching the mech
      const r = this.bossBox(b);
      if (b.state !== 'intro' && body.right > r.x0 + 6 && body.left < r.x1 - 6 && body.bottom > r.y0 && body.top < r.y1) {
        if (b.state === 'stagger' && !b.stomped && body.velocity.y > 40 && body.bottom < r.y0 + 26) {
          b.stomped = true;
          body.setVelocityY(-480);
          this.airJumps = 1;
          this.banner('Head stomp!');
          this.damageBoss(5);
        } else if (this.power.star > 0) {
          if (b.touchCD <= 0) {
            b.touchCD = 0.4;
            this.damageBoss(1);
          }
        } else if (b.touchCD <= 0 || this.invuln <= 0) {
          this.hit('enemy');
        }
      }
    }

    // the mech's projectiles
    const camX = this.camLock;
    this.bossShots = this.bossShots.filter((sh) => {
      sh.img.x += sh.vx * edt;
      sh.img.y += sh.vy * edt;
      sh.vy += sh.g * edt;
      let gone = sh.img.x < camX - 40 || sh.img.x > camX + W + 40 || sh.img.y < -40;
      if (!gone && Math.hypot(sh.img.x - body.center.x, sh.img.y - body.center.y) < 18) {
        this.hit('enemy');
        gone = true;
      }
      if (!gone && sh.img.y >= this.arenaTop - 8) {
        gone = true;
        if (sh.mortar) {
          this.sfx.boom();
          this.debris(sh.img.x, this.arenaTop - 10, 'spark', this.reduced ? 3 : 8, 1.2);
          this.dust(sh.img.x, this.arenaTop, 5, 40, 20, 1.3);
          if (Math.abs(body.center.x - sh.img.x) < 36 && body.bottom > this.arenaTop - 40) this.hit('enemy');
        }
      }
      if (gone) sh.img.destroy();
      return !gone;
    });
    this.bossWaves = this.bossWaves.filter((w) => {
      w.img.x += w.vx * edt;
      let gone = w.img.x < camX - 40 || w.img.x > camX + W + 40;
      if (!gone && Math.abs(body.center.x - w.img.x) < 20 && body.bottom > this.arenaTop - 22) this.hit('enemy');
      if (gone) w.img.destroy();
      return !gone;
    });

    // plenty of power-ups: a few waiting at the start, then a new one every few seconds (never more than four lying about)
    if (b.state !== 'dead') {
      this.bossAmmoT -= dt;
      if (this.bossAmmoT <= 0) {
        this.bossAmmoT = 4.5;
        this.dropBossPowerUp(camX);
      }
    }
  }

  private dropBossPowerUp(camX: number, quiet = false) {
    if (this.items.filter((i) => i.kind === 'pu' && !i.taken).length >= 4) return;
    const pool: PowerId[] = ['gun', 'gun', 'shield', 'star', 'spring', 'turbo', 'magnet', 'oil'];
    if (this.power.gun < 15) pool.push('gun', 'gun', 'gun'); // short on ammo: guns are far more likely
    if (this.lives <= 2) pool.push('shield', 'shield', 'star');
    const id = pool[Math.floor(Math.random() * pool.length)];
    const x = camX + 160 + Math.random() * (W - 320);
    this.dropItem(x, this.arenaTop - 75, id);
    if (!quiet) this.announce(`${id === 'gun' ? 'A blaster crate' : 'A ' + POWER[id].label.toLowerCase() + ' power-up'} is falling into the arena.`);
  }

  private bossAttack(b: BossState, enraged: boolean) {
    const s = b.sprite;
    const mx = s.x + (s.flipX ? -b.def.muzzle[0] : b.def.muzzle[0]);
    const my = s.y + b.def.muzzle[1];
    const px = this.body.center.x, py = this.body.center.y;
    s.setTexture(`boss-${this.level.style}-a`);
    b.state = 'walk';
    b.cd = enraged ? 1.1 : 1.8;
    if (b.attack === 'volley') {
      const n = enraged ? 3 : 2;
      for (let i = 0; i < n; i++) this.time.delayedCall(i * 260, () => b.state !== 'dead' && s.active && this.fireBossShot(mx, my, this.body.center.x, this.body.center.y, 270));
      this.sfx.bossFire();
    } else if (b.attack === 'spread') {
      const a0 = Math.atan2(py - my, px - mx);
      for (const d of enraged ? [-0.35, -0.17, 0, 0.17, 0.35] : [-0.28, 0, 0.28]) this.fireBossShot(mx, my, mx + Math.cos(a0 + d) * 200, my + Math.sin(a0 + d) * 200, 250);
      this.sfx.bossFire();
    } else if (b.attack === 'mortar') {
      const n = enraged ? 3 : 2;
      for (let i = 0; i < n; i++) this.lobBossShot(mx, my, px + (i - (n - 1) / 2) * 110 + this.facing * 30 * i);
      this.sfx.bossMortar();
    } else {
      s.y = this.arenaTop;
      this.sfx.bossStomp();
      if (!this.reduced) this.cameras.main.shake(260, 0.01);
      this.dust(s.x, this.arenaTop, 10, 90, 20, 1.8);
      for (const dir of [-1, 1]) {
        const img = this.add.image(s.x + dir * 60, this.arenaTop - 14, 'boss-wave').setDepth(9).setFlipX(dir < 0);
        this.bossWaves.push({ img, vx: dir * (enraged ? 330 : 260) });
      }
      b.state = 'stagger';
      b.timer = 2;
      b.stomped = false;
      s.setScale(1.06, 0.55);
      this.announce('The mech slammed down and is kneeling. Stomp its head.');
    }
  }

  private addFlag(b: Building) {
    const x = b.x + 60;
    const sprite = this.add.image(x, b.top - 38, 'flag-off').setDepth(5);
    this.flags.push({ x, top: b.top, sprite, on: false });
  }

  private reachFlag(f: Flag) {
    f.on = true;
    f.sprite.setTexture('flag-on');
    this.checkpoint = { x: f.x, top: f.top, flag: true };
    const full = this.live().startLives;
    const topUp = this.lives < full;
    if (topUp) this.lives = full;
    this.sfx.checkpoint();
    this.burst(f.x + 14, f.top - 60, [0x3ddc84, 0xffffff, 0xffd23a], 26, 230);
    this.banner('Checkpoint!');
    this.announce(`Checkpoint reached.${topUp ? ` Lives topped up to ${full}.` : ''}`);
    this.debris(f.x, f.top - 60, 'spark', this.reduced ? 3 : 10, 1);
    this.emitHud(true);
  }

  private updatePlatforms(dt: number) {
    for (const p of this.plats) {
      const body = p.img.body as Phaser.Physics.Arcade.Body;
      if (p.kind === 'moving') {
        const w = 1.6;
        body.setVelocityX(Math.cos(this.t * w + p.phase) * p.amp * w);
      } else if (p.kind === 'secret') {
        // faint until Iggy is close, then it shines
        const near = Math.abs(this.body.center.x - p.img.x);
        p.img.setAlpha(this.reduced ? 1 : Phaser.Math.Clamp(1 - (near - 200) / 260, 0.3, 1));
      } else if (p.state === 'idle' && p.stood) {
        p.state = 'shaking';
        p.timer = 0.7;
        this.sfx.crumble();
      } else if (p.state === 'shaking') {
        p.timer -= dt;
        if (!this.reduced) p.img.x = p.baseX + Math.sin(this.t * 60) * 2;
        if (p.timer <= 0) {
          p.state = 'falling';
          body.setAllowGravity(true).setImmovable(false);
          body.setVelocityY(40);
          this.debris(p.img.x, p.img.y, 'brick', this.reduced ? 2 : 6, 0.8);
          this.sfx.bricks();
        }
      } else if (p.state === 'falling') {
        p.img.alpha = Math.max(0, p.img.alpha - dt * 1.2);
      }
      p.stood = false;
    }
    for (const f of this.flags) {
      if (!f.on && Math.abs(this.body.center.x - f.x) < 26 && Math.abs(this.body.bottom - f.top) < 70) this.reachFlag(f);
    }
  }

  private addRing(x: number, y: number) {
    const back = this.add.image(x, y, 'ring-back').setDepth(6);
    const sprite = this.add.image(x, y, 'ring-front').setDepth(11);
    this.items.push({ kind: 'ring', sprite, back, baseY: y, phase: Math.random() * 6 });
  }

  /** Iggy flew through a ring. Rings passed in quick succession build a chain worth more each time. */
  private passRing(it: Item) {
    it.taken = true;
    this.rings++;
    this.ringChain = this.ringTimer > 0 ? this.ringChain + 1 : 1;
    this.ringTimer = 2.2;
    const pts = 20 * Math.min(this.ringChain, 5);
    this.bonus += pts;
    this.sfx.ring(this.ringChain);
    this.debris(it.sprite.x, it.sprite.y, 'spark', this.reduced ? 3 : 9, 1);
    if (!this.reduced) {
      const echo = this.add.image(it.sprite.x, it.sprite.y, 'ring-front').setDepth(11).setTint(0xffffff);
      this.tweens.add({ targets: echo, scale: 2.2, alpha: 0, duration: 380, onComplete: () => echo.destroy() });
    }
    const idx = suitFor(this.rings);
    if (idx !== this.suitIdx) {
      this.suitIdx = idx;
      if (idx === 4) this.game.events.emit('achieve', 'gold-suit');
      const s = SUITS[idx];
      this.sfx.suit();
      this.banner(`New suit: ${s.name}`);
      this.announce(`New suit unlocked: ${s.name}. ${s.blurb}${ABILITY[idx] ? ' New ability. ' + ABILITY[idx] : ''}`);
      this.dust(this.body.center.x, this.body.bottom, 8, 50, 40, 1.4);
      this.debris(this.body.center.x, this.body.center.y, 'cog', 6, 1.2);
      this.debris(this.body.center.x, this.body.center.y, 'bolt', 6, 1.2);
      this.burst(this.body.center.x, this.body.center.y, [s.body, s.trim, 0xffffff], 28, 240);
      if (this.flash && !this.reduced) {
        this.flash.setAlpha(0.18);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 400 });
      }
    }
    this.announce(this.ringChain > 1 ? `Ring chain times ${this.ringChain}. Plus ${pts} points.` : `Ring. Plus ${pts} points.`);
  }

  private addFlyer(b: Building) {
    const style = this.level.style as FlyerStyle;
    const x = b.x + b.w / 2 + this.between(-40, 40);
    const y = b.top - this.between(105, 150);
    const sprite = this.add.image(x, y, `flyer-${style}-a`).setDepth(8);
    this.items.push({
      kind: 'flyer', sprite, baseY: y, phase: this.rand() * 6, hp: 2,
      flyer: { style, homeX: x, homeY: y, state: 'idle', timer: 0, cd: 2.5 + this.rand() * 2, vx: 0, vy: 0, frame: 0, fromX: x, fromY: y },
    });
  }

  private updateFlyer(it: Item, dt: number) {
    const f = it.flyer!, s = it.sprite, body = this.body;
    const px = body.center.x, py = body.center.y;
    f.frame += dt * 7;
    s.setTexture(f.state === 'dive' ? `flyer-${f.style}-dive` : `flyer-${f.style}-f${Math.floor(f.frame) % 6}`);
    f.timer -= dt;
    f.cd -= dt;
    if (f.state === 'idle') {
      s.x = f.homeX + Math.sin(this.t * 0.9 + it.phase) * 70;
      s.y = f.homeY + Math.sin(this.t * 1.7 + it.phase) * 26;
      if (f.cd <= 0 && Math.abs(px - s.x) < 200 && py > s.y) {
        f.state = 'windup';
        f.timer = 0.85;
        s.setTint(0xff7070); // warning: it is about to dive
        this.sfx.zap();
      }
    } else if (f.state === 'windup') {
      if (!this.reduced) s.x += Math.sin(this.t * 70) * 1.2;
      if (f.timer <= 0) {
        const dx = px - s.x, dy = py - s.y, len = Math.hypot(dx, dy) || 1;
        f.vx = (dx / len) * 250;
        f.vy = (dy / len) * 250;
        f.state = 'dive';
        f.timer = 0.6;
        s.clearTint();
      }
    } else if (f.state === 'dive') {
      s.x += f.vx * dt;
      s.y += f.vy * dt;
      const roof = this.buildings.find((b) => s.x >= b.x && s.x <= b.x + b.w);
      if (roof && s.y > roof.top - 16) s.y = roof.top - 16;
      if (f.timer <= 0) {
        f.state = 'rise';
        f.timer = 1.1;
        f.fromX = s.x;
        f.fromY = s.y;
      }
    } else {
      const u = 1 - Math.max(0, f.timer) / 1.1;
      s.x = Phaser.Math.Linear(f.fromX, f.homeX, u);
      s.y = Phaser.Math.Linear(f.fromY, f.homeY, u);
      if (f.timer <= 0) {
        f.state = 'idle';
        f.cd = 4.5 + Math.random() * 2.5;
      }
    }
    // contact: land on it from above to stomp it, otherwise it hurts
    if (body.right > s.x - 17 && body.left < s.x + 17 && body.bottom > s.y - 14 && body.top < s.y + 14) {
      if (this.smashing()) this.defeatPatrol(it, 'stomp');
      else if (body.velocity.y > 40 && body.bottom < s.y + 2) {
        this.defeatPatrol(it, 'stomp');
        body.setVelocityY(-450);
        this.airJumps = 1;
      } else this.hit('enemy');
    }
  }

  private addPatrol(b: Building) {
    const crawler = ['drowned', 'void', 'spores'].includes(this.level.style);
    const kind = crawler ? 'crawler' : 'skeleton';
    const half = Math.min(130, (b.w - 60) / 2);
    const cx = b.x + b.w / 2 + this.between(-20, 20);
    const h = this.textures.getFrame(`${kind}-a`).height;
    const sprite = this.add.image(cx, b.top - h / 2, `${kind}-a`).setDepth(6);
    this.items.push({
      kind: 'patrol', sprite, baseY: sprite.y, phase: 0, hp: 2,
      walker: { kind, min: Math.max(b.x + 24, cx - half), max: Math.min(b.x + b.w - 24, cx + half), dir: this.rand() < 0.5 ? 1 : -1, speed: 55 + this.rand() * 25 + this.difficulty() * 35, frame: 0 },
    });
  }

  private addMine(x: number, top: number) {
    const sprite = this.add.image(x, top - 5, 'mine-war-a').setDepth(6);
    this.items.push({ kind: 'mine', sprite, baseY: sprite.y, phase: this.rand() * 3 });
  }

  /** An explosion on the ground: noise, shake, debris and a flash. It only hurts when Iggy is close. */
  private blast(x: number, groundY: number, radius = 56) {
    this.sfx.explosion();
    if (!this.reduced) this.cameras.main.shake(220, 0.012);
    this.debris(x, groundY - 6, 'brick', this.reduced ? 3 : 10, 1.8);
    this.debris(x, groundY - 10, 'spark', this.reduced ? 3 : 12, 1.6);
    this.dust(x, groundY, 9, 60, 30, 1.8);
    this.burst(x, groundY - 14, [0xffd23a, 0xff7a1a, 0xffffff, 0x6b5a4a], 26, 300);
    const flash = this.add.circle(x, groundY - 12, radius * 0.6, 0xffb347, 0.85).setDepth(13);
    this.tweens.add({ targets: flash, scale: this.reduced ? 1.4 : 2.4, alpha: 0, duration: 380, onComplete: () => flash.destroy() });
    const b = this.body;
    if (Math.abs(b.center.x - x) < radius && b.bottom > groundY - 80 && this.invuln <= 0) this.hit('blast');
  }

  private detonateMine(it: Item, hurt: boolean, points = 0) {
    it.taken = true;
    if (points) this.bonus += points;
    this.blast(it.sprite.x, it.sprite.y + 5, hurt ? 56 : 0.1);
  }

  /** A soldier fires: a bright bullet flies flat along the roof at chest height, so ducking or jumping clears it. */
  private soldierFire(s: Phaser.GameObjects.Image, dir: number) {
    const x = s.x + dir * 20, y = s.y - 8;
    this.sfx.rifle();
    this.burst(x, y, [0xffe27a, 0xffffff], 5, 120);
    const img = this.add.rectangle(x, y, 14, 4, 0xffe27a).setStrokeStyle(1, 0xffffff).setDepth(9);
    const trail = this.add.rectangle(x - dir * 12, y, 22, 2, 0xffa63a, 0.6).setDepth(8);
    this.bullets.push({ img, trail, vx: dir * 330, y });
  }

  private updateBullets(dt: number) {
    const cam = this.cameras.main, body = this.body;
    this.bullets = this.bullets.filter((b) => {
      b.img.x += b.vx * dt;
      b.trail.x = b.img.x - Math.sign(b.vx) * 14;
      const x = b.img.x;
      const wall = this.buildings.some((bb) => x >= bb.x && x <= bb.x + bb.w && b.y > bb.top + 2);
      const off = x < cam.scrollX - 80 || x > cam.scrollX + W + 80;
      const hitsIggy = body.right > x - 7 && body.left < x + 7 && body.bottom > b.y - 3 && body.top < b.y + 3;
      if (hitsIggy) {
        if (this.smashing() || this.power.star > 0) this.burst(x, b.y, [0xffffff, 0xffe27a], 6, 140);
        else this.hit('enemy');
      }
      if (hitsIggy || wall || off) {
        if (wall) this.debris(x, b.y, 'spark', 2, 0.5);
        b.img.destroy();
        b.trail.destroy();
        return false;
      }
      return true;
    });
  }

  /** The Iron Marshal's artillery: a shell whistles in, a marker shows where it will land, then it explodes. */
  private updateShells(dt: number) {
    if (this.level.style !== 'war') return;
    if (!this.over && this.arenaX === null) {
      this.shellCD -= dt;
      if (this.shellCD <= 0) {
        this.shellCD = Math.max(1.4, 3.3 - this.difficulty() * 1.6) + Math.random() * 1.6;
        const px = this.body.center.x;
        for (let tries = 0; tries < 6; tries++) {
          const x = px + this.between(-90, 380) * (Math.random() < 0.8 ? 1 : 0.5);
          const b = this.buildings.find((bb) => x >= bb.x + 24 && x <= bb.x + bb.w - 24);
          if (!b) continue;
          this.shells.push({ x, top: b.top, state: 'warn', t: 0, gfx: this.add.graphics().setDepth(12), boomed: false });
          this.sfx.whistle();
          if (!this.shellWarned) {
            this.shellWarned = true;
            this.announce('Artillery! Listen for the whistle and watch for the orange marker on the ground, then get clear before the shell lands.');
          }
          break;
        }
      }
    }
    this.shells = this.shells.filter((sh) => {
      sh.t += dt;
      sh.gfx.clear();
      if (sh.state === 'warn') {
        const u = Math.min(1, sh.t / 1.15);
        // the shell itself, streaking in from up and to the right
        const sx = sh.x + 120 * (1 - u), sy = sh.top - 420 * (1 - u);
        sh.gfx.lineStyle(3, 0xffd9a0, 0.7).lineBetween(sx + 30 * (1 - u) + 8, sy - 38, sx, sy);
        sh.gfx.fillStyle(0x2a2420, 1).fillCircle(sx, sy, 5).lineStyle(2, 0xffb060, 1).strokeCircle(sx, sy, 5);
        // the marker on the ground (steady when motion is reduced)
        if (this.reduced || Math.floor(sh.t / 0.14) % 2 === 0) {
          sh.gfx.lineStyle(3, 0xff7a1a, 1).strokeEllipse(sh.x, sh.top - 3, 78, 16);
          sh.gfx.lineStyle(3, 0xffd23a, 1).lineBetween(sh.x - 10, sh.top - 3, sh.x + 10, sh.top - 3).lineBetween(sh.x, sh.top - 8, sh.x, sh.top + 2);
        }
        if (sh.t >= 1.15) {
          sh.state = 'boom';
          sh.t = 0;
        }
        return true;
      }
      if (!sh.boomed) {
        sh.boomed = true;
        this.blast(sh.x, sh.top, 58);
      }
      sh.gfx.destroy();
      return false;
    });
  }

  private addHazard(x: number, top: number) {
    const style = this.level.style;
    const type: Haz['type'] = style === 'drowned' ? 'vent' : style === 'void' || style === 'spores' ? 'laser' : 'debris';
    const gfx = this.add.graphics().setDepth(8);
    const sprite = this.add.image(x, top, 'dust').setAlpha(0);
    this.items.push({ kind: 'hazard', sprite, baseY: top, phase: 0, hz: { type, gfx, x, top, state: type === 'debris' ? 'idle' : 'idle', t: type === 'debris' ? 0 : this.rand() * 2, fall: 0, ticks: 0 } });
  }

  private updateHazard(it: Item, dt: number) {
    const h = it.hz!, body = this.body, g = h.gfx;
    const near = Math.abs(body.center.x - h.x);
    if (near > 900) return; // far away: nothing to draw or time
    g.clear();
    const col = this.level.style === 'void' ? 0xff4fd8 : this.level.style === 'spores' ? 0x7dffc0 : this.level.style === 'drowned' ? 0xbfefff : 0xff7a1a;
    const warnBlink = (period: number) => Math.floor(h.t / period) % 2 === 0;
    const tick = (every: number) => {
      const n = Math.floor(h.t / every);
      if (n !== h.ticks) { h.ticks = n; this.sfx.warn(); }
    };
    h.t += dt;
    const reach = (x0: number, x1: number, y0: number, y1: number) => body.right > x0 && body.left < x1 && body.bottom > y0 && body.top < y1;
    if (h.type === 'debris') {
      if (h.state === 'idle') {
        if (near < 300) { h.state = 'warn'; h.t = 0; h.ticks = -1; this.announce('Look out: debris is about to fall.'); }
        return;
      }
      const hover = h.top - 360;
      if (h.state === 'warn') {
        tick(0.25);
        // a warning mark on the roof (a bar and a dot) and the block shaking up in the sky
        if (warnBlink(0.18) || this.reduced) { g.fillStyle(col, 1).fillRect(h.x - 4, h.top - 46, 8, 26).fillRect(h.x - 4, h.top - 14, 8, 8); }
        g.fillStyle(0x1a1410, 1).fillRect(h.x - 15 + (this.reduced ? 0 : Math.sin(h.t * 50) * 2), hover - 15, 30, 30).lineStyle(3, col, 1).strokeRect(h.x - 15, hover - 15, 30, 30);
        if (h.t >= 1) { h.state = 'active'; h.fall = hover; this.sfx.warn(); }
        return;
      }
      if (h.state === 'active') {
        h.fall += 720 * dt;
        const y = Math.min(h.fall, h.top - 15);
        g.fillStyle(0x1a1410, 1).fillRect(h.x - 15, y - 15, 30, 30).lineStyle(3, col, 1).strokeRect(h.x - 15, y - 15, 30, 30);
        if (reach(h.x - 15, h.x + 15, y - 15, y + 15) && this.invuln <= 0) this.hit('enemy');
        if (h.fall >= h.top - 15) {
          h.state = 'done';
          this.sfx.crash();
          this.debris(h.x, h.top - 8, 'brick', this.reduced ? 3 : 9, 1.3);
          this.dust(h.x, h.top, 7, 44, 14, 1.1);
          it.taken = true;
        }
      }
      return;
    }
    if (h.type === 'vent') {
      // off 2.2s, warning bubbles 0.8s, scalding jet 0.9s
      const cyc = h.t % 3.9;
      g.fillStyle(0x2a3a44, 1).fillRect(h.x - 18, h.top - 6, 36, 6);
      if (cyc >= 2.2 && cyc < 3) {
        h.state = 'warn'; tick(0.25);
        for (let i = 0; i < 4; i++) g.fillStyle(col, 0.9).fillCircle(h.x - 9 + i * 6, h.top - 14 - ((h.t * 40 + i * 9) % 26), 2.5);
      } else if (cyc >= 3) {
        if (h.state !== 'active') { h.state = 'active'; this.sfx.jet(); }
        g.fillStyle(col, 0.85).fillRect(h.x - 14, h.top - 120, 28, 114).fillStyle(0xffffff, 0.9).fillRect(h.x - 5, h.top - 120, 10, 114);
        if (reach(h.x - 14, h.x + 14, h.top - 120, h.top) && this.invuln <= 0) this.hit('enemy');
      } else h.state = 'idle';
      return;
    }
    // laser grid: two posts and a beam low enough that it has to be jumped
    const cyc = h.t % 3.3;
    const half = 70, y = h.top - 20;
    g.fillStyle(0x2a2f3d, 1).fillRect(h.x - half - 6, h.top - 40, 8, 40).fillRect(h.x + half - 2, h.top - 40, 8, 40);
    g.fillStyle(col, 1).fillCircle(h.x - half - 2, y, 4).fillCircle(h.x + half + 2, y, 4);
    if (cyc >= 1.6 && cyc < 2.2) {
      h.state = 'warn'; tick(0.2);
      if (warnBlink(0.1) || this.reduced) g.lineStyle(1, col, 1).lineBetween(h.x - half, y, h.x + half, y);
    } else if (cyc >= 2.2) {
      if (h.state !== 'active') { h.state = 'active'; this.sfx.laser(); }
      g.lineStyle(6, col, 0.45).lineBetween(h.x - half, y, h.x + half, y).lineStyle(2, 0xffffff, 1).lineBetween(h.x - half, y, h.x + half, y);
      if (reach(h.x - half, h.x + half, y - 4, y + 4) && this.invuln <= 0) this.hit('pylon');
    } else h.state = 'idle';
  }

  private addItem(kind: Item['kind'], x: number, y: number, power?: PowerId) {
    const war = this.level.style === 'war';
    const wallTex = ['wall-war-dirt', 'wall-war-block', 'wall-war-hog'][Math.abs(Math.floor(x / 7)) % 3];
    const tex = war && kind === 'pylon' ? 'wire-war' : war && kind === 'wall' ? wallTex : kind === 'secret' ? 'secret' : kind === 'bb' ? 'breadboard' : kind === 'pylon' ? 'pylon' : kind === 'wall' ? 'wall' : POWER[power!].tex;
    const inSpan = kind === 'bb' && !!this.layerSpan && x >= this.layerSpan[0] && x <= this.layerSpan[1];
    if (kind === 'bb' && !inSpan) this.bbSpawned++;
    const sprite = this.add.image(x, y, tex).setDepth(kind === 'pylon' || kind === 'wall' ? 6 : 7);
    this.items.push({ kind, power, sprite, baseY: y, phase: Math.random() * 6, hp: kind === 'wall' ? 5 : undefined, bonus: inSpan || undefined });
  }

  /** A power-up that drifts down from above the screen (it just appears where it lands if motion is reduced). */
  private dropItem(x: number, y: number, power: PowerId) {
    this.addItem('pu', x, y, power);
    const it = this.items[this.items.length - 1];
    if (this.reduced) return;
    it.falling = true;
    it.sprite.y = -40;
  }

  private cull() {
    // never delete the roofs from the checkpoint onward: Iggy may have to restart there
    const left = Math.min(this.cameras.main.scrollX, this.checkpoint.x) - 300;
    this.buildings = this.buildings.filter((b) => {
      if (b.x + b.w < left) {
        b.collider.destroy();
        b.gfx.destroy();
        b.zone.destroy();
        return false;
      }
      return true;
    });
    this.plats = this.plats.filter((p) => {
      if (p.img.x < left || p.img.y > H + 100 || p.img.alpha <= 0) {
        p.collider.destroy();
        p.img.destroy();
        return false;
      }
      return true;
    });
    this.flags = this.flags.filter((f) => {
      if (f.x < left) {
        f.sprite.destroy();
        return false;
      }
      return true;
    });
    this.items = this.items.filter((it) => {
      if (it.taken || it.sprite.x < left) {
        if (it.kind === 'bb' && !it.bonus && !it.taken && !this.bbMissed) {
          this.bbMissed = true;
          this.announce('A breadboard got away. No perfect run this time.');
          this.emitHud(true);
        }
        it.sprite.destroy();
        it.back?.destroy();
        it.hz?.gfx.destroy();
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

  /** A fan of coloured specks that fly out, fall and fade. Fewer (and no spin) when motion is reduced. */
  private burst(x: number, y: number, colors: number[], n: number, speed: number) {
    const count = this.reduced ? Math.ceil(n / 4) : n;
    for (let i = 0; i < count; i++) {
      const dot = this.add.circle(x, y, 2 + Math.random() * 2.5, colors[i % colors.length]).setDepth(13);
      const a = Math.random() * Math.PI * 2, v = speed * (0.35 + Math.random() * 0.65);
      const vx = Math.cos(a) * v, vy = Math.sin(a) * v - speed * 0.25;
      const dur = 650 + Math.random() * 500;
      this.tweens.addCounter({
        from: 0, to: 1, duration: dur,
        onUpdate: (tw) => {
          const p = tw.getValue() ?? 0, tt = (p * dur) / 1000;
          dot.x = x + vx * tt;
          dot.y = y + vy * tt + 380 * tt * tt;
          dot.setAlpha(1 - p * p);
        },
        onComplete: () => dot.destroy(),
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

  /** Crouch / stand. The hitbox keeps its feet where they are and only loses height from the top. */
  private setDucked(on: boolean) {
    if (on === this.ducked) return;
    this.ducked = on;
    this.body.setSize(22, on ? 26 : 46, false);
    this.body.setOffset(0, on ? 20 : 0);
    this.announce(on ? 'Ducking. Shots now fly low, at small targets on the ground.' : '');
  }

  private shoot(big = false) {
    const lvl = this.gun();
    const f = this.facing;
    const x = this.body.center.x + f * 50, y = this.body.bottom - (this.ducked ? 23 : 36);
    const spawn = (kind: 'bolt' | 'rocket', angle: number, yOff: number) => {
      const speed = kind === 'rocket' ? ROCKET_SPEED : BLASTER_BOLT_SPEED;
      const vx = f * speed * Math.cos(angle), vy = speed * Math.sin(angle);
      const img = this.add.image(x, y + yOff, kind === 'rocket' ? 'rocket' : 'shot').setDepth(9);
      img.setRotation(Math.atan2(vy, vx));
      if (big) img.setScale(kind === 'rocket' ? 1.5 : 2.4);
      this.shots.push({ s: img, vx, vy, kind, trail: 0, big, hit: big ? new Set() : undefined });
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
    // ammo: rockets cost 2, everything else 1 per trigger pull; a charged shot costs double
    this.power.gun -= (lvl >= 4 ? 2 : 1) * (big ? 2 : 1);
    if (this.power.gun <= 0) {
      this.power.gun = 0;
      this.gunLevel = 0;
      this.announce('Out of ammo. The gun is gone.');
    }
    this.emitHud();
  }

  /** Glow around Iggy while the fire button is held: grows, then pulses once it's charged. */
  private updateChargeFx() {
    const on = this.charge > 0.08;
    if (!on) {
      this.chargeFx?.setVisible(false);
      return;
    }
    if (!this.chargeFx) this.chargeFx = this.add.circle(0, 0, 10, 0xffe14a, 0.35).setStrokeStyle(3, 0xffffff, 0.9).setDepth(11);
    const ready = this.charge >= CHARGE_MIN;
    const pulse = ready && !this.reduced ? 1 + 0.12 * Math.sin(this.time.now / 45) : 1;
    this.chargeFx.setVisible(true).setPosition(this.body.center.x + this.facing * 30, this.body.bottom - (this.ducked ? 23 : 36));
    this.chargeFx.setRadius((8 + 16 * (this.charge / CHARGE_FULL)) * pulse);
    this.chargeFx.setFillStyle(ready ? 0xffffff : 0xffe14a, ready ? 0.6 : 0.35);
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
      if (this.boss && !sh.bossHit && this.inBossRect(s.x, s.y)) {
        if (sh.kind === 'rocket') this.explode(s.x, s.y, sh.big ? 150 : 85);
        else this.damageBoss(sh.big ? 3 : 1);
        if (sh.big && sh.kind === 'bolt') sh.bossHit = true;
        else {
          s.destroy();
          return false;
        }
      }
      const hitIt = this.items.find((it) => !it.taken && !sh.hit?.has(it) && (it.kind === 'pylon' || it.kind === 'wall' || it.kind === 'patrol' || it.kind === 'flyer' || it.kind === 'mine') && Math.abs(s.x - it.sprite.x) < (it.kind === 'patrol' ? 16 : it.kind === 'flyer' ? 22 : it.kind === 'mine' ? 20 : 18) && Math.abs(s.y - it.sprite.y) < (it.kind === 'mine' ? 34 : it.kind === 'wall' ? 34 : it.kind === 'patrol' ? it.sprite.height / 2 + 4 : it.kind === 'flyer' ? 20 : 24));
      const hitBuilding = this.buildings.some((b) => s.x >= b.x && s.x <= b.x + b.w && s.y > b.top + 2);
      const off = s.x < cam.scrollX - 60 || s.x > cam.scrollX + W + 120 || s.y < -60 || s.y > H + 60;
      if (hitIt || hitBuilding) {
        const dmg = sh.big ? 3 : 1;
        if (sh.kind === 'rocket') this.explode(s.x, s.y, sh.big ? 150 : 85);
        else if (hitIt) hitIt.kind === 'mine' ? this.detonateMine(hitIt, false) : hitIt.kind === 'pylon' ? this.destroyPylon(hitIt) : hitIt.kind === 'patrol' || hitIt.kind === 'flyer' ? this.damagePatrol(hitIt, dmg) : this.damageWall(hitIt, dmg);
        else this.debris(s.x, s.y, 'spark', 2, 0.4);
      }
      if (sh.big && sh.kind === 'bolt' && hitIt && !hitBuilding) sh.hit!.add(hitIt); // charged bolts pierce targets
      else if (hitIt || hitBuilding || off) {
        s.destroy();
        return false;
      }
      return true;
    });
  }

  private damagePatrol(it: Item, dmg = 1) {
    it.hp = (it.hp ?? 1) - dmg;
    it.sprite.setTint(0xff8080);
    this.time.delayedCall(80, () => it.sprite.active && it.sprite.clearTint());
    this.debris(it.sprite.x, it.sprite.y, 'spark', 2, 0.6);
    if (it.hp <= 0) this.defeatPatrol(it, 'shot');
  }

  private defeatPatrol(it: Item, how: 'shot' | 'stomp') {
    if (how === 'stomp' && !(this.body.touching.down || this.body.blocked.down)) {
      if (++this.stompChain === 5) this.game.events.emit('achieve', 'stomp-5');
    }
    it.taken = true;
    this.bonus += how === 'stomp' ? 50 : 40;
    this.sfx.bricks();
    const name = it.flyer ? FLYER_NAME[it.flyer.style] : it.walker?.kind === 'crawler' ? 'crawler' : 'skeleton';
    this.debris(it.sprite.x, it.sprite.y, 'cog', 3, 1.2);
    this.debris(it.sprite.x, it.sprite.y, 'brick', this.reduced ? 4 : 10, 1.2);
    this.dust(it.sprite.x, it.sprite.y + 10, 5, 24, 14);
    this.announce(`${how === 'stomp' ? 'Stomped' : 'Shot'} a ${name}. Plus ${how === 'stomp' ? 50 : 40} points.`);
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

  private explode(x: number, y: number, radius = 85) {
    this.sfx.boom();
    this.debris(x, y, 'spark', this.reduced ? 4 : 16, radius > 100 ? 2.6 : 1.8);
    this.dust(x, y + 10, 8, 50, 26, 1.6);
    if (!this.reduced) this.cameras.main.shake(140, 0.004);
    const bs = this.boss;
    if (bs && bs.state !== 'dead' && Math.hypot(bs.sprite.x - x, bs.sprite.y - bs.sprite.displayHeight / 2 - y) < radius + 55) this.damageBoss(radius > 100 ? 6 : 3);
    for (const it of this.items) {
      if (it.taken || (it.kind !== 'pylon' && it.kind !== 'wall' && it.kind !== 'patrol' && it.kind !== 'flyer' && it.kind !== 'mine')) continue;
      if (Math.hypot(it.sprite.x - x, it.sprite.y - y) < radius) {
        if (it.kind === 'mine') this.detonateMine(it, false);
        else if (it.kind === 'pylon') this.destroyPylon(it);
        else if (it.kind === 'patrol' || it.kind === 'flyer') this.defeatPatrol(it, 'shot');
        else this.breakWall(it, true);
      }
    }
  }

  /**
   * True when Iggy's feet are at the obstacle's top edge, whether he is coming down onto it or just clipping it on the way up.
   * Only running into its side (feet well below the top) should cost him anything.
   */
  private landedOn(top: number): boolean {
    return this.body.bottom < top + 28;
  }

  /** Iggy jumps on top of a pylon or brick wall: it breaks, he bounces off unhurt and keeps his speed. */
  private stompObstacle(it: Item) {
    const wall = it.kind === 'wall';
    if (wall) this.breakWall(it, true);
    else this.destroyPylon(it);
    if (this.body.velocity.y >= 0) this.body.setVelocityY(-430);
    this.announce(wall ? 'Smashed a brick wall from above. Plus 25 points.' : 'Stomped a pylon. Plus 10 points.');
    this.emitHud(true);
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
    if (!it.bonus) this.bbCollected++;
    this.sfx.collect();
    this.debris(it.sprite.x, it.sprite.y, 'spark', this.reduced ? 2 : 5, 0.6);
    if (this.breadboards % LIFE_EVERY === 0) {
      if (this.lives < MAX_LIVES) this.lives++;
      this.sfx.suit();
      this.banner('Free life!');
      this.announce(`${this.breadboards} breadboards! Free life. You now have ${this.lives} lives.`);
      this.debris(this.body.center.x, this.body.center.y, 'spark', this.reduced ? 3 : 12, 1.2);
    }
    this.emitHud(true);
  }

  private collectSecret(it: Item) {
    it.taken = true;
    this.bonus += 500;
    this.sfx.secret();
    this.banner('Secret found!');
    this.announce('Secret found: the golden breadboard! Plus 500 points.');
    this.burst(it.sprite.x, it.sprite.y, [0xffd23a, 0xfff3b0, 0xffffff], 34, 260);
    this.game.events.emit('secret', this.level.id);
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
          ? `${name} with ${this.power.gun} shots! Tap X or F to shoot, or hold it to charge a big piercing shot and let go to fire. Ammo doesn't run out over time, so you can save it. Grab another gun to upgrade this one.`
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

  private hit(reason: 'pylon' | 'enemy' | 'blast' | 'fall') {
    if (this.over) return;
    if (reason === 'fall') this.setDucked(false);
    if (reason !== 'fall') {
      if (this.invuln > 0 || this.power.star > 0 || this.dashT > 0) return;
      if (this.boss && this.boss.state !== 'dead') this.bossHurtIggy = true;
      if (this.power.shield > 0) {
        this.power.shield = 0;
        this.invuln = 1;
        this.sfx.hurt();
        this.announce(reason === 'enemy' ? 'Shield absorbed the hit and broke.' : 'Shield absorbed the zap and broke.');
        this.debris(this.body.center.x, this.body.center.y, 'spark', 10, 1.4);
        this.emitHud(true);
        return;
      }
      // a hit knocks the suit down one level instead of costing a life; only the plain starting suit has nothing left to lose
      if (this.suitIdx > 0) {
        this.suitIdx--;
        this.rings = SUITS[this.suitIdx].need; // the suit comes from the ring count, so drop to exactly that suit's threshold
        this.sfx.hurt();
        this.stumble = 1;
        this.invuln = this.grace();
        this.debris(this.body.center.x, this.body.center.y, 'bolt', 5, 1.4);
        this.debris(this.body.center.x, this.body.center.y, 'cog', 4, 1.3);
        this.debris(this.body.center.x, this.body.center.y, 'spark', this.reduced ? 3 : 8, 1.4);
        this.body.setVelocity(-this.facing * 280, -380);
        this.announce(`${this.hitWord(reason)}! Suit downgraded to ${SUITS[this.suitIdx].name}.`);
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
    // losing a life strips the upgrades: back to the first suit, and the ring count starts again
    const lostSuit = this.suitIdx > 0;
    this.suitIdx = 0;
    this.rings = 0;
    const where = this.respawn();
    this.announce(
      (reason === 'fall' ? `Iggy fell. ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left.` : `${this.hitWord(reason)}! ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left.`) +
        (lostSuit ? ` Back to the ${SUITS[0].name} suit.` : '') + ` ${where}`,
    );
    this.invuln = this.grace();
    this.emitHud(true);
  }

  /** After losing a life Iggy restarts at the last checkpoint (the arena entrance during a boss fight), not where he died. */
  private respawn(): string {
    this.dashT = 0;
    this.pounding = false;
    this.body.setAllowGravity(true);
    const inArena = this.camLock !== null && this.arenaX !== null;
    const spot = inArena ? { x: this.arenaX! + 200, top: this.arenaTop } : this.checkpoint;
    this.setDucked(false);
    this.body.reset(spot.x, spot.top - 30);
    this.body.setVelocity(0, 0);
    this.stumble = 0;
    this.coyote = 0;
    this.airJumps = 1;
    this.slowT = 0;
    this.charge = 0;
    if (!inArena) this.cameras.main.scrollX = Math.max(-20, spot.x - 330);
    // clear anything nasty standing right where he lands
    this.items.forEach((it) => {
      if ((it.kind === 'pylon' || it.kind === 'patrol' || it.kind === 'wall' || it.kind === 'flyer' || it.kind === 'mine') && Math.abs(it.sprite.x - spot.x) < 110) it.taken = true;
    });
    this.bullets.forEach((b) => { b.img.destroy(); b.trail.destroy(); });
    this.bullets = [];
    this.shells.forEach((sh) => sh.gfx.destroy());
    this.shells = [];
    this.shellCD = Math.max(this.shellCD, 2.5);
    this.bossShots.forEach((sh) => sh.img.destroy());
    this.bossWaves.forEach((w) => w.img.destroy());
    this.bossShots = [];
    this.bossWaves = [];
    this.burst(spot.x, spot.top - 30, [0xffffff, 0x4af0ff], 16, 170);
    return inArena ? 'Back to the arena entrance.' : this.checkpoint.flag ? 'Back to the last checkpoint.' : 'Back to the start of the level.';
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
      this.announce(`Level complete! You destroyed ${BOSSES[this.level.style].name}.`);
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
    const state: GameOverState = { level: this.level.id, score, breadboards: this.breadboards, distance: Math.floor(this.maxX / 10), suit: SUITS[this.suitIdx].name, best, newBest, perfect: won && this.isPerfect(), untouched: won && !this.bossHurtIggy, mode: this.mode, time: Math.round(this.runTime * 1000), trace: won && this.mode === 'time' ? this.trace : undefined };
    this.game.events.emit(won ? 'complete' : 'gameover', state);
  }

  private score() {
    return Math.floor(Math.max(0, this.maxX) / 10) + this.breadboards * 25 + this.bonus;
  }

  /** Settings as the player has them right now (the Angular page keeps this registry entry up to date). */
  private live(): Settings {
    return (this.registry.get('settings') as Settings | undefined) ?? this.settings;
  }

  /** Touching things smashes them while invincible, dashing or ground-pounding. */
  private smashing() {
    return this.power.star > 0 || this.dashT > 0 || this.pounding;
  }

  private poundLand() {
    this.pounding = false;
    const body = this.body;
    const cx = body.center.x, by = body.bottom;
    this.sfx.pound();
    if (!this.reduced) this.cameras.main.shake(180, 0.008);
    this.dust(cx, by, 12, 70, 22, 1.5);
    this.burst(cx, by - 6, [0xffd23a, 0xffffff, 0xff7a1a], 24, 260);
    for (const it of [...this.items]) {
      if (it.taken || Math.abs(it.sprite.x - cx) > POUND_RADIUS || Math.abs(it.sprite.y - by) > 70) continue;
      if (it.kind === 'patrol') this.defeatPatrol(it, 'stomp');
      else if (it.kind === 'wall') this.breakWall(it, true);
      else if (it.kind === 'pylon') this.destroyPylon(it);
    }
  }

  /** Dash, ground pound and glide. They use the controls Iggy already has: Shoot with no gun, Duck in the air, and holding Jump. */
  private abilities(dt: number, ground: boolean, jumpDown: boolean, fireDown: boolean, duckDown: boolean) {
    const body = this.body, suit = this.suitIdx;
    const firePressed = fireDown && !this.firePrev, duckPressed = duckDown && !this.duckPrev;
    this.firePrev = fireDown;
    this.duckPrev = duckDown;
    this.dashCD = Math.max(0, this.dashCD - dt);
    if (suit >= 2 && firePressed && !this.gun() && this.dashCD <= 0 && this.dashT <= 0 && !this.pounding && !this.ducked) {
      this.dashT = DASH_TIME;
      this.dashCD = DASH_COOLDOWN;
      this.sfx.dash();
      this.dust(body.center.x - this.facing * 10, body.bottom, 5, 36, 8, 1);
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      body.setAllowGravity(false);
      body.setVelocity(this.facing * DASH_V, 0);
      if (this.dashT <= 0) {
        this.dashT = 0;
        body.setAllowGravity(true);
        body.setVelocityX(this.facing * RUN);
      }
      return;
    }
    if (suit >= 3 && !ground && duckPressed && !this.pounding) {
      this.pounding = true;
      this.spinT = 0;
      this.sfx.poundStart();
    }
    if (this.pounding) {
      if (ground) this.poundLand();
      else {
        body.setVelocityX(0);
        body.setVelocityY(Math.max(body.velocity.y, POUND_V));
      }
      return;
    }
    if (suit >= 4 && !ground && jumpDown && this.airJumps === 0 && body.velocity.y > GLIDE_FALL) body.setVelocityY(GLIDE_FALL);
  }

  /** how worn Iggy's joints are right now: oil takes the rattle out of them */
  private looseNow() {
    return this.power.oil > 0 ? 0 : SUITS[this.suitIdx].loose;
  }

  private hitWord(reason: string) {
    return reason === 'enemy' ? 'Bonked' : reason === 'blast' ? 'Blasted' : 'Zapped';
  }

  private grace() {
    return this.live().longGrace ? 3.6 : 1.8;
  }

  private isBound(code: string) {
    const k = this.live().keys;
    return k.left.includes(code) || k.right.includes(code) || k.jump.includes(code) || k.duck.includes(code) || k.fire.includes(code);
  }

  /** Standard-mapping gamepad: left stick or d-pad to move/duck, A or up to jump, X, B or a trigger to shoot. */
  private padState() {
    const none = { left: false, right: false, jump: false, duck: false, fire: false };
    let pads: (Gamepad | null)[] = [];
    try { pads = Array.from(navigator.getGamepads?.() ?? []); } catch { return none; }
    const pad = pads.find((g) => g && g.connected);
    if (!pad) return none;
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
    return {
      left: x < -0.45 || b(14),
      right: x > 0.45 || b(15),
      jump: b(0) || b(12) || y < -0.7,
      duck: y > 0.6 || b(13),
      fire: b(2) || b(1) || b(7) || b(5),
    };
  }

  private held(action: 'left' | 'right' | 'jump' | 'duck' | 'fire') {
    return this.live().keys[action].some((c) => this.down.has(c));
  }

  private emitHud(force = false) {
    const next = SUITS[this.suitIdx + 1];
    const state: HudState = {
      level: `Level ${this.level.number}: ${this.level.name}${this.mode === 'time' ? ' (Time attack)' : this.mode === 'endless' ? ' (Endless)' : this.seed ? ' (Daily challenge)' : ''}`,
      goal: BOSS_SCORE,
      mode: this.mode,
      time: Math.floor(this.runTime),
      boss: this.boss && this.boss.state !== 'dead' ? { name: this.boss.def.name, hp: Math.max(0, this.boss.hp), max: this.boss.max } : null,
      score: this.score(),
      breadboards: this.breadboards,
      lives: this.lives,
      nextLifeIn: LIFE_EVERY - (this.breadboards % LIFE_EVERY),
      perfect: !this.bbMissed,
      suit: SUITS[this.suitIdx].name,
      nextSuit: next?.name ?? null,
      nextSuitNeed: next ? next.need - this.rings : 0,
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
  private errorCount = 0;

  /**
   * Phaser's loop only schedules the next frame after update() returns, so one thrown error would freeze the canvas for good
   * (the HTML page keeps working). Catch it, log it, and carry on with the next frame.
   */
  override update(time: number, delta: number) {
    try {
      this.step(time, delta);
    } catch (e) {
      this.errorCount++;
      if (this.errorCount <= 3 || this.errorCount % 200 === 0) console.error(`[Iggy's Quest] error in game loop (#${this.errorCount})`, e);
    }
  }

  private step(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    const edt = dt * (this.live().enemySpeed / 100); // assist: enemies and bosses can run slower than the world
    this.t += dt;
    if (this.body.touching.down || this.body.blocked.down) this.runPhase += (dt * Math.PI * 2 * Math.abs(this.body.velocity.x)) / 70; // one full stride every 70px
    if (!this.over) {
      this.runTime += dt;
      this.traceT += dt;
      while (this.traceT >= 0.1) {
        this.traceT -= 0.1;
        if (this.mode === 'time') this.trace.push(Math.round(this.body.center.x), Math.round(this.body.center.y));
      }
      if (this.ghostBox && this.ghost) {
        const f = this.runTime / 0.1, i = Math.floor(f);
        if ((i + 1) * 2 + 1 < this.ghost.length) {
          const u = f - i;
          this.ghostBox.setPosition(Phaser.Math.Linear(this.ghost[i * 2], this.ghost[i * 2 + 2], u), Phaser.Math.Linear(this.ghost[i * 2 + 1], this.ghost[i * 2 + 3], u));
        } else this.ghostBox.setPosition(-999, 0); // the ghost has finished
      }
      if (this.mode === 'time' && Math.floor(this.runTime) !== this.lastSec) {
        this.lastSec = Math.floor(this.runTime);
        this.emitHud(true);
      }
    }
    const cam = this.cameras.main;
    const body = this.body;

    // -- input
    const pad = this.padState();
    const left = this.held('left') || this.touch.left || pad.left;
    const right = this.held('right') || this.touch.right || pad.right;
    const jumpDown = this.held('jump') || this.touch.jump || pad.jump;
    if (jumpDown && !this.jumpHeld) this.jumpBuffer = 0.12;
    if (!jumpDown && this.jumpHeld && body.velocity.y < -200) body.setVelocityY(body.velocity.y * 0.55); // short hop on early release
    this.jumpHeld = jumpDown;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    if (!this.over) {
      const ground = body.touching.down || body.blocked.down;
      this.coyote = ground ? 0.1 : Math.max(0, this.coyote - dt);
      if (ground) this.airJumps = 1;

      const ramp = this.mode === 'endless' ? 1 + Math.min(0.5, Math.max(0, this.maxX) / 80000) : 1; // endless: the pace creeps up
      const speed = RUN * ramp * (this.power.turbo > 0 ? 1.35 : 1) * (this.power.oil > 0 ? 1.15 : 1) * (this.slowT > 0 ? 0.45 : 1);
      // duck: crouch on the ground (can still turn round and shoot, but can't run); the hitbox gets shorter
      this.setDucked(ground && (this.held('duck') || this.touch.duck || pad.duck));
      let target = left === right ? 0 : left ? -speed : speed;
      if (this.ducked) {
        if (target !== 0) this.facing = Math.sign(target);
        target = 0;
      }
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
        this.sfx.jump(this.looseNow());
        this.dust(body.center.x - this.wallDir * 11, body.center.y + 10, 4, 18, 10);
        this.debris(body.center.x - this.wallDir * 11, body.center.y, 'spark', this.reduced ? 1 : 4, 0.6);
      }

      // jump
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        const v = this.power.spring > 0 ? SPRING_JUMP : JUMP;
        body.setVelocityY(-v);
        this.jumpBuffer = 0;
        this.coyote = 0;
        this.sfx.jump(this.looseNow());
        this.dust(body.center.x, body.bottom, 5, 26, 14);
      }

      // double jump: one extra jump in mid-air
      if (this.jumpBuffer > 0 && !ground && this.coyote <= 0 && this.wallCoyote <= 0 && this.airJumps > 0) {
        const v = (this.power.spring > 0 ? SPRING_JUMP : JUMP) * 0.92;
        body.setVelocityY(-v);
        this.airJumps--;
        this.jumpBuffer = 0;
        this.spinT = this.reduced ? 0 : 0.5;
        this.sfx.air(this.looseNow());
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
      this.abilities(dt, ground, jumpDown, this.held('fire') || this.touch.fire || pad.fire, this.held('duck') || this.touch.duck || pad.duck);
      if (ground) this.stompChain = 0;
      this.landedNow = ground && !this.wasGround;
      this.wasGround = ground;
      this.prevVy = body.velocity.y;

      // clanking footsteps, quicker when he's running faster
      this.stepTimer -= dt;
      if (ground && Math.abs(body.velocity.x) > 80 && this.stepTimer <= 0) {
        this.stepAlt = !this.stepAlt;
        this.sfx.step(this.looseNow(), this.stepAlt);
        this.stepTimer = 0.26 * (RUN / Math.max(RUN * 0.6, Math.abs(body.velocity.x)));
      }

      // running dust
      this.dustTimer -= dt;
      if (ground && Math.abs(body.velocity.x) > 120 && this.dustTimer <= 0) {
        this.dust(body.center.x - this.facing * 8, body.bottom, 1, 6, 8, 0.7);
        this.dustTimer = 0.11;
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
        if (this.looseNow() > 0.3 && ground && Math.abs(body.velocity.x) > 100) this.stumble = Math.max(this.stumble, 0.55);
      }

      // -- items
      const px = body.center.x, py = body.center.y;
      for (const it of this.items) {
        if (it.taken) continue;
        const s = it.sprite;
        if (it.kind === 'ring') {
          if (!this.reduced) {
            const k = 1 + Math.sin(this.t * 4 + it.phase) * 0.04;
            s.setScale(k);
            it.back?.setScale(k);
          }
          if (Math.abs(px - s.x) < 14 && Math.abs(py - s.y) < 44) this.passRing(it);
        } else if (it.kind === 'patrol' && it.walker) {
          const w = it.walker;
          // soldiers on the later levels stop, aim and fire along the roof (duck or jump to dodge)
          const aiming = (w.aim ?? 0) > 0;
          if (w.kind === 'skeleton' && this.level.number >= 3 && !this.over) {
            const dx = px - s.x;
            w.cd = (w.cd ?? 1.6 + Math.random() * 2) - edt;
            if (aiming) {
              w.aim = (w.aim ?? 0) - edt;
              w.dir = Math.sign(dx) || w.dir;
              if (w.aim <= 0) this.soldierFire(s, w.dir);
            } else if (w.cd <= 0 && Math.abs(dx) > 50 && Math.abs(dx) < 340 && Math.abs(py - s.y) < 80) {
              w.aim = 0.6;
              w.dir = Math.sign(dx) || w.dir;
              w.cd = Math.max(1.5, 3.2 - this.difficulty() * 1.1) + Math.random() * 1.5;
              this.sfx.warn();
              if (!this.soldierWarned) {
                this.soldierWarned = true;
                this.announce('A soldier is aiming at you. Duck or jump to dodge its bullets, or stomp it.');
              }
            }
          }
          if (!((w.aim ?? 0) > 0)) s.x += w.dir * w.speed * edt;
          if (s.x < w.min) { s.x = w.min; w.dir = 1; }
          if (s.x > w.max) { s.x = w.max; w.dir = -1; }
          w.frame += edt * 8;
          const wf = w.kind === 'skeleton' && (w.aim ?? 0) > 0 ? (w.aim! < 0.12 ? 'skeleton-fire' : 'skeleton-aim') : `${w.kind}-w${Math.floor(w.frame) % 6}`;
          s.setTexture(this.textures.exists(wf) ? wf : `${w.kind}-${Math.floor(w.frame) % 2 ? 'b' : 'a'}`).setFlipX(w.dir < 0);
          if (w.kind === 'skeleton') s.setTint((w.aim ?? 0) > 0 && (this.reduced || Math.floor(this.t * 14) % 2 === 0) ? 0xff9a8a : 0xffffff);
          const half = s.height / 2;
          if (Math.abs(px - s.x) < Math.max(17, s.displayWidth * 0.36) && body.bottom > s.y - half + 4 && body.top < s.y + half) {
            if (this.smashing()) this.defeatPatrol(it, 'stomp');
            else if (body.velocity.y > 60 && body.bottom < s.y - half + 18) {
              this.defeatPatrol(it, 'stomp');
              body.setVelocityY(-430);
            } else this.hit('enemy');
          }
        } else if (it.kind === 'mine') {
          const dx = Math.abs(px - s.x);
          if (dx < 520) s.setTexture(this.reduced ? 'mine-war-b' : Math.floor(this.t * 3 + it.phase) % 2 ? 'mine-war-b' : 'mine-war-a');
          if (!it.hint && dx < 380 && px < s.x + 30) {
            it.hint = true;
            this.announce('A landmine is buried in the ground ahead. Beeping gets faster as you get close. Jump over it, or shoot it from a distance.');
          }
          if (dx < 260 && px < s.x + 24) {
            it.mT = (it.mT ?? 0) - dt;
            if (it.mT <= 0) {
              it.mT = 0.12 + 0.55 * (dx / 260);
              this.sfx.mineBeep();
            }
          }
          const onGround = body.touching.down || body.blocked.down;
          if (dx < 18 && body.bottom > s.y - 8 && onGround) {
            if (this.smashing()) this.detonateMine(it, false, 30);
            else this.detonateMine(it, true);
          }
        } else if (it.kind === 'switch') {
          if (!it.pressed) {
            if (!it.hint && Math.abs(px - s.x) < 340) {
              it.hint = true;
              this.sfx.warn();
              this.announce('A brass button is set into the roof ahead. Land on it, or stand on it and duck, to press it.');
            }
            const onIt = Math.abs(px - s.x) < 30 && body.bottom > s.y - 6 && body.bottom < s.y + 14;
            if (onIt && (this.landedNow || this.ducked)) this.pressSwitch(it); // land on it, or crouch on it
          }
        } else if (it.kind === 'hazard' && it.hz) {
          this.updateHazard(it, edt);
        } else if (it.kind === 'flyer' && it.flyer) {
          this.updateFlyer(it, edt);
        } else if (it.kind === 'wall') {
          if (Math.abs(px - s.x) < 24 && body.bottom > s.y - 32 && body.top < s.y + 32) {
            if (this.smashing()) this.breakWall(it, true);
            else if (this.landedOn(s.y - 32)) this.stompObstacle(it);
            else this.crashWall(it);
          }
        } else if (it.kind !== 'pylon') {
          if (it.falling) {
            s.y = Math.min(it.baseY, s.y + 170 * dt);
            if (s.y >= it.baseY) it.falling = false;
          } else if (!this.reduced) s.y = it.baseY + Math.sin(this.t * 3 + it.phase) * 4;
          if (it.kind === 'bb' && this.power.magnet > 0) {
            const dx = px - s.x, dy = py - s.y, dist = Math.hypot(dx, dy);
            if (dist < 230 && dist > 1) {
              const pull = Math.min(dist, 520 * dt);
              s.x += (dx / dist) * pull;
              s.y += (dy / dist) * pull;
              it.baseY = s.y;
            }
          }
          if (it.kind === 'secret' && !it.hint && Math.abs(px - s.x) < 380) {
            it.hint = true;
            this.sfx.secretNear();
            this.announce('Something golden glimmers high above the gap ahead.');
          }
          if (Math.hypot(px - s.x, py - s.y) < (it.kind === 'bb' ? 30 : it.kind === 'secret' ? 40 : 34)) {
            if (it.kind === 'secret') this.collectSecret(it);
            else if (it.kind === 'bb') this.collectBreadboard(it);
            else this.collectPower(it);
          }
        } else if (Math.abs(px - s.x) < 17 && body.bottom > s.y - 18 && body.top < s.y + 21) {
          if (this.smashing()) this.destroyPylon(it);
          else if (this.landedOn(s.y - 18)) this.stompObstacle(it);
          else this.hit('pylon');
        }
      }

      this.updatePlatforms(dt);
      this.updateBoss(dt, edt);
      this.updateShells(edt);
      this.updateBullets(edt);

      // speed trail behind Iggy while overclocked or invincible
      this.trailT -= dt;
      if (!this.reduced && this.trailT <= 0 && (this.power.turbo > 0 || this.power.star > 0 || this.dashT > 0)) {
        this.trailT = 0.045;
        const col = this.power.star > 0 ? Phaser.Display.Color.HSVToRGB((this.t * 1.5) % 1, 0.6, 1).color : this.dashT > 0 ? 0xffffff : 0x4af0ff;
        const streak = this.add.rectangle(body.center.x - this.facing * 12, body.center.y + Phaser.Math.Between(-18, 18), 14, 4, col).setDepth(9);
        this.tweens.add({ targets: streak, x: streak.x - this.facing * 40, alpha: 0, scaleX: 0.3, duration: 320, onComplete: () => streak.destroy() });
      }

      // fell off the world
      if (body.top > H + 40) this.hit('fall');

      // timers
      this.invuln = Math.max(0, this.invuln - dt);
      this.ringTimer = Math.max(0, this.ringTimer - dt);
      this.slowT = Math.max(0, this.slowT - dt);
      (['spring', 'magnet', 'turbo', 'star'] as const).forEach((id) => {
        if (this.power[id] > 0) {
          const before = this.power[id];
          this.power[id] -= dt;
          if (id === 'star' && before > 2 && this.power[id] <= 2 && this.power[id] > 0) this.announce('Invincibility is about to run out.');
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
    const held = !this.over && !!this.gun() && (this.held('fire') || this.touch.fire || this.padState().fire);
    if (held) {
      const before = this.charge;
      this.charge = Math.min(CHARGE_FULL, this.charge + dt);
      if (before < CHARGE_MIN && this.charge >= CHARGE_MIN) {
        this.sfx.charged();
        this.announce('Charged. Let go to fire a big shot.');
      }
    } else if (this.charge > 0) {
      const big = this.charge >= CHARGE_MIN;
      this.charge = 0;
      if (!this.over && this.gun() && (big || this.fireCD <= 0)) this.shoot(big);
    }
    this.updateChargeFx();
    this.updateShots(dt);

    // -- camera only moves forward; Iggy can't run off the left edge
    const arenaDue = this.mode === 'story' ? this.score() >= BOSS_SCORE : this.mode === 'time' ? this.maxX >= TIME_DISTANCE : false;
    if (this.arenaX === null && !this.over && arenaDue) this.openArena();
    if (this.arenaX !== null && this.camLock === null && !this.over && body.center.x > this.arenaX + 140) {
      this.camLock = this.arenaX - 20;
      this.spawnBoss();
    }
    const want = this.camLock ?? body.center.x - 330;
    if (want > cam.scrollX) cam.scrollX += this.reduced ? want - cam.scrollX : (want - cam.scrollX) * Math.min(1, dt * (this.camLock === null ? 8 : 5));
    if (this.camLock !== null && this.arenaX !== null && body.left < this.arenaX + 6 && body.bottom > this.arenaTop - 4) {
      body.x = this.arenaX + 6; // a wall at the arena's edge: no wandering back into the gap
      if (body.velocity.x < 0) body.setVelocityX(0);
    }
    if (this.camLock !== null && body.right > cam.scrollX + W - 8) {
      body.x = cam.scrollX + W - 8 - body.width;
      if (body.velocity.x > 0) body.setVelocityX(0);
    }
    if (body.left < cam.scrollX + 8) {
      body.x = cam.scrollX + 8;
      if (body.velocity.x < 0) body.setVelocityX(0);
    }
    this.maxX = Math.max(this.maxX, body.center.x - 110);
    this.generate();
    this.cull();

    // -- backdrop
    this.layers.forEach((l) => (l.sprite.tilePositionX = cam.scrollX * l.f));
    if (this.fore) this.fore.tilePositionX = cam.scrollX * 1.45;
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
    this.duckAmt += ((this.ducked ? 1 : 0) - this.duckAmt) * Math.min(1, dt * (this.reduced ? 60 : 20));
    this.robot.setScale(this.facing * 1.15 * (1 - stretch * 0.6 + squash), 1.15 * (1 + stretch - squash) * (1 - 0.1 * this.duckAmt));
    this.spinT = Math.max(0, this.spinT - dt);
    const sp = this.spinT > 0 ? 1 - this.spinT / 0.5 : 1;
    const spin = this.spinT > 0 ? Math.PI * 2 * (1 - Math.pow(1 - sp, 2)) : 0;
    // invulnerable = flicker (or steady dim when motion is reduced)
    this.robot.setAlpha(this.invuln > 0 ? (this.reduced ? 0.6 : Math.sin(this.t * 40) > 0 ? 1 : 0.35) : 1);
    drawRobot(this.robot, SUITS[this.suitIdx], {
      t: this.t,
      phase: this.runPhase,
      vx: body.velocity.x,
      vy: body.velocity.y,
      onGround: body.touching.down || body.blocked.down,
      stumble: this.stumble,
      landSquash: this.landSquash,
      spin,
      shield: this.power.shield > 0,
      turbo: this.power.turbo > 0,
      star: this.power.star,
      oil: this.power.oil,
      reduced: this.reduced,
      gun: this.gun(),
      fire: this.fireAnim,
      duck: this.duckAmt,
    });

    // -- HUD (throttled)
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.2;
      this.emitHud();
    }
  }
}
