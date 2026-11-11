// Builds Iggy's Spine skeletons (JSON), one per suit, from the parts cut by tools/iggy-cut.py (<dir>/parts.json + images/).
// Every suit gets the same bones, animations and gun; only the pictures and where the joints sit differ.
//
//   node tools/iggy-spine.mjs [suit...]   -> art-src/spine/iggy/iggy.json (Rusty Original), <suit>/iggy-<suit>.json
//   Spine -i <json> -o <abs>/art-src/spine/iggy/iggy.spine --to <skeleton name> -r         (add a skeleton to the project)
//   Spine -i <json> -o <abs>/art-src/spine/iggy/iggy.spine --to <name> -a <animation> --replace -r   (update one animation)
//
// Once the project has been edited in the Spine editor, the .spine file is the master: import single animations, not skeletons.
// Spine's axes: y up, rotations in degrees counter-clockwise. Iggy faces RIGHT, so a positive angle swings a limb forward.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = join(root, 'art-src/spine/iggy');
// midX: the sheet x under his middle; gripL/gripR: the knuckles of each hand on the sheet (where it holds a ledge or the gun)
const SUITS = {
  rusty:     { name: 'iggy', dir: base, midX: 270, gripL: [112, 705], gripR: [462, 690] },
  patchwork: { name: 'iggy-patchwork', dir: join(base, 'patchwork'), midX: 275, gripL: [110, 715], gripR: [470, 690] },
  steel:     { name: 'iggy-steel', dir: join(base, 'steel'), midX: 275, gripL: [110, 720], gripR: [500, 700] },
  night:     { name: 'iggy-night', dir: join(base, 'night'), midX: 275, gripL: [110, 720], gripR: [500, 700] },
  gold:      { name: 'iggy-gold', dir: join(base, 'gold'), midX: 275, gripL: [110, 720], gripR: [500, 700] },
};

