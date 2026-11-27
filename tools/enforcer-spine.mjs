// Builds a Spine skeleton (JSON) for Enforcer Nine from the cut-out parts in art-src/spine/enforcer/ (made by
// tools/enforcer-legs.py from public/art/enforcer-rig/, with each lower leg split into shin and foot).
// The bones, pivots and the idle / walk / charge motion match src/app/game/enforcer-rig.ts, so the Spine version starts out
// looking like the code-drawn rig and can then be refined in the Spine editor.
//
//   python tools/enforcer-legs.py && node tools/enforcer-spine.mjs     -> art-src/spine/enforcer/enforcer.json
//   then import it into a project:  Spine -i art-src/spine/enforcer/enforcer.json -o art-src/spine/enforcer/enforcer.spine -r
//
// Spine's axes: y points up and rotations are degrees counter-clockwise, so sheet y and canvas rotations are flipped here.
// The skeleton faces RIGHT like the concept sheet; the game flips it to face Iggy.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'art-src/spine/enforcer');
const meta = JSON.parse(readFileSync(join(out, 'parts.json'), 'utf8'));

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
  // reverse-jointed legs: thigh (upper), shin (knee pad, the strut back to the hock and down to the ankle), toes (foot)
  ['upperL', 'root', 'upperL'], ['shinL', 'upperL', 'shinL'], ['footL', 'shinL', 'footL'],
  ['upperR', 'root', 'upperR'], ['shinR', 'upperR', 'shinR'], ['footR', 'shinR', 'footR'],
];
const world = (b) => (b === 'root' ? [0, 0] : W(meta[b].pivot));

// The back leg is stretched evenly from the hip (positions and pictures alike, so its pieces stay joined) and its foot is
// shrunk back to its own size: everything below upperR inherits the stretch.
const bones = BONES.map(([name, parent]) => {
  const bone = { name };
  if (parent) {
    bone.parent = parent;
    const [x, y] = world(name), [px, py] = world(parent);
    bone.x = r2(x - px);
    bone.y = r2(y - py);
  }
  if (name === 'upperR') { bone.scaleX = BACK_LEG.x; bone.scaleY = BACK_LEG.y; }
  if (name === 'footR') { bone.scaleX = r2(1 / BACK_LEG.x); bone.scaleY = Math.round(1000 / BACK_LEG.y) / 1000; }
  return bone;
});

// back to front: on each leg the thigh covers the knee end of the shin, the shin covers the ankle
const ORDER = ['footR', 'shinR', 'upperR', 'footL', 'shinL', 'upperL', 'body', 'shoulderL', 'shoulderR', 'armL', 'armR'];
const slots = ORDER.map((k) => ({ name: k, bone: k, attachment: k }));
const attachments = {};
for (const k of ORDER) {
  const m = meta[k];
  const [cx, cy] = W([m.x + m.w / 2, m.y + m.h / 2]), [bx, by] = world(k);
  attachments[k] = { [k]: { x: r2(cx - bx), y: r2(cy - by), width: m.w, height: m.h } };
}

// ---- the poses, copied from enforcer-rig.ts (radians, canvas sense)
const REST = { bob: 0, lean: 0, dx: 0, hipR: 0, kneeR: 0, toeR: 0, hipL: 0, kneeL: 0, toeL: 0, sL: 0, sR: 0, dyL: 0, dyR: 0, aL: 0, aR: 0, rx: 0 };
/** A reverse-jointed (bird) leg at phase p of its stride, in canvas radians (positive swings a hanging limb back, to the left,
 *  since the sheet faces right): planted and sweeping back for 60%, then the knee folds the shin up and back with the toes
 *  curled, and it swings forward and opens out to land flat. */
const digi = (p) => {
  const d = Math.PI / 180;
  if (p < 0.6) { const s = p / 0.6; return { hip: (-16 + 32 * s) * d, knee: 4 * Math.sin(Math.PI * s) * d, toe: 0, lift: 0 }; }
  const s = (p - 0.6) / 0.4, e = 0.5 - 0.5 * Math.cos(Math.PI * s), up = Math.sin(Math.PI * s);
  return { hip: (16 - 32 * e - 18 * up) * d, knee: 52 * up * d, toe: 24 * up * d, lift: up };
};
const walkPose = (ph) => {
  const u = ph / (Math.PI * 2), l = digi(u % 1), r = digi((u + 0.5) % 1);
  return {
    ...REST, bob: -10 * Math.max(l.lift, r.lift) - 3 * Math.abs(Math.sin(ph)), lean: Math.sin(ph * 2) * 0.012,
    hipR: r.hip, kneeR: r.knee, toeR: r.toe, hipL: l.hip, kneeL: l.knee, toeL: l.toe,
    sL: Math.sin(ph + Math.PI) * 0.035, sR: -Math.sin(ph + Math.PI) * 0.035, dyL: Math.sin(ph * 2) * 2.5, dyR: Math.sin(ph * 2 + 1) * 2.5,
    aL: Math.sin(ph + Math.PI) * 0.07, aR: -Math.sin(ph + Math.PI * 0.5) * 0.07,
  };
};
const idlePose = (th) => ({ ...REST, bob: Math.sin(th) * -4, lean: Math.sin(th * 0.5) * 0.008, dyL: Math.sin(th) * 2.5, dyR: Math.sin(th + 0.5) * 2.5, sL: Math.sin(th * 0.5) * 0.012, sR: -Math.sin(th * 0.5) * 0.012, aL: Math.sin(th * 0.67) * 0.03, aR: -Math.sin(th * 0.67 + 1.2) * 0.03 });
// the wind-up: crouched on bent knees, guns forward
const chargePose = () => ({ ...REST, lean: -0.05, dx: 10, bob: 10, hipL: -0.14, kneeL: 0.22, hipR: -0.14, kneeR: 0.22, dyL: -5, dyR: -5, sL: 0.05, sR: -0.05, aL: 0.09, aR: -0.09, rx: 7 });

/** A pose as bone offsets from the setup pose: rotate in degrees, translate in skeleton units. */
const toBones = (p) => ({
  body: { rotate: deg(p.lean), x: p.dx, y: -p.bob },
  upperL: { rotate: deg(p.hipL), x: 0, y: -p.bob * 0.5 },
  shinL: { rotate: deg(p.kneeL) },
  footL: { rotate: deg(-(p.hipL + p.kneeL) + p.toeL) }, // kept level with the ground, toes curled when lifted
  upperR: { rotate: deg(p.hipR), x: 0, y: -p.bob * 0.5 },
  shinR: { rotate: deg(p.kneeR) },
  footR: { rotate: deg(-(p.hipR + p.kneeR) + p.toeR) },
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

writeFileSync(join(out, 'enforcer.json'), JSON.stringify(skeleton, null, 1));
console.log(`wrote ${join(out, 'enforcer.json')} (${bones.length} bones, ${slots.length} slots)`);
