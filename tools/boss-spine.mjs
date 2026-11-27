// Builds Spine skeletons (JSON) for bosses cut into parts by a tools/<boss>-cut.py script (art-src/spine/<boss>/parts.json).
// One entry in BOSSES per boss: its bones, draw order, where its feet are on the sheet, which leg (if any) is drawn higher up the
// sheet and needs stretching to reach the ground, and its animations. The game shows them with src/app/game/boss-spine.ts.
//
//   node tools/boss-spine.mjs gloom       -> art-src/spine/gloom/gloom.json
//   Spine -i <abs>/art-src/spine/gloom/gloom.json -o <abs>/art-src/spine/gloom/gloom.spine -r      (first time)
//
// The animations the shared boss code asks for are idle, walk and charge (the wind-up before an attack). Spine's y points up
// and its rotations are degrees counter-clockwise.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const r2 = (n) => Math.round(n * 100) / 100;
const S = (u, k = 1, ph = 0) => Math.sin((u * k + ph) * Math.PI * 2);
const C = (u, k = 1, ph = 0) => Math.cos((u * k + ph) * Math.PI * 2);
/** a fixed shake for tick `i` of an animation (the same every time it is built), between -1 and 1 */
const jitter = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return 2 * (v - Math.floor(v)) - 1; };
/** One bird leg at phase p (0 to 1) of its stride (fwd: -1 when the sheet faces left, 1 when it faces right): planted and sweeping back for the first 60%, then folded and
 *  swung forward. Turns in degrees (forward is negative); `lift` 0 to 1 while the foot is off the ground; `toe` curls the claw. */
const birdLeg = (p, fwd = -1) => {
  const f = (o) => ({ thigh: -fwd * o.thigh, shin: -fwd * o.shin, toe: -fwd * o.toe, lift: o.lift });
  if (p < 0.6) { const s = p / 0.6; return f({ thigh: -18 + 34 * s, shin: 4 + 6 * Math.sin(Math.PI * s), toe: 0, lift: 0 }); }
  const s = (p - 0.6) / 0.4, e = 0.5 - 0.5 * Math.cos(Math.PI * s), up = Math.sin(Math.PI * s);
  return f({ thigh: 16 - 34 * e - 10 * up, shin: 4 + 58 * up, toe: 28 * up, lift: up });
};
/** thigh and shin turns, plus foot turns that keep each foot level with the ground (feet hang from the shins) */
const flatFeet = (l) => ({ thighL: { r: l.thighL }, shinL: { r: l.shinL }, footL: { r: -(l.thighL + l.shinL) },
  thighR: { r: l.thighR }, shinR: { r: l.shinR }, footR: { r: -(l.thighR + l.shinR) } });