function build(cfg) {
const dir = cfg.dir;
const meta = JSON.parse(readFileSync(join(dir, 'parts.json'), 'utf8'));

const GROUND = meta.shinL.y + meta.shinL.h; // the near boot's sole
const MID_X = cfg.midX;
const W = ([sx, sy]) => [sx - MID_X, GROUND - sy];
const r2 = (n) => Math.round(n * 100) / 100;
// the far leg is drawn higher up the sheet (perspective); stretch it from the hip so both boots stand on the ground
const FAR = (GROUND - meta.thighR.pivot[1]) / (meta.shinR.y + meta.shinR.h - meta.thighR.pivot[1]);

// [bone, parent, part whose pivot it sits on]
const BONES = [
  ['root', null, null], ['hip', 'root', 'pelvis'], ['torso', 'hip', 'torso'], ['head', 'torso', 'head'],
  ['upperArmL', 'torso', 'upperArmL'], ['foreArmL', 'upperArmL', 'foreArmL'],
  ['upperArmR', 'torso', 'upperArmR'], ['foreArmR', 'upperArmR', 'foreArmR'],
  ['thighL', 'hip', 'thighL'], ['shinL', 'thighL', 'shinL'],
  ['thighR', 'hip', 'thighR'], ['shinR', 'thighR', 'shinR'],
];
const PART = Object.fromEntries(BONES.map(([b, , p]) => [b, p]));
const world = (b) => (b === 'root' ? [0, 0] : W(meta[PART[b]].pivot));
const sy = (b) => (b === 'thighR' || b === 'shinR' ? FAR : 1); // the y scale a bone's children (and attachments) sit in

const bones = BONES.map(([name, parent]) => {
  const bone = { name };
  if (parent) {
    bone.parent = parent;
    const [x, y] = world(name), [px, py] = world(parent);
    bone.x = r2(x - px);
    bone.y = r2((y - py) / sy(parent));
  }
  if (name === 'thighR') bone.scaleY = r2(FAR * 1000) / 1000;
  return bone;
});

// back to front: the far arm and leg, the near leg, the hips (holster over the near thigh), torso, head, then the near arm
const ORDER = ['upperArmR', 'foreArmR', 'thighR', 'shinR', 'thighL', 'shinL', 'pelvis', 'torso', 'head', 'upperArmL', 'foreArmL'];
const boneOf = (part) => (part === 'pelvis' ? 'hip' : part);
const slots = ORDER.map((k) => ({ name: k, bone: boneOf(k), attachment: k }));
const attachments = {};
for (const k of ORDER) {
  const m = meta[k], b = boneOf(k);
  const [cx, cy] = W([m.x + m.w / 2, m.y + m.h / 2]), [bx, by] = world(b);
  attachments[k] = { [k]: { x: r2(cx - bx), y: r2((cy - by) / sy(b)), width: m.w, height: m.h } };
}

// ---- animations. A pose is bone -> { r: degrees, x, y } offsets from the setup pose.
const THIGH = meta.thighL.pivot[1], KNEE = meta.shinL.pivot[1];
const LEG = GROUND - THIGH; // hip to sole
const rad = (d) => (d * Math.PI) / 180;
/** how far the hip has to drop so a straight leg swung by `deg` still reaches the ground */
const drop = (deg) => LEG * (1 - Math.cos(rad(deg)));

const run = (u) => {
  const a = u * Math.PI * 2;
  const hipL = 30 * Math.sin(a), hipR = 30 * Math.sin(a + Math.PI);
  const kneeL = -55 * Math.max(0, Math.cos(a)), kneeR = -55 * Math.max(0, Math.cos(a + Math.PI));
  const planted = Math.cos(a) < 0 ? hipL : hipR; // the leg sweeping back is the one on the ground
  return {
    hip: { r: 0, x: 0, y: -drop(planted) + 10 * Math.abs(Math.sin(a * 1)) },
    torso: { r: -7 + 2 * Math.sin(a * 2), x: 0, y: 0 },
    head: { r: 2 * Math.sin(a * 2 + 1) },
    thighL: { r: hipL }, shinL: { r: kneeL }, thighR: { r: hipR }, shinR: { r: kneeR },
    upperArmL: { r: -28 * Math.sin(a) }, foreArmL: { r: 35 + 15 * Math.max(0, -Math.sin(a)) },
    upperArmR: { r: 28 * Math.sin(a) }, foreArmR: { r: 35 + 15 * Math.max(0, Math.sin(a)) },
  };
};
const idle = (u) => {
  const a = u * Math.PI * 2;
  return {
    hip: { r: 0, x: 0, y: -3 + 3 * Math.cos(a) },
    torso: { r: 1.2 * Math.sin(a), x: 0, y: 0 },
    head: { r: 2.5 * Math.sin(a + 0.8) },
    upperArmL: { r: 3 * Math.sin(a + 0.4) }, foreArmL: { r: 4 + 3 * Math.sin(a + 0.9) },
    upperArmR: { r: -3 * Math.sin(a + 0.2) }, foreArmR: { r: 4 + 3 * Math.sin(a + 1.1) },
  };
};
const jump = (u) => {
  const a = u * Math.PI * 2;
  return {
    hip: { r: 0, x: 0, y: 0 }, torso: { r: 4, x: 0, y: 0 }, head: { r: 4 },
    thighL: { r: 28 }, shinL: { r: -50 }, thighR: { r: -12 }, shinR: { r: -24 },
    upperArmL: { r: 55 + 4 * Math.sin(a) }, foreArmL: { r: 40 }, upperArmR: { r: 40 + 4 * Math.sin(a + 1) }, foreArmR: { r: 45 },
  };
};
const fall = (u) => {
  const a = u * Math.PI * 2;
  return {
    hip: { r: 0, x: 0, y: 0 }, torso: { r: -2, x: 0, y: 0 }, head: { r: -3 },
    thighL: { r: 14 }, shinL: { r: -12 }, thighR: { r: -16 }, shinR: { r: -8 },
    upperArmL: { r: 75 + 6 * Math.sin(a) }, foreArmL: { r: 20 }, upperArmR: { r: 60 + 6 * Math.sin(a + 1.5) }, foreArmR: { r: 25 },
  };
};
const duck = (u) => {
  const a = u * Math.PI * 2;
  // thigh forward and shin back so the boot stays under the hip: knee at ~70 degrees
  const t = 70, s = -112, thigh = KNEE - THIGH, shin = GROUND - KNEE;
  const fy = thigh * Math.cos(rad(t)) + shin * Math.cos(rad(t + s)); // hip to sole, straight down
  return {
    hip: { r: 0, x: 0, y: -(LEG - fy) + 2 * Math.sin(a) },
    torso: { r: -14, x: 0, y: 0 }, head: { r: 8 + Math.sin(a) },
    thighL: { r: t }, shinL: { r: s }, thighR: { r: t - 8 }, shinR: { r: s + 10 },
    upperArmL: { r: 40 }, foreArmL: { r: 55 }, upperArmR: { r: 30 }, foreArmR: { r: 50 },
  };
};

// ---- hanging from a roof edge, and climbing up. These match the game (play.scene.ts HANG_DROP / HANG_OFF / CLIMB_TIME):
// the skeleton's root sits where the drawn robot's feet would be, and the roof is ROOF_Y above it with its edge WALL_X in front.
const GAME = 0.1; // game pixels per skeleton unit
const ROOF_Y = 62 / GAME, WALL_X = 14 / GAME, CLIMB_TIME = 0.42;
const smooth = (u) => u * u * (3 - 2 * u);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]);
const ang = (v) => Math.atan2(v[1], v[0]);
// each arm: shoulder, elbow and the grip point on the hand (knuckles), in skeleton space at the setup pose
const ARMS = {
  L: { up: 'upperArmL', fore: 'foreArmL', grip: W(cfg.gripL), reach: 25 },
  R: { up: 'upperArmR', fore: 'foreArmR', grip: W(cfg.gripR), reach: 75 },
};
for (const a of Object.values(ARMS)) {
  a.s = world(a.up); a.e = world(a.fore);
  a.l1 = len(sub(a.e, a.s)); a.l2 = len(sub(a.grip, a.e));
  a.rest1 = ang(sub(a.e, a.s)); a.rest2 = ang(sub(a.grip, a.e));
}
/** Two-bone IK: rotations (degrees, from the setup pose) that put the hand's grip on `t`, with the torso moved down by `dropY`.
 *  Out of reach, the arm points straight at it. The elbow bends out behind him. */
