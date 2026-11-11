// Builds the Reclaimer's Spine skeleton (JSON) from the parts cut by tools/reclaimer-cut.py.
//
//   node tools/reclaimer-spine.mjs   -> art-src/spine/reclaimer/reclaimer.json
//   Spine -i <abs>/art-src/spine/reclaimer/reclaimer.json -o <abs>/art-src/spine/reclaimer/reclaimer.spine -r
//
// The sheet draws it front-on. Rotations are degrees counter-clockwise (Spine's y points up): a negative turn of the claw
// arm lifts the claw up and out to the left, towards Iggy. The game shows the skeleton at 0.7 scale, its feet sunk into the
// slag pit behind the arena so the furnace mouth hangs just above Iggy's head.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'art-src/spine/reclaimer');
const meta = JSON.parse(readFileSync(join(dir, 'parts.json'), 'utf8'));
const FEET = [430, 792]; // between its feet, on the ground line
const W = ([sx, sy]) => [sx - FEET[0], FEET[1] - sy];
const r2 = (n) => Math.round(n * 100) / 100;

const BONES = [['root', null], ['body', 'root'], ['legL', 'root'], ['legR', 'root'], ['armUpper', 'body'], ['armClaw', 'armUpper']];
const world = (b) => (b === 'root' ? [0, 0] : W(meta[b].pivot));
const bones = BONES.map(([name, parent]) => {
  const bone = { name };
  if (parent) {
    const [x, y] = world(name), [px, py] = world(parent);
    Object.assign(bone, { parent, x: r2(x - px), y: r2(y - py) });
  }
  return bone;
});
// the ball is swung by the game on a drawn chain, so it isn't part of the rig
const ORDER = ['legR', 'legL', 'body', 'armUpper', 'armClaw'];
const slots = ORDER.map((k) => ({ name: k, bone: k, attachment: k }));
const attachments = {};
for (const k of ORDER) {
  const m = meta[k];
  const [cx, cy] = W([m.x + m.w / 2, m.y + m.h / 2]), [bx, by] = world(k);
  attachments[k] = { [k]: { x: r2(cx - bx), y: r2(cy - by), width: m.w, height: m.h } };
}

/** pose: bone -> { r (degrees), x, y } offsets from the setup pose */
const REST = { body: { r: 0, x: 0, y: 0 }, armUpper: { r: 0 }, armClaw: { r: 0 } };
const pose = (o) => ({ body: { ...REST.body, ...o.body }, armUpper: { ...REST.armUpper, ...o.armUpper }, armClaw: { ...REST.armClaw, ...o.armClaw } });

function animation(keys /* [time, pose][] */) {
  const anim = {};
  for (const [time, p] of keys) {
    for (const [b, v] of Object.entries(p)) {
      const t = (anim[b] ??= {});
      (t.rotate ??= []).push({ time: r2(time), value: r2(v.r ?? 0) });
      if ('y' in v) (t.translate ??= []).push({ time: r2(time), x: r2(v.x ?? 0), y: r2(v.y) });
    }
  }
  for (const t of Object.values(anim)) for (const tl of Object.values(t)) for (const k of tl) if (k.time === 0) delete k.time;
  return { bones: anim };
}
const loop = (dur, n, f) => Array.from({ length: n + 1 }, (_, i) => [(dur * i) / n, f((i % n) / n)]);
const S = (u, k = 1) => Math.sin(u * Math.PI * 2 * k);

const skeleton = {
  skeleton: { spine: '4.3.26', images: './images/', x: -380, y: 0, width: 760, height: 720 },
  bones, slots,
  skins: [{ name: 'default', attachments }],
  animations: {
    // breathing: the furnace heaves, the claw flexes
    idle: animation(loop(2.4, 12, (u) => pose({ body: { r: 1.2 * S(u), y: 6 * S(u) }, armUpper: { r: 4 * S(u, 1) - 2 }, armClaw: { r: 6 * S(u + 0.2) } }))),
    // the claw goes up and back before a slam (played once, held)
    windup: animation([[0, pose({})], [0.6, pose({ body: { r: -3, y: 8 }, armUpper: { r: -118 }, armClaw: { r: -35 } })], [0.9, pose({ body: { r: -4, y: 10 }, armUpper: { r: -124 }, armClaw: { r: -40 } })]]),
    // and down: fast
    slam: animation([[0, pose({ body: { r: -4, y: 10 }, armUpper: { r: -124 }, armClaw: { r: -40 } })], [0.22, pose({ body: { r: 5, y: -14 }, armUpper: { r: 28 }, armClaw: { r: 14 } })], [0.35, pose({ body: { r: 4, y: -10 }, armUpper: { r: 24 }, armClaw: { r: 10 } })]]),
    // stuck in the floor, straining to pull it out
    stuck: animation(loop(0.5, 4, (u) => pose({ body: { r: 4 + S(u, 2), y: -10 }, armUpper: { r: 24 + 2 * S(u, 2) }, armClaw: { r: 10 } }))),
    // a roar: the whole machine shakes, claw raised
    roar: animation(loop(0.3, 6, (u) => pose({ body: { r: 2.5 * S(u, 2), y: 12 }, armUpper: { r: -60 + 6 * S(u, 2) }, armClaw: { r: -25 } }))),
    // overheated: slumps forward, sagging, the claw hanging limp
    slump: animation(loop(1.2, 8, (u) => pose({ body: { r: 6 + S(u), y: -48 + 3 * S(u) }, armUpper: { r: 16 + 2 * S(u) }, armClaw: { r: 18 } }))),
    // the intake: rocks back and shudders while the turbines pull
    intake: animation(loop(0.4, 4, (u) => pose({ body: { r: -4 + 0.8 * S(u, 2), y: 10 + 2 * S(u, 2) }, armUpper: { r: -20 }, armClaw: { r: -15 } }))),
    // phase 3: armour gone, slumped low and dragging itself forward with the claw
    crawl: animation(loop(1.6, 12, (u) => pose({ body: { r: 12 + 2 * S(u), y: -95 + 6 * S(u) }, armUpper: { r: -30 + 45 * Math.max(0, S(u)) }, armClaw: { r: -10 + 25 * Math.max(0, S(u + 0.15)) } }))),
    // the end: it sinks back into the slag
    die: animation([[0, pose({ body: { r: 0, y: 0 } })], [0.6, pose({ body: { r: 8, y: -40 }, armUpper: { r: 30 }, armClaw: { r: 25 } })], [2.4, pose({ body: { r: 16, y: -420 }, armUpper: { r: 50 }, armClaw: { r: 40 } })]]),
  },
};
writeFileSync(join(dir, 'reclaimer.json'), JSON.stringify(skeleton, null, 1));
console.log(`wrote ${join(dir, 'reclaimer.json')}`);