const BOSSES = {
  // Grandfather Gloom: the sheet faces right (his claws point right), so a forward swing of a hanging limb is positive.
  // A rickety old clock: every animation is stepped (each key holds, then snaps to the next, like an escapement letting go a
  // tooth), with a little jitter on each tick so no two clicks look alike. The pendulum tick-tocks, the fob swings on its
  // chain, the key winds in clicks and the claw feet stay flat however the legs lurch.
  gloom: {
    feet: [350, 990],
    bones: [['body', 'root'], ['head', 'body'], ['pendulum', 'body'], ['fob', 'body'],
      ['cannonUpper', 'body'], ['cannonFore', 'cannonUpper'], ['keyUpper', 'body'], ['keyFore', 'keyUpper'],
      ['thighL', 'root'], ['shinL', 'thighL'], ['footL', 'shinL'], ['thighR', 'root'], ['shinR', 'thighR'], ['footR', 'shinR']],
    order: ['keyUpper', 'keyFore', 'footR', 'thighR', 'shinR', 'body', 'pendulum', 'fob', 'head', 'footL', 'thighL', 'shinL', 'cannonUpper', 'cannonFore'],
    stretch: { thigh: 'thighR', shin: 'shinR', foot: 'footR' }, // the far leg is drawn higher: stretch it from the hip to the ground
    stepped: true,
    animations: {
      idle: [2.4, 16, (u) => {
        const tick = Math.round(u * 16), tock = tick % 2 ? 1 : -1, j = (k) => jitter(tick, k);
        return {
          body: { r: 1.2 * Math.sign(S(u)) + 0.6 * j(1), y: -2 + 1.5 * tock },
          head: { r: 2.5 * tock + 1.5 * j(2) },
          pendulum: { r: 13 * tock }, fob: { r: -8 * tock + 4 * j(3) },
          cannonUpper: { r: 3 * S(u, 1, 0.2) + 1.5 * j(4) }, cannonFore: { r: 2 * S(u, 1, 0.4) + 2 * j(5) },
          keyUpper: { r: -2 * S(u) }, keyFore: { r: -45 * tick }, // the key clicks round an eighth of a turn each tick
          ...flatFeet({ thighL: 0, shinL: 0, thighR: 0, shinR: 0 }),
        };
      }],
      // a bird's walk: each leg plants and sweeps back under the body, then the knee folds, the claw lifts with its toes curled
      // under, swings forward and opens to land flat; the head pecks forward and holds on every step
      walk: [1.4, 14, (u) => {
        const tick = Math.round(u * 14), tock = tick % 2 ? 1 : -1, j = (k) => jitter(tick, k);
        const L = birdLeg(u, 1), R = birdLeg((u + 0.5) % 1, 1); // (the sheet faces right)
        const legs = { thighL: L.thigh + 2 * j(1), shinL: L.shin + 3 * j(2), thighR: R.thigh + 2 * j(3), shinR: R.shin + 3 * j(4) };
        const ff = flatFeet(legs);
        ff.footL.r += L.toe; ff.footR.r += R.toe;
        return {
          body: { r: 2.5 * S(u, 2) + 1.5 * j(5), y: -8 * Math.max(L.lift, R.lift) + 2 * j(6) },
          head: { r: -6 * Math.max(0, S(u, 2)) + 2.5 * tock + 2 * j(7) },
          pendulum: { r: 18 * tock + 4 * j(8) }, fob: { r: -16 * S(u, 1, 0.15) + 6 * j(9) },
          cannonUpper: { r: 7 * S(u) + 2 * j(10) }, cannonFore: { r: 5 * S(u, 1, 0.2) + 3 * j(11) },
          keyUpper: { r: -6 * S(u) }, keyFore: { r: -45 * tick },
          ...ff,
        };
      }],
      // levelling the harpoon cannon at Iggy: it ratchets up in four clicks (the barrel ends level, pointing forward), then holds
      // with a shiver while he braces; the game fires the harpoon from the barrel's tip (see boss-spine.ts GLOOM_HARPOON)
      aim: [1, 10, (u) => {
        const tick = Math.round(u * 10), up = Math.min(tick, 4) / 4, j = (k) => jitter(tick, k);
        return {
          body: { r: -3 * up + 0.8 * j(1), y: 4 * up }, head: { r: 3 * (tick % 2 ? 1 : -1) + 1.5 * j(2) },
          pendulum: { r: 16 * (tick % 2 ? 1 : -1) }, fob: { r: 9 * (tick % 2 ? 1 : -1) + 4 * j(3) },
          cannonUpper: { r: 40 * up + (tick > 4 ? 1.2 * j(4) : 0) }, cannonFore: { r: 20 * up + (tick > 4 ? 1.2 * j(5) : 0) },
          keyUpper: { r: 6 }, keyFore: { r: -45 * tick },
          ...flatFeet({ thighL: 8 * up, shinL: -6 * up, thighR: -4 * up, shinR: 4 * up }),
        };
      }],
      // the wind-up: the cannon ratchets up to lob, the key winds fast, the whole case shudders
      charge: [0.6, 8, (u) => {
        const tick = Math.round(u * 8), tock = tick % 2 ? 1 : -1, j = (k) => jitter(tick, k);
        return {
          body: { r: -5 + 1.2 * tock, y: 6 + 2 * j(1) },
          head: { r: 4 * tock + 2 * j(2) }, pendulum: { r: 24 * tock }, fob: { r: 12 * tock + 5 * j(3) },
          cannonUpper: { r: -30 - 4 * (tick % 3) + 2 * j(4) }, cannonFore: { r: -22 + 3 * j(5) },
          keyUpper: { r: 8 }, keyFore: { r: -90 * tick },
          ...flatFeet({ thighL: -6, shinL: 10, thighR: 6, shinR: 6 }),
        };
      }],
    },
  },
};