function reachTo(a, t, dropY) {
  const s = [a.s[0], a.s[1] - dropY];
  const v = sub(t, s), d = Math.min(len(v), (a.l1 + a.l2) * 0.999);
  const k = Math.acos(Math.max(-1, Math.min(1, (a.l1 * a.l1 + d * d - a.l2 * a.l2) / (2 * a.l1 * d))));
  const base = ang(v);
  const w1 = base + k; // elbow on the far side from the wall
  const e = [s[0] + Math.cos(w1) * a.l1, s[1] + Math.sin(w1) * a.l1];
  const w2 = ang(sub([s[0] + Math.cos(base) * d, s[1] + Math.sin(base) * d], e));
  const d1 = w1 - a.rest1, d2 = w2 - a.rest2 - d1;
  const deg = (r) => r2(((((r * 180) / Math.PI) + 540) % 360) - 180);
  return { [a.up]: { r: deg(d1) }, [a.fore]: { r: deg(d2) } };
}
const HANG_DROP_Y = 300; // the torso hangs this far below where it stands, so his long arms reach the roof with a little bend
const hang = (u) => {
  const a = u * Math.PI * 2, sw = 3 * Math.sin(a);
  return {
    hip: { r: 0, x: 0, y: -HANG_DROP_Y }, torso: { r: 3, x: 0, y: 0 }, head: { r: 7 },
    ...reachTo(ARMS.L, [WALL_X + ARMS.L.reach, ROOF_Y], HANG_DROP_Y),
    ...reachTo(ARMS.R, [WALL_X + ARMS.R.reach, ROOF_Y], HANG_DROP_Y),
    thighL: { r: 8 + sw }, shinL: { r: -14 - sw }, thighR: { r: -4 + sw * 0.7 }, shinR: { r: -6 },
  };
};
/** c = 0..1 through the climb: haul up (to 0.55, the hands stay on the roof while they can) then step on and stand */
const climb = (c) => {
  const u = Math.min(1, c / 0.55), v = Math.max(0, (c - 0.55) / 0.45), e = smooth(u), f = smooth(v);
  const roof = ROOF_Y * (1 - e); // the game lifts him, so the roof comes down towards his feet
  const dropY = HANG_DROP_Y * (1 - e);
  const mix = (x, y, k) => x + (y - x) * k;
  // the hands hold the roof while it is above his shoulders; after that the arms swing down into a push (solving all the way
  // would flip the elbows over as the hands pass shoulder height)
  const holdE = (a) => { // the e at which the roof comes down to 60 above this shoulder
    // roof above the shoulder = ROOF_Y (1 - e) - (shoulder - HANG_DROP_Y (1 - e)); solve for 60
    return Math.max(0, Math.min(1, 1 - (a.s[1] + 60) / (ROOF_Y + HANG_DROP_Y)));
  };
  const PUSH = { upperArmL: 70, foreArmL: 25, upperArmR: 55, foreArmR: 30 };
  const arm = (a) => {
    const e0 = holdE(a);
    const at = (ee) => reachTo(a, [WALL_X + a.reach - WALL_X * 0.4 * ee, ROOF_Y * (1 - ee)], HANG_DROP_Y * (1 - ee));
    if (e <= e0) return at(e);
    const h = at(e0), k = smooth((e - e0) / (1 - e0));
    return { [a.up]: { r: mix(h[a.up].r, PUSH[a.up], k) }, [a.fore]: { r: mix(h[a.fore].r, PUSH[a.fore], k) } };
  };
  const L = arm(ARMS.L), R = arm(ARMS.R);
  const tuck = Math.sin(Math.PI * Math.min(1, u * 1.1)); // the knees come up during the haul
  const pose = {
    hip: { r: 0, x: 0, y: -dropY }, torso: { r: mix(3, -10, e) * (1 - f), x: 0, y: 0 }, head: { r: mix(7, 0, f) },
    thighL: { r: mix(mix(8, 55, tuck), 0, f) }, shinL: { r: mix(mix(-14, -85, tuck), 0, f) },
    thighR: { r: mix(mix(-4, 30, tuck), 0, f) }, shinR: { r: mix(mix(-6, -60, tuck), 0, f) },
  };
  // the arms let go of the edge as he steps on: blend into the standing pose
  for (const [b, val] of Object.entries({ ...L, ...R })) pose[b] = { r: mix(val.r, 0, f) };
  return pose;
};

