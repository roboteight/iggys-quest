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

const BOSSES = {
  // Grandfather Gloom: faces left. A forward (leftward) swing of a hanging limb is a clockwise turn, so negative.
  gloom: {
    feet: [350, 990],
    bones: [['body', 'root'], ['cannonUpper', 'body'], ['cannonFore', 'cannonUpper'], ['keyUpper', 'body'], ['keyFore', 'keyUpper'],
      ['thighL', 'root'], ['shinL', 'thighL'], ['thighR', 'root'], ['shinR', 'thighR']],
    order: ['keyUpper', 'keyFore', 'thighR', 'shinR', 'body', 'thighL', 'shinL', 'cannonUpper', 'cannonFore'],
    stretch: { thigh: 'thighR', shin: 'shinR' }, // the far leg is drawn higher: stretch it from the hip to the ground
    animations: {
      idle: [2.4, 12, (u) => ({
        body: { r: 1.2 * S(u), y: -3 + 3 * C(u) },
        cannonUpper: { r: 3 * S(u, 1, 0.2) }, cannonFore: { r: 2 * S(u, 1, 0.4) },
        keyUpper: { r: -3 * S(u, 1, 0.1) }, keyFore: { r: 10 * S(u, 2) }, // the key keeps turning
      })],
      walk: [1.1, 12, (u) => {
        const hipL = -20 * S(u), hipR = 20 * S(u);
        return {
          body: { r: 2 * S(u, 2), y: -10 * Math.abs(S(u)) },
          thighL: { r: hipL }, shinL: { r: 34 * Math.max(0, C(u)) }, thighR: { r: hipR }, shinR: { r: 34 * Math.max(0, -C(u)) },
          cannonUpper: { r: 6 * S(u) }, cannonFore: { r: 4 * S(u, 1, 0.2) },
          keyUpper: { r: -6 * S(u) }, keyFore: { r: 12 * S(u, 2) },
        };
      }],
      // the wind-up: leans back, cannon raised to lob, the key winding fast
      charge: [0.5, 6, (u) => ({
        body: { r: -5, y: 6 + 2 * S(u, 2) },
        cannonUpper: { r: -34 + 2 * S(u, 2) }, cannonFore: { r: -22 },
        keyUpper: { r: 8 }, keyFore: { r: 40 * S(u, 2) },
        thighL: { r: -6 }, shinL: { r: 10 }, thighR: { r: 6 }, shinR: { r: 6 },
      })],
    },
  },
};

