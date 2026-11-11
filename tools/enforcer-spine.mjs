// Builds a Spine skeleton (JSON) for Enforcer Nine from the cut-out parts in public/art/enforcer-rig/.
// The bones, pivots and the idle / walk / charge motion match src/app/game/enforcer-rig.ts, so the Spine version starts out
// looking like the code-drawn rig and can then be refined in the Spine editor.
//
//   node tools/enforcer-spine.mjs            -> art-src/spine/enforcer/enforcer.json + images/
//   then import it into a project:  Spine -i art-src/spine/enforcer/enforcer.json -o art-src/spine/enforcer/enforcer.spine -r
//
// Spine's axes: y points up and rotations are degrees counter-clockwise, so sheet y and canvas rotations are flipped here.
// The skeleton faces RIGHT like the concept sheet; the game flips it to face Iggy.
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'public/art/enforcer-rig');
const out = join(root, 'art-src/spine/enforcer');
const meta = JSON.parse(readFileSync(join(src, 'parts.json'), 'utf8'));

const GROUND = 916; // the bottom of the drawn crop on the sheet is where his feet meet the ground
const MID_X = 378;
const BACK_LEG = { x: 1.08, y: 1.214 }; // the back leg is drawn further back on the sheet; stretched from the hip so its foot reaches the ground
const W = ([sx, sy]) => [sx - MID_X, GROUND - sy]; // sheet point -> skeleton space
const r2 = (n) => Math.round(n * 100) / 100;
const deg = (rad) => r2((-rad * 180) / Math.PI);

// bone: [name, parent, part whose pivot it sits on]
const BONES = [
  ['root', null, null],
  ['body', 'root', 'body'],
  ['shoulderL', 'body', 'shoulderL'],
  ['armL', 'shoulderL', 'armL'],
  ['shoulderR', 'body', 'shoulderR'],
  ['armR', 'shoulderR', 'armR'],
  ['upperL', 'root', 'upperL'],
  ['lowerL', 'upperL', 'lowerL'],
  ['upperR', 'root', 'upperR'],
  ['lowerR', 'upperR', 'lowerR'],
];
const scaleOf = (b) => (b === 'upperR' || b === 'lowerR' ? BACK_LEG : { x: 1, y: 1 }); // the scale lowerR inherits from upperR
const world = (b) => (b === 'root' ? [0, 0] : W(meta[b].pivot));

const bones = BONES.map(([name, parent]) => {
  const bone = { name };
  if (parent) {
    bone.parent = parent;
    const [x, y] = world(name), [px, py] = world(parent), s = scaleOf(parent);
    bone.x = r2((x - px) / s.x);
    bone.y = r2((y - py) / s.y);
  }
  if (name === 'upperR') { bone.scaleX = BACK_LEG.x; bone.scaleY = BACK_LEG.y; }
  return bone;
});

// back to front, as the code rig draws them
const ORDER = ['lowerR', 'upperR', 'lowerL', 'upperL', 'body', 'shoulderL', 'shoulderR', 'armL', 'armR'];
const slots = ORDER.map((k) => ({ name: k, bone: k, attachment: k }));
const attachments = {};
for (const k of ORDER) {
  const m = meta[k], s = scaleOf(k);
  const [cx, cy] = W([m.x + m.w / 2, m.y + m.h / 2]), [bx, by] = world(k);
  // offsets are in the bone's space, so undo the back leg's stretch (the pictures themselves stay stretched, as in the code rig)
  attachments[k] = { [k]: { x: r2((cx - bx) / s.x), y: r2((cy - by) / s.y), width: m.w, height: m.h } };
}