// ---- the level 8 to 12 bosses, cut by tools/boss-cut.py. Their parts.json holds the feet and each part; a part with `place` is
// one of the sheet's separate drawings, laid over the main drawing at `place` (sheet px) and scaled by `scale`.
// bones: [bone, parent, part whose pivot it sits on]. slots: [slot, bone, attachment shown at rest (null = hidden)].
// An animation pose can also set { show: { slot: attachment | null } } to swap pieces (the hatch opening, the eyes shutting).
const ROT = (u, turns = 1) => -360 * turns * u; // a continuous spin (clockwise on screen)
const BOSSES2 = {
  // the level 4 to 7 bosses: all drawn facing right (or front-on). A positive turn swings a hanging limb forward (right).
  diver: {
    // its back leg is drawn higher up the sheet (perspective): stretched evenly from the hip so its boot reaches the ground, the
    // boot itself kept at its own size
    stretch: { thighR: 'footR' }, unstretch: ['footR'],
    bones: [['body', 'root', 'rest'], ['gunArm', 'body', 'gunArm'], ['clawArm', 'body', 'clawArm'],
      ['thighL', 'root', 'thighL'], ['shinL', 'thighL', 'shinL'], ['footL', 'shinL', 'footL'],
      ['thighR', 'root', 'thighR'], ['shinR', 'thighR', 'shinR'], ['footR', 'shinR', 'footR']],
    slots: [['clawArm', 'clawArm', 'clawArm'], ['footR', 'footR', 'footR'], ['shinR', 'shinR', 'shinR'], ['thighR', 'thighR', 'thighR'],
      ['rest', 'body', 'rest'], ['footL', 'footL', 'footL'], ['shinL', 'shinL', 'shinL'], ['thighL', 'thighL', 'thighL'], ['gunArm', 'gunArm', 'gunArm']],
    animations: {
      idle: [2.2, 12, (u) => ({ body: { r: 0.6 * S(u), y: -2 + 2 * S(u) }, gunArm: { r: 3 * S(u, 1, 0.2) }, clawArm: { r: -4 * S(u, 1, 0.4) },
        ...flatFeet({ thighL: 1.5 * S(u), shinL: -2 * S(u), thighR: -1.5 * S(u), shinR: 2 * S(u) }) })],
      // the same bird walk as Grandfather Gloom's, heavy in diving boots: plant, sweep back, fold the knee, swing through
      walk: [1.3, 16, (u) => {
        const L = birdLeg(u, 1), R = birdLeg((u + 0.5) % 1, 1);
        const ff = flatFeet({ thighL: L.thigh * 0.8, shinL: L.shin * 0.8, thighR: R.thigh * 0.8, shinR: R.shin * 0.8 });
        ff.footL.r += L.toe * 0.6; ff.footR.r += R.toe * 0.6;
        return { body: { r: 1.5 * S(u, 2), y: -7 * Math.max(L.lift, R.lift) - 2 * Math.abs(S(u)) }, gunArm: { r: -5 * S(u) }, clawArm: { r: 6 * S(u) }, ...ff };
      }],
      // the harpoon comes up; it sinks onto bent knees to brace
      charge: [0.5, 6, (u) => ({ body: { r: 3, y: -6 }, gunArm: { r: 20 + 2 * S(u, 3) }, clawArm: { r: 12 }, ...flatFeet({ thighL: 10, shinL: -18, thighR: 10, shinR: -18 }) })],
      stunned: [1, 6, (u) => ({ body: { r: -5 + S(u), y: -14 }, gunArm: { r: -14 }, clawArm: { r: -12 }, ...flatFeet({ thighL: 14, shinL: -26 + 3 * S(u), thighR: 8, shinR: -20 }) })],
    },
  },
  dredger: {
    bones: [['hull', 'root', 'rest'], ['wheelTilt', 'hull', 'spinWheel'], ['wheelSpin', 'wheelTilt', 'spinWheel'], ['arm', 'hull', 'armFront'], ['engine', 'hull', 'engineHot']],
    boneScale: { wheelTilt: [0.95, 1] },
    slots: [['wheel', 'wheelSpin', 'spinWheel'], ['rest', 'hull', 'rest'], ['arm', 'arm', 'armFront'], ['engine', 'engine', null]],
    animations: {
      idle: [2.4, 16, (u) => ({ hull: { r: 0.4 * S(u, 2), y: 2 * S(u, 2) }, wheelSpin: { r: ROT(u, 1) } })],
      walk: [2.4, 24, (u) => ({ hull: { r: 0.8 * S(u, 4), y: 3 * Math.abs(S(u, 4)) }, wheelSpin: { r: ROT(u, 2) } })],
      // digging: the wheel churns fast, the hull leans into it
      charge: [0.8, 16, (u) => ({ hull: { r: -3 + 0.8 * S(u, 4), y: 4 }, wheelSpin: { r: ROT(u, 2) } })],
      // stalled: the wheel stops, the engine shows
      stunned: [1, 6, (u) => ({ hull: { r: 4 + S(u), y: -4 }, wheelSpin: { r: 0 }, show: { engine: 'engineHot' } })],
    },
  },
  // Front-on, so its walk is a heavy side-to-side stomp: the hips shift over the planted boot and the other boot lifts, the knees
  // bowing out (leg() works the thigh and shin angles out so each boot lands where it is told and stays flat). The arms swing on
  // shoulder and elbow, the forearm a beat behind, and the head counters the body's roll.
  warden: {
    bones: [['hips', 'root', 'pelvis'], ['torso', 'hips', 'rest'], ['head', 'torso', 'head'], ['rotor', 'torso', 'rotor'],
      ['upperL', 'torso', 'upperL'], ['foreL', 'upperL', 'foreL'], ['upperR', 'torso', 'upperR'], ['foreR', 'upperR', 'foreR'],
      ['thighL', 'hips', 'thighL'], ['shinL', 'thighL', 'shinL'], ['footL', 'shinL', 'footL'],
      ['thighR', 'hips', 'thighR'], ['shinR', 'thighR', 'shinR'], ['footR', 'shinR', 'footR']],
    legs: { L: ['thighL', 'shinL', 'footL', -1], R: ['thighR', 'shinR', 'footR', 1] }, // the last number: which way the knee bows
    slots: [['footL', 'footL', 'footL'], ['footR', 'footR', 'footR'], ['shinL', 'shinL', 'shinL'], ['shinR', 'shinR', 'shinR'],
      ['thighL', 'thighL', 'thighL'], ['thighR', 'thighR', 'thighR'], ['pelvis', 'hips', 'pelvis'], ['head', 'head', 'head'],
      ['upperL', 'upperL', 'upperL'], ['upperR', 'upperR', 'upperR'], ['rest', 'torso', 'rest'], ['rotor', 'rotor', 'rotor'],
      ['foreL', 'foreL', 'foreL'], ['foreR', 'foreR', 'foreR']],
    animations: {
      // breathing in the knees, a slow look around, the rotor idling
      idle: [2.4, 16, (u, { legs }) => {
        const hips = { y: -3 + 3 * C(u), r: 0.6 * S(u) };
        return { hips, ...legs(hips, {}, {}), torso: { r: -0.4 * S(u, 1, 0.1), y: 1.5 * S(u, 2) }, head: { r: 3 * S(u, 1, 0.3) },
          rotor: { r: ROT(u, 4) }, upperL: { r: -2 * S(u, 1, 0.2) }, foreL: { r: -3 * S(u, 1, 0.35) }, upperR: { r: 2 * S(u, 1, 0.2) }, foreR: { r: 3 * S(u, 1, 0.35) } };
      }],
      walk: [1.3, 24, (u, { legs }) => {
        const s = S(u), liftL = Math.max(0, s), liftR = Math.max(0, -s);
        // weight over the planted boot: the hips slide to it and roll so the lifted side rises; they sink as each boot lands
        const hips = { x: 9 * s, y: -7 + 6 * Math.abs(s), r: -3.5 * s };
        return {
          hips, ...legs(hips, { x: -5 * liftL, y: 26 * liftL ** 1.4, tilt: 5 * liftL }, { x: 5 * liftR, y: 26 * liftR ** 1.4, tilt: -5 * liftR }),
          torso: { r: 2.5 * S(u, 1, 0.08), y: 1.5 * Math.abs(S(u, 1, 0.1)) }, head: { r: 2 * S(u, 1, 0.16) }, rotor: { r: ROT(u, 2) },
          upperL: { r: 6 * S(u, 1, 0.12) }, foreL: { r: 9 * S(u, 1, 0.26) }, upperR: { r: 6 * S(u, 1, 0.12) }, foreR: { r: 9 * S(u, 1, 0.26) },
        };
      }],
      // the gale: a wide braced crouch, arms flung out with the turbines roaring, the rotor screaming
      charge: [0.6, 12, (u, { legs }) => {
        const hips = { y: -16 + 1.5 * S(u, 3), r: 0.8 * S(u, 4) };
        return { hips, ...legs(hips, { x: -6 }, { x: 6 }), torso: { r: 0.6 * S(u, 4), y: -2 }, head: { r: 1.2 * S(u, 5) }, rotor: { r: ROT(u, 2) },
          upperL: { r: -48 + 2 * S(u, 4) }, foreL: { r: -24 + 3 * S(u, 4, 0.2) }, upperR: { r: 48 - 2 * S(u, 4) }, foreR: { r: 24 - 3 * S(u, 4, 0.2) } };
      }],
      // overload: the blades jam, the motor shows, the knees buckle and it lists, arms hanging slack
      stunned: [1.4, 14, (u, { legs }) => {
        const hips = { x: -3, y: -24 + 2 * S(u), r: 3 + 1.2 * S(u) };
        return { hips, ...legs(hips, { x: -3 }, { x: 4, y: 3 * Math.max(0, S(u, 1, 0.3)) }), torso: { r: 5 + 2 * S(u, 1, 0.1), y: -3 },
          head: { r: -12 + 3 * S(u, 1, 0.25) }, upperL: { r: 8 + 3 * S(u, 1, 0.2) }, foreL: { r: 14 + 5 * S(u, 1, 0.35) },
          upperR: { r: -4 + 3 * S(u, 1, 0.2) }, foreR: { r: -10 + 5 * S(u, 1, 0.35) }, show: { rotor: 'motor' } };
      }],
    },
  },
  kraken: {
    bones: [['body', 'root', 'rest'], ['tentL', 'body', 'tentL'], ['tentacle', 'body', 'tentacle'], ['eye1', 'body', 'eyesShut'], ['eye2', 'body', 'eyesShut2']],
    slots: [['tentacle', 'tentacle', 'tentacle'], ['rest', 'body', 'rest'], ['tentL', 'tentL', 'tentL'], ['eye1', 'eye1', null], ['eye2', 'eye2', null]],
    animations: {
      idle: [2.4, 12, (u) => ({ body: { r: 1 * S(u), y: 6 * S(u) }, tentL: { r: 6 * S(u, 1, 0.2) }, tentacle: { r: 10 * S(u, 1, 0.5) } })],
      walk: [2.4, 12, (u) => ({ body: { r: 1 * S(u), y: 6 * S(u) }, tentL: { r: 8 * S(u, 2) }, tentacle: { r: 14 * S(u, 2, 0.5) } })],
      // a tentacle rears up to slam
      charge: [0.6, 6, (u) => ({ body: { r: -2, y: 10 }, tentL: { r: -26 + 3 * S(u, 2) }, tentacle: { r: -30 } })],
      // eyes shuttered (the shield)
      stunned: [2.4, 12, (u) => ({ body: { y: 3 * S(u) }, tentL: { r: 4 * S(u) }, tentacle: { r: 6 * S(u) }, show: { eye1: 'eyesShut', eye2: 'eyesShut2' } })],
    },
  },
  albatross: {
    bones: [['ship', 'root', 'rest'], ['prop', 'ship', 'propFront'], ['turret', 'ship', 'turret']],
    slots: [['rest', 'ship', 'rest'], ['prop', 'prop', 'propFront'], ['turret', 'turret', null]],
    animations: {
      idle: [3, 12, (u) => ({ ship: { r: 1.2 * S(u), y: 10 * S(u) }, prop: { r: 2 * S(u, 3) } })],
      walk: [3, 12, (u) => ({ ship: { r: -2 + 1.2 * S(u), y: 10 * S(u) }, prop: { r: 3 * S(u, 4) } })],
      charge: [0.6, 6, (u) => ({ ship: { r: -6 + 0.6 * S(u, 3), y: 14 }, prop: { r: 4 * S(u, 4) } })], // banks into a bombing run
      stunned: [2, 8, (u) => ({ ship: { r: 10 + 2 * S(u), y: -30 * u }, prop: { r: 12 } })], // listing, sinking
    },
  },
  // the Forgemaster (the secret level 14): front-on, hammer on the left, crane and ladle on the right. Spine turns are
  // counter-clockwise, so raising the hammer (its head swinging up from low on the left) is a clockwise, negative turn.
  forgemaster: {
    bones: [['body', 'root', 'rest'], ['crane', 'body', 'crane'], ['stacks', 'body', 'stacks'], ['head', 'body', 'head'], ['hammer', 'body', 'hammer']],
    slots: [['crane', 'crane', 'crane'], ['stacks', 'stacks', 'stacks'], ['rest', 'body', 'rest'], ['head', 'head', 'head'], ['hammer', 'hammer', 'hammer']],
    animations: {
      idle: [2.4, 12, (u) => ({ body: { r: 0.4 * S(u), y: 3 * S(u) }, stacks: { r: 1.2 * S(u, 1, 0.2) }, head: { r: 2 * S(u, 1, 0.4) }, crane: { r: 2.5 * S(u, 1, 0.3) }, hammer: { r: 3 * S(u, 1, 0.1) } })],
      // a heavy stomp: the hammer and the ladle swing with each step
      walk: [1.4, 12, (u) => ({ body: { r: 1.2 * S(u, 2), y: 6 * Math.abs(S(u, 2)) }, stacks: { r: 2 * S(u, 2, 0.15) }, head: { r: 2 * S(u, 2) }, crane: { r: 5 * S(u) }, hammer: { r: 8 * S(u) } })],
      // the wind-up: hammer raised high, the body leaning back, the ladle tipped forward
      charge: [0.5, 6, (u) => ({ body: { r: 3 + 0.5 * S(u, 4), y: 4 }, stacks: { r: 3 }, head: { r: 4 }, crane: { r: -10 + 2 * S(u, 2) }, hammer: { r: -105 + 3 * S(u, 4) } })],
      // locks broken: slumped, the hammer dragging, the crane sagging
      stunned: [1.6, 8, (u) => ({ body: { r: -3 + S(u), y: -10 }, stacks: { r: -6 }, head: { r: -12 + 2 * S(u) }, crane: { r: 14 }, hammer: { r: 18 } })],
    },
  },
};