// ---- the level 8 to 12 bosses, cut by tools/boss-cut.py. Their parts.json holds the feet and each part; a part with `place` is
// one of the sheet's separate drawings, laid over the main drawing at `place` (sheet px) and scaled by `scale`.
// bones: [bone, parent, part whose pivot it sits on]. slots: [slot, bone, attachment shown at rest (null = hidden)].
// An animation pose can also set { show: { slot: attachment | null } } to swap pieces (the hatch opening, the eyes shutting).
const ROT = (u, turns = 1) => -360 * turns * u; // a continuous spin (clockwise on screen)
// (the Deep Diver's back leg is stretched from the hip instead of moved: see `stretch` below)
const BACK = { r: 0, x: 0, y: 0 };
const BOSSES2 = {
  // the level 4 to 7 bosses: all drawn facing right (or front-on). A positive turn swings a hanging limb forward (right).
  diver: {
    stretch: ['legR'], // its back leg is drawn higher up the sheet (perspective): stretched from the hip so its boot reaches the ground
    bones: [['body', 'root', 'rest'], ['gunArm', 'body', 'gunArm'], ['clawArm', 'body', 'clawArm'], ['legL', 'root', 'legL'], ['legR', 'root', 'legR']],
    slots: [['clawArm', 'clawArm', 'clawArm'], ['legR', 'legR', 'legR'], ['rest', 'body', 'rest'], ['legL', 'legL', 'legL'], ['gunArm', 'gunArm', 'gunArm']],
    animations: {
      idle: [2.2, 12, (u) => ({ legR: BACK, body: { r: 0.6 * S(u), y: 3 * S(u) }, gunArm: { r: 3 * S(u, 1, 0.2) }, clawArm: { r: -4 * S(u, 1, 0.4) } })],
      walk: [1.2, 12, (u) => ({ body: { r: 1.5 * S(u, 2), y: -6 * Math.abs(S(u)) }, legL: { r: 12 * S(u) }, legR: { r: -12 * S(u), y: BACK.y }, gunArm: { r: -5 * S(u) }, clawArm: { r: 6 * S(u) } })],
      charge: [0.5, 6, (u) => ({ legR: BACK, body: { r: 3, y: 4 }, gunArm: { r: 20 + 2 * S(u, 3) }, clawArm: { r: 12 } })], // the harpoon comes up
      stunned: [1, 6, (u) => ({ legR: BACK, body: { r: -5 + S(u), y: -10 }, gunArm: { r: -14 }, clawArm: { r: -12 } })],
    },
  },
  nwarden: {
    bones: [['body', 'root', 'rest'], ['gunArm', 'body', 'gunArm'], ['clawArm', 'body', 'clawArm']],
    slots: [['clawArm', 'clawArm', 'clawArm'], ['rest', 'body', 'rest'], ['gunArm', 'gunArm', 'gunArm']],
    animations: {
      // a spinning top: it wobbles on its point
      idle: [1.2, 12, (u) => ({ body: { r: 2.5 * S(u), y: 3 * S(u, 2) }, gunArm: { r: 4 * S(u, 1, 0.3) }, clawArm: { r: -4 * S(u, 1, 0.3) } })],
      walk: [0.6, 12, (u) => ({ body: { r: 4 * S(u), y: 4 * S(u, 2) }, gunArm: { r: 6 * S(u, 2) }, clawArm: { r: -6 * S(u, 2) } })],
      charge: [0.4, 6, (u) => ({ body: { r: 1.5 * S(u, 3), y: 10 }, gunArm: { r: 22 }, clawArm: { r: 16 } })],
      stunned: [1, 6, (u) => ({ body: { r: -9 + 2 * S(u), y: -8 }, gunArm: { r: -16 }, clawArm: { r: -14 } })],
    },
  },
  spore: {
    bones: [['body', 'root', 'rest'], ['cap', 'body', 'cap'], ['gunArm', 'body', 'gunArm'], ['clawArm', 'body', 'clawArm'], ['legL', 'root', 'legL'], ['legR', 'root', 'legR']],
    slots: [['legR', 'legR', 'legR'], ['clawArm', 'clawArm', 'clawArm'], ['rest', 'body', 'rest'], ['legL', 'legL', 'legL'], ['gunArm', 'gunArm', 'gunArm'], ['cap', 'cap', 'cap']],
    animations: {
      idle: [2.6, 12, (u) => ({ body: { r: 0.5 * S(u), y: 3 * S(u) }, cap: { r: 1.5 * S(u, 1, 0.3), y: 2 * S(u, 2) }, gunArm: { r: 4 * S(u, 1, 0.2) }, clawArm: { r: -4 * S(u, 1, 0.5) } })],
      walk: [1.4, 12, (u) => ({ body: { r: 1.2 * S(u, 2), y: -6 * Math.abs(S(u)) }, cap: { r: 2.5 * S(u, 2, 0.2) }, legL: { r: 9 * S(u) }, legR: { r: -9 * S(u) }, gunArm: { r: 6 * S(u) }, clawArm: { r: -6 * S(u) } })],
      // gathering spores: the cap lifts and shudders, the spore gun rises
      charge: [0.5, 6, (u) => ({ body: { r: 2, y: 4 }, cap: { r: -3 + 2 * S(u, 4), y: 14 }, gunArm: { r: 22 }, clawArm: { r: 10 } })],
      stunned: [1, 6, (u) => ({ body: { r: -4 + S(u), y: -10 }, cap: { r: 9, y: -8 }, gunArm: { r: -14 }, clawArm: { r: -12 } })],
    },
  },
  marshal: {
    bones: [['body', 'root', 'rest'], ['cannon', 'body', 'cannon'], ['head', 'body', 'head'], ['clawArm', 'body', 'clawArm']],
    slots: [['rest', 'body', 'rest'], ['head', 'head', 'head'], ['clawArm', 'clawArm', 'clawArm'], ['cannon', 'cannon', 'cannon']],
    animations: {
      idle: [1.4, 8, (u) => ({ body: { y: 1.5 * Math.abs(S(u, 2)) }, cannon: { r: 1 * S(u) }, head: { r: 3 * S(u, 1, 0.3) }, clawArm: { r: -3 * S(u, 1, 0.5) } })],
      walk: [0.5, 6, (u) => ({ body: { r: 0.6 * S(u, 2), y: 2.5 * Math.abs(S(u, 2)) }, cannon: { r: 1.5 * S(u, 2) }, head: { r: 2 * S(u, 2) }, clawArm: { r: 5 * S(u) } })],
      // the long gun comes up to aim
      charge: [0.5, 6, (u) => ({ body: { r: 1, y: 2 }, cannon: { r: 8, x: -4 * S(u, 4) }, head: { r: 5 }, clawArm: { r: 10 } })],
      stunned: [1, 6, (u) => ({ body: { r: -2, y: -6 }, cannon: { r: -12 }, head: { r: -9 + 2 * S(u) }, clawArm: { r: -14 } })],
    },
  },
  // Dust Scorpion: faces right. Its tail sways and coils to strike; its pincers snap.
  scorpion: {
    bones: [['body', 'root', 'rest'], ['tail', 'body', 'tail'], ['clawNear', 'body', 'clawNear'], ['clawFar', 'body', 'clawFar']],
    slots: [['clawFar', 'clawFar', 'clawFar'], ['tail', 'tail', 'tail'], ['rest', 'body', 'rest'], ['clawNear', 'clawNear', 'clawNear']],
    animations: {
      idle: [2, 12, (u) => ({ body: { r: 0.6 * S(u), y: 3 * S(u) }, tail: { r: 4 * S(u, 1, 0.2) }, clawNear: { r: 3 * S(u, 1, 0.4) }, clawFar: { r: -3 * S(u, 1, 0.1) } })],
      // a scuttle: the body bobs fast, claws swing alternately
      walk: [0.6, 8, (u) => ({ body: { r: 1.2 * S(u, 2), y: 4 * Math.abs(S(u, 2)) }, tail: { r: 3 * S(u, 1, 0.3) }, clawNear: { r: 7 * S(u) }, clawFar: { r: -7 * S(u) } })],
      // the tail coils back, ready to fire; pincers raised
      charge: [0.5, 6, (u) => ({ body: { r: -2, y: 4 }, tail: { r: 14 + 2 * S(u, 3) }, clawNear: { r: 16 }, clawFar: { r: 12 } })],
      stunned: [1, 6, (u) => ({ body: { r: 3 + S(u), y: -10 }, tail: { r: -18 }, clawNear: { r: -14 }, clawFar: { r: -10 } })],
    },
  },
  icebreaker: {
    bones: [['hull', 'root', 'rest'], ['prow', 'hull', 'prow'], ['turret', 'hull', 'turret'], ['hatch', 'hull', 'hatchOpen']],
    slots: [['rest', 'hull', 'rest'], ['turret', 'turret', 'turret'], ['hatch', 'hatch', null], ['prow', 'prow', 'prow']],
    animations: {
      idle: [1.2, 8, (u) => ({ hull: { r: 0.4 * S(u), y: 2 * Math.abs(S(u, 2)) }, prow: { r: 1 * S(u) }, turret: { r: 4 * S(u, 1, 0.3) } })],
      // rolling (the charge): tracks rumble, the hull pitches, the prow ploughs
      walk: [0.5, 6, (u) => ({ hull: { r: 1.2 * S(u, 2), y: 4 * Math.abs(S(u, 2)) }, prow: { r: -3 + 2 * S(u, 2) }, turret: { r: -6 } })],
      charge: [0.5, 6, (u) => ({ hull: { r: -4 + 0.6 * S(u, 4), y: 6 }, prow: { r: 6 }, turret: { r: -14 } })], // rears back before a ram
      stunned: [1, 6, (u) => ({ hull: { r: 5 + 1.5 * S(u), y: -6 }, prow: { r: 8 }, turret: { r: 12 + 4 * S(u, 2) }, show: { hatch: 'hatchOpen' } })],
    },
  },
  dredger: {
    bones: [['hull', 'root', 'rest'], ['wheel', 'hull', 'wheel'], ['engine', 'hull', 'engineHot']],
    slots: [['wheel', 'wheel', 'wheel'], ['rest', 'hull', 'rest'], ['engine', 'engine', null]],
    animations: {
      idle: [1.6, 8, (u) => ({ hull: { r: 0.4 * S(u), y: 2 * S(u) }, wheel: { r: 6 * S(u) } })],
      walk: [0.8, 8, (u) => ({ hull: { r: 0.8 * S(u, 2), y: 3 * Math.abs(S(u, 2)) }, wheel: { r: 14 * S(u) } })],
      // digging: the wheel churns, the hull leans into it
      charge: [0.4, 6, (u) => ({ hull: { r: -3 + 0.8 * S(u, 2), y: 4 }, wheel: { r: -20 + 16 * S(u, 2) } })],
      stunned: [1, 6, (u) => ({ hull: { r: 4 + S(u), y: -4 }, wheel: { r: 12 }, show: { engine: 'engineHot' } })],
    },
  },
  warden: {
    bones: [['body', 'root', 'rest'], ['armL', 'body', 'armL'], ['armR', 'body', 'armR'], ['rotor', 'body', 'rotor']],
    slots: [['armR', 'armR', 'armR'], ['rest', 'body', 'rest'], ['rotor', 'rotor', 'rotor'], ['armL', 'armL', 'armL']],
    animations: {
      idle: [0.6, 12, (u) => ({ body: { r: 0.5 * S(u), y: 2 * S(u) }, rotor: { r: ROT(u, 1) }, armL: { r: 3 * S(u) }, armR: { r: -3 * S(u) } })],
      walk: [1.1, 12, (u) => ({ body: { r: 2 * S(u), y: 6 * Math.abs(S(u)) }, rotor: { r: ROT(u, 2) }, armL: { r: 10 * S(u) }, armR: { r: 10 * S(u) } })],
      // the gale: arms thrown back, the rotor screaming
      charge: [0.3, 6, (u) => ({ body: { r: 2, y: -4 }, rotor: { r: ROT(u, 1.5) }, armL: { r: -40 }, armR: { r: 40 } })],
      // overload: the blades jam, the motor shows
      stunned: [1, 6, (u) => ({ body: { r: 3 * S(u), y: -10 }, armL: { r: 18 }, armR: { r: -18 }, show: { rotor: 'motor' } })],
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
    if (cfg.stretch?.includes(b)) {
      const m = parts[partOfBone[b]], hip = m.pivot[1];
      bone.scaleY = Math.round(((feet[1] - hip) / (m.y + m.h - hip)) * 1000) / 1000;
    }
    return bone;
  })];
  const slots = cfg.slots.map(([slot, bone, att]) => ({ name: slot, bone, ...(att ? { attachment: att } : {}) }));
  // every attachment a slot can show: its rest one and any an animation swaps in
  const shows = {};
  for (const [slot, , att] of cfg.slots) if (att) (shows[slot] ??= new Set()).add(att);
  for (const [, , pose] of Object.values(cfg.animations)) for (const k of [0, 0.5]) for (const [slot, att] of Object.entries(pose(k).show ?? {})) if (att) (shows[slot] ??= new Set()).add(att);
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
  const animations = {};
  for (const [anim, [dur, n, pose]] of Object.entries(cfg.animations)) {
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
    const hip = meta[cfg.stretch.thigh].pivot[1], m = meta[cfg.stretch.shin];
    far = (cfg.feet[1] - hip) / (m.y + m.h - hip);
  }
  const stretched = new Set(cfg.stretch ? [cfg.stretch.thigh, cfg.stretch.shin] : []);
  const sy = (b) => (stretched.has(b) ? far : 1);
  const bones = [{ name: 'root' }, ...cfg.bones.map(([b, parent]) => {
    const [x, y] = world(b), [px, py] = world(parent);
    const bone = { name: b, parent, x: r2(x - px), y: r2((y - py) / sy(parent)) };
    if (cfg.stretch && b === cfg.stretch.thigh) bone.scaleY = Math.round(far * 1000) / 1000;
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
        const t = (bonesAnim[b] ??= {});
        (t.rotate ??= []).push({ time, value: r2(v.r ?? 0) });
        if ('y' in v || 'x' in v) (t.translate ??= []).push({ time, x: r2(v.x ?? 0), y: r2(v.y ?? 0) });
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