// ---- the poses, copied from enforcer-rig.ts (radians, canvas sense)
const REST = { bob: 0, lean: 0, dx: 0, hipR: 0, kneeR: 0, hipL: 0, kneeL: 0, sL: 0, sR: 0, dyL: 0, dyR: 0, aL: 0, aR: 0, rx: 0 };
const walkPose = (ph) => {
  const leg = (a) => ({ hip: Math.sin(a) * 0.32, knee: Math.max(0, -Math.cos(a)) * 0.6 });
  const r = leg(ph + Math.PI), l = leg(ph);
  return {
    ...REST, bob: -Math.abs(Math.sin(ph)) * 12, lean: Math.sin(ph * 2) * 0.012,
    hipR: r.hip, kneeR: r.knee, hipL: l.hip, kneeL: l.knee,
    sL: Math.sin(ph + Math.PI) * 0.035, sR: -Math.sin(ph + Math.PI) * 0.035, dyL: Math.sin(ph * 2) * 2.5, dyR: Math.sin(ph * 2 + 1) * 2.5,
    aL: Math.sin(ph + Math.PI) * 0.07, aR: -Math.sin(ph + Math.PI * 0.5) * 0.07,
  };
};
const idlePose = (th) => ({ ...REST, bob: Math.sin(th) * -4, lean: Math.sin(th * 0.5) * 0.008, dyL: Math.sin(th) * 2.5, dyR: Math.sin(th + 0.5) * 2.5, sL: Math.sin(th * 0.5) * 0.012, sR: -Math.sin(th * 0.5) * 0.012, aL: Math.sin(th * 0.67) * 0.03, aR: -Math.sin(th * 0.67 + 1.2) * 0.03 });
const chargePose = () => ({ ...REST, lean: -0.05, dx: 10, dyL: -5, dyR: -5, sL: 0.05, sR: -0.05, aL: 0.09, aR: -0.09, rx: 7 });

/** A pose as bone offsets from the setup pose: rotate in degrees, translate in skeleton units. */
const toBones = (p) => ({
  body: { rotate: deg(p.lean), x: p.dx, y: -p.bob },
  upperL: { rotate: deg(p.hipL), x: 0, y: -p.bob * 0.5 },
  lowerL: { rotate: deg(p.kneeL) },
  upperR: { rotate: deg(p.hipR), x: 0, y: -p.bob * 0.5 / BACK_LEG.y },
  lowerR: { rotate: deg(p.kneeR) },
  shoulderL: { rotate: deg(p.sL), x: p.rx * 0.6, y: -p.dyL },
  shoulderR: { rotate: deg(p.sR), x: -p.rx * 0.6, y: -p.dyR },
  armL: { rotate: deg(p.aL), x: p.rx * 0.4, y: 0 },
  armR: { rotate: deg(p.aR), x: -p.rx * 0.4, y: 0 },
});

function animation(keys /* [time, pose][] */) {
  const anim = {};
  for (const [time, pose] of keys) {
    for (const [b, v] of Object.entries(toBones(pose))) {
      const t = (anim[b] ??= {});
      (t.rotate ??= []).push({ time: r2(time), value: v.rotate });
      if ('x' in v) (t.translate ??= []).push({ time: r2(time), x: r2(v.x), y: r2(v.y) });
    }
  }
  // drop timelines that never move
  for (const [b, t] of Object.entries(anim)) {
    if (t.rotate.every((k) => k.value === 0)) delete t.rotate;
    if (t.translate?.every((k) => k.x === 0 && k.y === 0)) delete t.translate;
    if (!Object.keys(t).length) delete anim[b];
  }
  for (const t of Object.values(anim)) for (const tl of Object.values(t)) for (const k of tl) if (k.time === 0) delete k.time;
  return { bones: anim };
}
const loop = (dur, n, pose) => Array.from({ length: n + 1 }, (_, i) => [(dur * i) / n, pose(((i % n) / n))]);

const skeleton = {
  skeleton: { spine: '4.3.26', images: './images/', x: -360, y: 0, width: 720, height: 830 },
  bones,
  slots,
  skins: [{ name: 'default', attachments }],
  animations: {
    idle: animation(loop(3, 24, (u) => idlePose(u * Math.PI * 4))),
    walk: animation(loop(1, 16, (u) => walkPose(u * Math.PI * 2))),
    charge: animation([[0, REST], [0.25, chargePose()], [0.6, chargePose()]]),
  },
};

mkdirSync(join(out, 'images'), { recursive: true });
for (const k of ORDER) copyFileSync(join(src, `${k}.png`), join(out, 'images', `${k}.png`));
writeFileSync(join(out, 'enforcer.json'), JSON.stringify(skeleton, null, 1));
console.log(`wrote ${join(out, 'enforcer.json')} (${bones.length} bones, ${slots.length} slots)`);