function build2(name) {
  const cfg = BOSSES2[name];
  const dir = join(root, 'art-src/spine', name);
  const { feet, parts } = JSON.parse(readFileSync(join(dir, 'parts.json'), 'utf8'));
  const W = ([sx, sy]) => [sx - feet[0], feet[1] - sy];
  const pivotOf = (part) => W(parts[part].place ?? parts[part].pivot);
  const partOfBone = Object.fromEntries(cfg.bones.map(([b, , p]) => [b, p]));
  const world = (b) => (b === 'root' ? [0, 0] : pivotOf(partOfBone[b]));
  const bones = [{ name: 'root' }, ...cfg.bones.map(([b, parent]) => {
    const [x, y] = world(b), [px, py] = world(parent);
    const bone = { name: b, parent, x: r2(x - px), y: r2(y - py) };
    if (cfg.stretch?.[b]) { // stretched from this bone's pivot down to the bottom of the named part (its foot)
      const m = parts[cfg.stretch[b]], hip = parts[partOfBone[b]].pivot[1];
      bone.scaleY = Math.round(((feet[1] - hip) / (m.y + m.h - hip)) * 1000) / 1000;
    }
    if (cfg.unstretch?.includes(b)) { // drawn at its own size again under a stretched bone
      const [sb, foot] = Object.entries(cfg.stretch)[0], hip = parts[partOfBone[sb]].pivot[1], m = parts[foot];
      bone.scaleY = Math.round(((m.y + m.h - hip) / (feet[1] - hip)) * 1000) / 1000;
    }
    if (cfg.boneScale?.[b]) [bone.scaleX, bone.scaleY] = cfg.boneScale[b]; // (squashing a spinning part to a perspective angle)
    return bone;
  })];
  const slots = cfg.slots.map(([slot, bone, att]) => ({ name: slot, bone, ...(att ? { attachment: att } : {}) }));
  // every attachment a slot can show: its rest one and any an animation swaps in
  const shows = {};
  for (const [slot, , att] of cfg.slots) if (att) (shows[slot] ??= new Set()).add(att);
  const ctx0 = { legs: () => ({}), leg: () => ({}) };
  for (const [, , pose] of Object.values(cfg.animations)) for (const k of [0, 0.5]) for (const [slot, att] of Object.entries(pose(k, ctx0).show ?? {})) if (att) (shows[slot] ??= new Set()).add(att);
  const attachments = {};
  for (const [slot, bone] of cfg.slots) {
    for (const att of shows[slot] ?? []) {
      const m = parts[att], sc = m.scale ?? 1;
      const piv = m.pivot, [bx, by] = world(bone);
      // where the picture's centre lands on the sheet: placed pictures are moved so their pivot sits on `place`, and scaled
      const c = m.place ? [m.place[0] + (m.x + m.w / 2 - piv[0]) * sc, m.place[1] + (m.y + m.h / 2 - piv[1]) * sc] : [m.x + m.w / 2, m.y + m.h / 2];
      const [cx, cy] = W(c);
      (attachments[slot] ??= {})[att] = { x: r2(cx - bx), y: r2(cy - by), ...(sc !== 1 ? { scaleX: sc, scaleY: sc } : {}), width: m.w, height: m.h };
    }
  }
  // legs(hips, footL, footR): thigh, shin and foot turns that put each boot where it is asked (moved from its rest place by x, y,
  // tilted by `tilt`) while the hips bone is moved and turned by `hips`. Two-bone, solved here and baked into the keys.
  const D = 180 / Math.PI;
  const rotAbout = ([x, y], [cx, cy], deg) => { const a = deg / D, dx = x - cx, dy = y - cy; return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]; };
  const leg = (thigh, shin, foot, bow, hips, f = {}) => {
    const hipBone = cfg.bones.find(([b]) => b === thigh)[1];
    const P = world(hipBone), H0 = world(thigh), K0 = world(shin), A0 = world(foot);
    const rh = hips.r ?? 0, H = rotAbout(H0, P, rh).map((v, i) => v + [(hips.x ?? 0), (hips.y ?? 0)][i]);
    const l1 = Math.hypot(K0[0] - H0[0], K0[1] - H0[1]), l2 = Math.hypot(A0[0] - K0[0], A0[1] - K0[1]);
    const T = [A0[0] + (f.x ?? 0), A0[1] + (f.y ?? 0)];
    const d = Math.min(Math.hypot(T[0] - H[0], T[1] - H[1]), l1 + l2 - 0.01);
    const alpha = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) * D;
    const base = Math.atan2(T[1] - H[1], T[0] - H[0]) * D;
    const t1 = base + bow * alpha, K = [H[0] + l1 * Math.cos(t1 / D), H[1] + l1 * Math.sin(t1 / D)];
    const t2 = Math.atan2(T[1] - K[1], T[0] - K[0]) * D;
    const a1 = t1 - Math.atan2(K0[1] - H0[1], K0[0] - H0[0]) * D - rh, a2 = t2 - Math.atan2(A0[1] - K0[1], A0[0] - K0[0]) * D - rh - a1;
    const wrap = (v) => ((v + 540) % 360) - 180;
    return { [thigh]: { r: wrap(a1) }, [shin]: { r: wrap(a2) }, [foot]: { r: wrap((f.tilt ?? 0) - rh - a1 - a2) } };
  };
  const ctx = { legs: (hips, fL, fR) => ({ ...(cfg.legs.L ? leg(...cfg.legs.L, hips, fL) : {}), ...(cfg.legs.R ? leg(...cfg.legs.R, hips, fR) : {}) }), leg };
  const animations = {};
  for (const [anim, [dur, n, pose0]] of Object.entries(cfg.animations)) {
    const pose = (u) => pose0(u, ctx);
    const bonesAnim = {}, slotsAnim = {};
    for (let i = 0; i <= n; i++) {
      const time = r2((dur * i) / n), p = pose(i / n); // not wrapped: continuous spins keep turning
      for (const [b, v] of Object.entries(p)) {
        if (b === 'show') continue;
        const t = (bonesAnim[b] ??= {});
        (t.rotate ??= []).push({ time, value: r2(v.r ?? 0) });
        if ('y' in v || 'x' in v) (t.translate ??= []).push({ time, x: r2(v.x ?? 0), y: r2(v.y ?? 0) });
      }
    }
    // swapped pieces: shown for the whole animation; every other slot that can swap goes back to its rest picture
    const sw = pose(0).show ?? {};
    for (const [slot, , att] of cfg.slots) if (shows[slot]?.size > (att ? 1 : 0) || sw[slot] !== undefined) slotsAnim[slot] = { attachment: [{ name: slot in sw ? sw[slot] : att }] };
    for (const t of Object.values(bonesAnim)) for (const tl of Object.values(t)) for (const k of tl) if (k.time === 0) delete k.time;
    animations[anim] = { bones: bonesAnim, ...(Object.keys(slotsAnim).length ? { slots: slotsAnim } : {}) };
  }
  const xs = Object.values(parts).filter((m) => !m.place).flatMap((m) => [m.x, m.x + m.w]), ys = Object.values(parts).filter((m) => !m.place).flatMap((m) => [m.y, m.y + m.h]);
  const skeleton = {
    skeleton: { spine: '4.3.26', images: './images/', x: r2(Math.min(...xs) - feet[0]), y: r2(feet[1] - Math.max(...ys)), width: r2(Math.max(...xs) - Math.min(...xs)), height: r2(Math.max(...ys) - Math.min(...ys)) },
    bones, slots, skins: [{ name: 'default', attachments }], animations,
  };
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(skeleton, null, 1));
  console.log(`wrote ${join(dir, `${name}.json`)}`);
}