// ---- the gun: held in the near hand and kept level whatever the arm does (the bone ignores its parents' rotation). The aim
// animation (played on a second track over everything else) only moves the near arm, so he can run, jump and duck while aiming.
const GUNS = ['gun-blaster', 'gun-twin', 'gun-spread', 'gun-rocket']; // by gun level, from Iggy's arsenal sheet
const gripW = ARMS.L.grip, foreW = world('foreArmL');
bones.push({ name: 'gun', parent: 'foreArmL', x: r2(gripW[0] - foreW[0]), y: r2(gripW[1] - foreW[1]), inherit: 'noRotationOrReflection' });
slots.splice(slots.findIndex((sl) => sl.name === 'foreArmL') + 1, 0, { name: 'gun', bone: 'gun' }); // empty until he has a gun
attachments.gun = {};
for (const k of GUNS) {
  const g = meta[k], sc = g.scale; // each picture placed so its grip sits in his hand
  attachments.gun[k] = { x: r2((g.w / 2 - g.grip[0]) * sc), y: r2(-(g.h / 2 - g.grip[1]) * sc), scaleX: Math.round(sc * 1000) / 1000, scaleY: Math.round(sc * 1000) / 1000, width: g.w, height: g.h };
}
// the game fires from 50 px ahead of his middle at 36 px up: reach the blaster's muzzle as close to that as the arm allows
const bl = meta['gun-blaster'];
const MUZZLE = [50 / GAME, 36 / GAME], GUN_LEN = (bl.w - bl.grip[0]) * bl.scale;
const aim = () => reachTo(ARMS.L, [MUZZLE[0] - GUN_LEN, MUZZLE[1] - 15], 0);

function animation(dur, n, pose, loop = true) {
  const anim = {};
  for (let i = 0; i <= n; i++) {
    const time = (dur * i) / n, p = pose(loop ? (i % n) / n : i / n);
    for (const [b, v] of Object.entries(p)) {
      const t = (anim[b] ??= {});
      const keys = (t.rotate ??= []);
      let r = v.r;
      const prev = keys[keys.length - 1]?.value;
      if (prev !== undefined) while (r - prev > 180) r -= 360; // keyed rotations tween in a straight line: never the long way round
      if (prev !== undefined) while (prev - r > 180) r += 360;
      keys.push({ time: r2(time), value: r2(r) });
      if ('y' in v) (t.translate ??= []).push({ time: r2(time), x: r2(v.x ?? 0), y: r2(v.y) });
    }
  }
  for (const t of Object.values(anim)) for (const tl of Object.values(t)) for (const k of tl) if (k.time === 0) delete k.time;
  return { bones: anim };
}

const skeleton = {
  skeleton: { spine: '4.3.26', images: './images/', x: -250, y: 0, width: 500, height: 940 },
  bones, slots,
  skins: [{ name: 'default', attachments }],
  animations: {
    idle: animation(2, 16, idle),
    run: animation(1, 16, run), // one full stride (both feet); the game drives its time from the distance run
    jump: animation(0.6, 6, jump),
    fall: animation(0.6, 6, fall),
    duck: animation(1.6, 8, duck),
    hang: animation(2, 8, hang),
    climb: animation(CLIMB_TIME, 14, climb, false), // the game sets its time from the climb's progress
    aim: animation(1, 1, aim), // track 1, over the others, while he holds a gun
  },
};
const file = join(dir, `${cfg.name}.json`);
writeFileSync(file, JSON.stringify(skeleton, null, 1));
console.log(`wrote ${file} (${bones.length} bones, far leg stretched x${FAR.toFixed(3)})`);
}

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SUITS)) build(SUITS[id]);