function build(name) {
  if (BOSSES2[name]) return build2(name);
  const cfg = BOSSES[name];
  const dir = join(root, 'art-src/spine', name);
  const meta = JSON.parse(readFileSync(join(dir, 'parts.json'), 'utf8'));
  const W = ([sx, sy]) => [sx - cfg.feet[0], cfg.feet[1] - sy];
  const world = (b) => (b === 'root' ? [0, 0] : W(meta[b].pivot));
  // stretch: how much longer the far leg must be (hip to the lowest point of its shin) to reach the ground
  let far = 1;
  if (cfg.stretch) {
    const hip = meta[cfg.stretch.thigh].pivot[1], m = meta[cfg.stretch.foot ?? cfg.stretch.shin]; // (the foot, when it has one)
    far = (cfg.feet[1] - hip) / (m.y + m.h - hip);
  }
  const stretched = new Set(cfg.stretch ? [cfg.stretch.thigh, cfg.stretch.shin] : []);
  // the stretch is even from the hip down (positions and pictures alike), so the leg's pieces stay joined
  const sy = () => 1;
  const bones = [{ name: 'root' }, ...cfg.bones.map(([b, parent]) => {
    const [x, y] = world(b), [px, py] = world(parent);
    const bone = { name: b, parent, x: r2(x - px), y: r2((y - py) / sy(parent)) };
    if (cfg.stretch && b === cfg.stretch.thigh) bone.scaleY = Math.round(far * 1000) / 1000;
    // a foot under the stretched leg: carried down with the stretch to the ground, but drawn at its own size
    if (cfg.stretch && b === cfg.stretch.foot) bone.scaleY = Math.round((1 / far) * 1000) / 1000;
    return bone;
  })];
  const slots = cfg.order.map((k) => ({ name: k, bone: k, attachment: k }));
  const attachments = {};
  for (const k of cfg.order) {
    const m = meta[k];
    const [cx, cy] = W([m.x + m.w / 2, m.y + m.h / 2]), [bx, by] = world(k);
    attachments[k] = { [k]: { x: r2(cx - bx), y: r2((cy - by) / sy(k)), width: m.w, height: m.h } };
  }
  const animations = {};
  for (const [anim, [dur, n, pose]] of Object.entries(cfg.animations)) {
    const bonesAnim = {};
    for (let i = 0; i <= n; i++) {
      const time = r2((dur * i) / n), p = pose((i % n) / n);
      for (const [b, v] of Object.entries(p)) {
        const t = (bonesAnim[b] ??= {}), step = cfg.stepped ? { curve: 'stepped' } : {};
        (t.rotate ??= []).push({ time, value: r2(v.r ?? 0), ...step });
        if ('y' in v || 'x' in v) (t.translate ??= []).push({ time, x: r2(v.x ?? 0), y: r2(v.y ?? 0), ...step });
      }
    }
    for (const t of Object.values(bonesAnim)) for (const tl of Object.values(t)) for (const k of tl) if (k.time === 0) delete k.time;
    animations[anim] = { bones: bonesAnim };
  }
  const xs = Object.values(meta).flatMap((m) => [m.x, m.x + m.w]), ys = Object.values(meta).flatMap((m) => [m.y, m.y + m.h]);
  const skeleton = {
    skeleton: { spine: '4.3.26', images: './images/', x: r2(Math.min(...xs) - cfg.feet[0]), y: 0, width: r2(Math.max(...xs) - Math.min(...xs)), height: r2(cfg.feet[1] - Math.min(...ys)) },
    bones, slots, skins: [{ name: 'default', attachments }], animations,
  };
  writeFileSync(join(dir, `${name}.json`), JSON.stringify(skeleton, null, 1));
  console.log(`wrote ${join(dir, `${name}.json`)}${far !== 1 ? ` (far leg stretched x${far.toFixed(3)})` : ''}`);
}

for (const name of process.argv.slice(2).length ? process.argv.slice(2) : [...Object.keys(BOSSES), ...Object.keys(BOSSES2)]) build(name);
