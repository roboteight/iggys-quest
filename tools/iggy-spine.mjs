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

// a suit whose boots were cut from the shins (footL/footR) gets ankles; the others keep their boots on the shins
const FEET = !!(meta.footL && meta.footR);
// a suit whose torso was cut into chest and abdomen (belly) bends at the waist: every torso turn is shared between the two joints
const WAIST = !!meta.belly;
const BEND = 0.5; // the abdomen's share of a torso turn (the chest takes the rest, on top)
const SOLE_L = FEET ? meta.footL : meta.shinL, SOLE_R = FEET ? meta.footR : meta.shinR; // the parts with the soles on
const GROUND = SOLE_L.y + SOLE_L.h; // the near boot's sole
const MID_X = cfg.midX;
const W = ([sx, sy]) => [sx - MID_X, GROUND - sy];
const r2 = (n) => Math.round(n * 100) / 100;
// the far leg is drawn higher up the sheet (perspective); stretch it from the hip so both boots stand on the ground
const FAR = (GROUND - meta.thighR.pivot[1]) / (SOLE_R.y + SOLE_R.h - meta.thighR.pivot[1]);

// [bone, parent, part whose pivot it sits on]
const BONES = [
  ['root', null, null], ['hip', 'root', 'pelvis'], ...(WAIST ? [['belly', 'hip', 'belly'], ['torso', 'belly', 'torso']] : [['torso', 'hip', 'torso']]), ['head', 'torso', 'head'],
  ['upperArmL', 'torso', 'upperArmL'], ['foreArmL', 'upperArmL', 'foreArmL'],
  ['upperArmR', 'torso', 'upperArmR'], ['foreArmR', 'upperArmR', 'foreArmR'],
  ['thighL', 'hip', 'thighL'], ['shinL', 'thighL', 'shinL'],
  ['thighR', 'hip', 'thighR'], ['shinR', 'thighR', 'shinR'],
  ...(FEET ? [['footL', 'shinL', 'footL'], ['footR', 'shinR', 'footR']] : []),
];
const HAS = new Set(BONES.map(([b]) => b));
const PART = Object.fromEntries(BONES.map(([b, , p]) => [b, p]));
const world = (b) => (b === 'root' ? [0, 0] : W(meta[PART[b]].pivot));
const sy = (b) => (b === 'thighR' || b === 'shinR' || b === 'footR' ? FAR : 1); // the y scale a bone's children (and attachments) sit in

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
// (the far shin, with its ankle disc, sits over the far boot; the near boot's cuff sits over the end of the near shin)
const ORDER = ['upperArmR', 'foreArmR', 'thighR', ...(FEET ? ['footR'] : []), 'shinR', 'thighL', 'shinL', ...(FEET ? ['footL'] : []), 'pelvis', ...(WAIST ? ['belly'] : []), 'torso', 'head', 'upperArmL', 'foreArmL'];
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
/** ankle turns that keep each boot as drawn (flat on the ground) whatever the thigh and shin are doing */
const flat = (thigh, shin) => -(thigh + shin);
const feet = (tL, sL, tR, sR, extraL = 0, extraR = 0) => ({ footL: { r: flat(tL, sL) + extraL }, footR: { r: flat(tR, sR) + extraR } });

/**
 * A running stride: the leg swinging forward folds at the knee (heel up behind him), the standing leg keeps a little bend.
 * `k` sets how hard he runs: the plain run, or the sprint (longer, higher-kneed strides, leaning in, arms pumping).
 */
const stride = (u, k) => {
  const a = u * Math.PI * 2;
  const hipL = k.swing * Math.sin(a) + k.bias, hipR = k.swing * Math.sin(a + Math.PI) + k.bias;
  const kneeL = -k.knee * Math.max(0, Math.cos(a)) - k.stance, kneeR = -k.knee * Math.max(0, Math.cos(a + Math.PI)) - k.stance;
  const planted = Math.cos(a) < 0 ? hipL : hipR; // the leg sweeping back is the one on the ground
  return {
    hip: { r: 0, x: 0, y: -drop(planted) - k.crouch + k.bounce * Math.abs(Math.sin(a)) },
    torso: { r: -k.lean + 2 * Math.sin(a * 2), x: 0, y: 0 },
    head: { r: k.lean * 0.4 + 2 * Math.sin(a * 2 + 1) },
    thighL: { r: hipL }, shinL: { r: kneeL }, thighR: { r: hipR }, shinR: { r: kneeR },
    upperArmL: { r: -k.arms * Math.sin(a) }, foreArmL: { r: k.elbow + 15 * Math.max(0, -Math.sin(a)) },
    upperArmR: { r: k.arms * Math.sin(a) }, foreArmR: { r: k.elbow + 15 * Math.max(0, Math.sin(a)) },
    // the planted boot stays flat; the swinging one hangs from the ankle, toes down, then levels out to land
    footL: { r: flat(hipL, kneeL) * (1 - liftOf(a)) - 18 * liftOf(a) }, footR: { r: flat(hipR, kneeR) * (1 - liftOf(a + Math.PI)) - 18 * liftOf(a + Math.PI) },
  };
};
/** how far through its swing a leg is (0 planted, 1 the middle of the swing): the leg sweeping forward is off the ground */
function liftOf(a) { return Math.max(0, Math.cos(a)); }
const run = (u) => stride(u, { swing: 34, bias: 2, knee: 80, stance: 6, crouch: 6, bounce: 12, lean: 8, arms: 30, elbow: 40 });
const sprint = (u) => stride(u, { swing: 46, bias: 6, knee: 105, stance: 10, crouch: 12, bounce: 16, lean: 15, arms: 48, elbow: 70 });
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
// ---- waiting fidgets: played now and then once he has stood still for a while (iggy-spine.ts picks them), each from and
// back to the standing pose so they drop in and out of the idle cleanly
const ease = (u, a, b) => smooth(Math.max(0, Math.min(1, (u - a) / (b - a)))); // 0 before a, 1 after b
/** checking his watch: the near forearm comes up across his chest, he peers down at it, shakes it, peers again and lowers it */
const watch = (u) => {
  const up = ease(u, 0, 0.16) * (1 - ease(u, 0.84, 1)); // the arm raised
  const look = ease(u, 0.1, 0.22) * (1 - ease(u, 0.44, 0.5)) + ease(u, 0.62, 0.7) * (1 - ease(u, 0.8, 0.88)); // head down to it
  const shake = Math.sin(Math.PI * ease(u, 0.48, 0.62)) * Math.sin(u * Math.PI * 2 * 9); // a doubtful shake
  const sigh = Math.sin(Math.PI * ease(u, 0.82, 1)); // a sigh as the arm comes down
  return {
    hip: { r: 0, x: 0, y: -4 * sigh },
    torso: { r: -2 * up + 2 * sigh, x: 0, y: 0 },
    head: { r: -20 * look + 4 * sigh + 3 * Math.sin(Math.PI * ease(u, 0.48, 0.62)) },
    upperArmL: { r: 52 * up + 6 * shake }, foreArmL: { r: 88 * up + 14 * shake },
    upperArmR: { r: -3 * up }, foreArmR: { r: 4 * up },
  };
};
/** jumping jacks: four hops, arms swinging out and up overhead as the feet jump apart, then back down together. Seen
 *  three-quarter on, the near arm and leg go out to the left of the picture and the far ones to the right */
const jacks = (u) => {
  const reps = 4, on = ease(u, 0, 0.04) * (1 - ease(u, 0.96, 1));
  const ph = (u * reps) % 1;
  const open = Math.sin(Math.PI * ph) * on; // 0 together, 1 spread
  const hop = Math.abs(Math.sin(Math.PI * 2 * ph)) * on; // off the ground twice a rep (out and back in)
  const spread = 13 * open;
  return {
    hip: { r: 0, x: 0, y: -drop(spread) + 60 * hop - 10 * (1 - hop) * on },
    torso: { r: 2 * open, x: 0, y: 0 },
    head: { r: 4 * open - 3 * hop },
    thighL: { r: -spread }, shinL: { r: 4 * open - 6 * hop }, thighR: { r: spread }, shinR: { r: -4 * open - 6 * hop },
    upperArmL: { r: -160 * open }, foreArmL: { r: -12 * open },
    upperArmR: { r: 160 * open }, foreArmR: { r: 12 * open },
    ...feet(-spread, 4 * open - 6 * hop, spread, -4 * open - 6 * hop, -8 * hop, -14 * hop), // toes point a little in the air
  };
};
/** the workout: arms up overhead reaching for the sky (leaning back a little), three squats with his arms held out in front,
 *  then folding forward to touch his toes, and standing back up with a roll of the shoulders */
const SQUAT_THIGH = 62, SQUAT_SHIN = -105; // at the bottom of a squat: the boots stay under him
/** how far the hip must drop so the near boot's sole stays on the ground with the thigh turned `t` and the shin `s` more
 *  (from the real joint positions: the thigh is drawn on a slant, so a straight-leg estimate leaves the boot in the roof) */
const legSink = (t, s, far = false) => {
  const th = far ? meta.thighR : meta.thighL, sh = far ? meta.shinR : meta.shinL, sole = far ? SOLE_R : SOLE_L, k = far ? FAR : 1;
  const hipP = W(th.pivot), kneeP = W(sh.pivot), soleP = [kneeP[0], GROUND - (sole.y + sole.h)];
  const rot = ([x, y], d) => { const c = Math.cos(rad(d)), n = Math.sin(rad(d)); return [x * c - y * n, x * n + y * c]; };
  // with ankles the boot stays level (feet()), so only the shin down to the ankle turns; without, the boot turns with the shin
  const ankleP = FEET ? W((far ? meta.footR : meta.footL).pivot) : soleP;
  const v1 = sub(kneeP, hipP), v2 = sub(ankleP, kneeP), v3 = sub(soleP, ankleP);
  const s1 = [v1[0], v1[1] * k], s2 = [v2[0], v2[1] * k], s3 = [v3[0], v3[1] * k]; // the far leg is stretched along its length
  return (s1[1] + s2[1] + s3[1]) - (rot(s1, t)[1] + rot(s2, t + s)[1] + s3[1]); // (negative: the sole is below the hip)
};
/** the far thigh's turn that drops its boot by the same `sink` (shin turned `s`): a search, the far leg's drawn differently */
const farThigh = (sink, s) => {
  let best = 0, err = Infinity;
  for (let t = 0; t <= 110; t += 0.25) { const e = Math.abs(-legSink(t, s, true) - sink); if (e < err) { err = e; best = t; } }
  return best;
};
const stretch = (u) => {
  const reach = ease(u, 0, 0.1) * (1 - ease(u, 0.22, 0.28)); // arms up
  const strain = Math.sin(Math.PI * ease(u, 0.1, 0.24)) * Math.sin(u * Math.PI * 2 * 16) * 0.5; // a tremble at full reach
  const arms = ease(u, 0.24, 0.3) * (1 - ease(u, 0.6, 0.65)); // arms out in front for the squats
  const sq = Math.pow(Math.sin(Math.PI * ((ease(u, 0.29, 0.6) * 3) % 1)), 2) * arms; // three squats, 0 standing, 1 down
  const t = SQUAT_THIGH * sq, sh = SQUAT_SHIN * sq;
  const sink = -legSink(t, sh); // hip drop that keeps the near boot on the ground
  const shR = sh * 0.92, tR = sq > 0 ? farThigh(sink, shR) : 0; // and the far leg bent to match
  const fold = ease(u, 0.64, 0.74) * (1 - ease(u, 0.86, 0.94)); // bent over
  const bob = Math.sin(Math.PI * 2 * 2 * ease(u, 0.74, 0.86)) * fold; // two little bounces reaching lower
  const roll = Math.sin(Math.PI * ease(u, 0.93, 1)); // shoulders rolling as he straightens
  return {
    hip: { r: 0, x: -30 * fold, y: 12 * reach - 10 * fold - sink },
    torso: { r: 7 * reach - 18 * sq - 62 * fold - 5 * bob, x: 0, y: 0 },
    head: { r: 12 * reach + strain + 14 * sq - 12 * fold + 4 * roll },
    thighL: { r: t + 10 * fold }, shinL: { r: sh - 3 * fold }, thighR: { r: tR + 10 * fold }, shinR: { r: shR - 3 * fold },
    upperArmL: { r: 172 * reach + 88 * arms + 18 * fold + 6 * bob - 10 * roll }, foreArmL: { r: 6 * reach + 8 * fold },
    upperArmR: { r: 166 * reach + 80 * arms + 14 * fold + 6 * bob + 10 * roll }, foreArmR: { r: 8 * reach + 6 * arms + 8 * fold },
    ...feet(t + 10 * fold, sh - 3 * fold, tR + 10 * fold, shR - 3 * fold),
  };
};
/** tapping his foot: the far boot (side-on) lifts its toes and slaps them down, heel planted, three times a second, while he
 *  stands with a hand on his hip and his head nodding along. Only for suits with ankles (iggy-spine.ts checks) */
const HEEL = FEET ? ((h, k) => [h[0] - k[0], h[1] - k[1]])(W([meta.footR.x + 12, meta.footR.y + meta.footR.h]), W(meta.footR.pivot)) : [0, 0]; // heel, from the ankle
const tap = (u) => {
  const on = ease(u, 0, 0.06) * (1 - ease(u, 0.94, 1));
  const k = Math.pow(Math.max(0, Math.sin(u * Math.PI * 2 * 7)), 0.6) * on; // seven taps: quick up, slap down
  const th = 20 * k, c = Math.cos(rad(th)), n = Math.sin(rad(th));
  const heel = [HEEL[0] * c - HEEL[1] * n, HEEL[0] * n + HEEL[1] * c]; // where the heel would go turning about the ankle
  return {
    hip: { r: 0, x: 0, y: 0 }, torso: { r: -1 * on, x: 0, y: 0 }, head: { r: (-2 + 3 * k) * on },
    footR: { r: th, x: HEEL[0] - heel[0], y: (HEEL[1] - heel[1]) / FAR }, // turn about the heel, not the ankle
    upperArmL: { r: -18 * on }, foreArmL: { r: 70 * on }, // a hand on his hip
    upperArmR: { r: -2 * k }, foreArmR: { r: 4 },
  };
};
/** with a gun out: a few secret-agent poses, held a moment each and big enough to read at game size. Gun thrust straight up
 *  overhead, leaning back; a deep two-handed crouch, aiming down the street; arm out, a double twirl of the gun; then gun up by
 *  his face, barrel to the sky, glancing back. The gun bone keeps its own angle (it ignores the arm's), so its turn here is
 *  where the barrel points: 0 ahead, 90 straight up */
const spy = (u) => {
  const snap = (a) => ease(u, a, a + 0.04); // a quick move into a pose
  const A = snap(0.02) * (1 - snap(0.24)), B = snap(0.24) * (1 - snap(0.5)), T = snap(0.5) * (1 - snap(0.66)), C = snap(0.66) * (1 - ease(u, 0.93, 1));
  const twirl = ease(u, 0.53, 0.63); // two spins of the gun
  const settle = (a) => Math.sin(Math.PI * Math.min(1, Math.max(0, (u - a) / 0.06))) * (u > a ? 1 : 0); // a small overshoot
  const sq = 0.6 * B, tS = SQUAT_THIGH * sq, sS = SQUAT_SHIN * sq, sink = -legSink(tS, sS);
  const tR = sq > 0 ? farThigh(sink, sS) : 0;
  return {
    hip: { r: 0, x: 0, y: -sink },
    torso: { r: 7 * A - 9 * B + 2 * T + 5 * C + 2 * settle(0.24), x: 0, y: 0 },
    head: { r: 12 * A - 5 * B + 3 * T + 16 * C - 2 * settle(0.02) },
    upperArmL: { r: 155 * A + 88 * B + 72 * T + 18 * C }, foreArmL: { r: 8 * A + 2 * B - 4 * T + 150 * C },
    gun: { r: 90 * A + 720 * twirl + 90 * C },
    upperArmR: { r: -24 * A + 84 * B - 14 * T + 40 * C }, foreArmR: { r: 72 * A + 8 * B + 40 * T + 96 * C }, // hip, both hands on the gun, loose, chest
    thighL: { r: tS }, shinL: { r: sS }, thighR: { r: tR }, shinR: { r: sS },
    ...feet(tS, sS, tR, sS),
  };
};
/** no gun: unarmed secret-agent poses, held a moment each. Straightening a cufflink, near hand at his chest and head down; a
 *  low guard, near hand out flat for a chop and far hand up; then a hand to his ear, listening to his earpiece, with a nod */
const agent = (u) => {
  const snap = (a) => ease(u, a, a + 0.04);
  const A = snap(0.02) * (1 - snap(0.3)), B = snap(0.32) * (1 - snap(0.62)), C = snap(0.66) * (1 - ease(u, 0.92, 1));
  const tug = Math.sin(u * Math.PI * 2 * 14) * ease(u, 0.08, 0.12) * (1 - ease(u, 0.24, 0.28)); // the cufflink tweak
  const nod = Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.74) / 0.1))) * (u > 0.74 ? 1 : 0);
  const settle = (a) => Math.sin(Math.PI * Math.min(1, Math.max(0, (u - a) / 0.06))) * (u > a ? 1 : 0);
  const sq = 0.3 * B, tS = SQUAT_THIGH * sq, sS = SQUAT_SHIN * sq, sink = -legSink(tS, sS);
  const tR = sq > 0 ? farThigh(sink, sS) : 0;
  return {
    hip: { r: 0, x: 0, y: -sink },
    torso: { r: -3 * A - 8 * B + 3 * C + 1.5 * settle(0.32), x: 0, y: 0 },
    head: { r: -12 * A - 4 * B + 6 * C - 8 * nod },
    upperArmL: { r: 40 * A + 72 * B + 26 * C }, foreArmL: { r: 108 * A + 6 * tug + 18 * B + 136 * C },
    upperArmR: { r: 4 * A + 78 * B - 6 * C }, foreArmR: { r: 14 * A + 96 * B + 22 * C }, // (behind him: it can't cross his chest) loose, guard, loose
    thighL: { r: tS }, shinL: { r: sS }, thighR: { r: tR }, shinR: { r: sS },
    ...feet(tS, sS, tR, sS),
  };
};
/** waiting: straightens his helmet. Both hands up to the dome, a wiggle or two to set it right, a last little tap, hands down */
const helmet = (u) => {
  const up = ease(u, 0.05, 0.2) * (1 - ease(u, 0.8, 0.95)); // hands on the dome
  const wig = Math.sin(u * Math.PI * 2 * 6) * ease(u, 0.24, 0.3) * (1 - ease(u, 0.58, 0.64)); // twisting it straight
  const tap = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.66) / 0.08)))) * (u > 0.66 ? 1 : 0);
  return {
    hip: { r: 0, x: 0, y: 0 }, torso: { r: 2 * up + 1.5 * wig, x: 0, y: 0 },
    head: { r: 4 * up + 7 * wig - 3 * tap },
    upperArmL: { r: 128 * up + 4 * wig }, foreArmL: { r: 72 * up - 8 * wig - 10 * tap },
    upperArmR: { r: 120 * up - 4 * wig }, foreArmR: { r: 110 * up + 8 * wig },
    thighL: { r: 0 }, shinL: { r: 0 }, thighR: { r: 0 }, shinR: { r: 0 }, ...feet(0, 0, 0, 0),
  };
};
const jump = (u) => {
  const a = u * Math.PI * 2;
  return {
    // tucked: both knees pulled up, the near one higher, body hunched a little over them (was thighs 28/-12, shins -50/-24)
    hip: { r: 0, x: 0, y: 30 }, torso: { r: -6, x: 0, y: 0 }, head: { r: 6 },
    thighL: { r: 78 }, shinL: { r: -112 }, thighR: { r: 56 }, shinR: { r: -96 },
    upperArmL: { r: 58 + 4 * Math.sin(a) }, foreArmL: { r: 52 }, upperArmR: { r: 48 + 4 * Math.sin(a + 1) }, foreArmR: { r: 55 },
    footL: { r: 0 }, footR: { r: -24 }, // (the far boot is side-on, so it points its toes; the near one faces us)
  };
};
const fall = (u) => {
  const a = u * Math.PI * 2;
  return {
    hip: { r: 0, x: 0, y: 0 }, torso: { r: -2, x: 0, y: 0 }, head: { r: -3 },
    thighL: { r: 14 }, shinL: { r: -12 }, thighR: { r: -16 }, shinR: { r: -8 },
    upperArmL: { r: 75 + 6 * Math.sin(a) }, foreArmL: { r: 20 }, upperArmR: { r: 60 + 6 * Math.sin(a + 1.5) }, foreArmR: { r: 25 },
    footL: { r: 0 }, footR: { r: 6 }, // (toes coming up, ready to land)
  };
};
/** the double jump: knees pulled up to his chest, arms wrapped round them, head down (it plays through the flip) */
const tuck = (u) => {
  const a = u * Math.PI * 2;
  return {
    hip: { r: 0, x: 0, y: 60 }, torso: { r: -16, x: 0, y: 0 }, head: { r: 14 + 2 * Math.sin(a) },
    thighL: { r: 98 }, shinL: { r: -138 }, thighR: { r: 90 }, shinR: { r: -128 },
    upperArmL: { r: 34 }, foreArmL: { r: 62 }, upperArmR: { r: 26 }, foreArmR: { r: 58 },
    footL: { r: 0 }, footR: { r: -30 },
  };
};
/** the dash: a low forward lunge, front leg reaching, back leg trailing, arms swept back */
const dash = (u) => {
  const a = u * Math.PI * 2;
  return {
    hip: { r: 0, x: 0, y: -24 }, torso: { r: -20, x: 0, y: 0 }, head: { r: -6 }, // (a negative turn tips his body forward)
    thighL: { r: 30 }, shinL: { r: -22 }, thighR: { r: -28 }, shinR: { r: -46 },
    upperArmL: { r: -62 + 4 * Math.sin(a * 2) }, foreArmL: { r: -20 }, upperArmR: { r: -70 + 4 * Math.sin(a * 2 + 1) }, foreArmR: { r: -24 },
    footL: { r: flat(30, -22) }, footR: { r: -30 }, // front boot flat, back one on its toes
  };
};
/** the ground pound: dropping fist-first, knees up, arms thrust down below him */
const pound = (u) => {
  const a = u * Math.PI * 2;
  return {
    hip: { r: 0, x: 0, y: 30 }, torso: { r: 10, x: 0, y: 0 }, head: { r: 12 },
    thighL: { r: 70 }, shinL: { r: -110 }, thighR: { r: 64 }, shinR: { r: -100 },
    upperArmL: { r: 8 + 3 * Math.sin(a * 3) }, foreArmL: { r: 6 }, upperArmR: { r: 4 + 3 * Math.sin(a * 3 + 1) }, foreArmR: { r: 4 },
    footL: { r: 0 }, footR: { r: -20 },
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
    ...feet(t, s, t - 8, s + 10),
  };
};

/** moving while crouched: the duck pose, with the legs shuffling in turn (each boot lifts a little as it comes forward) */
const crawl = (u) => {
  const a = u * Math.PI * 2;
  const t = 70, s = -112, thigh = KNEE - THIGH, shin = GROUND - KNEE;
  const fy = thigh * Math.cos(rad(t)) + shin * Math.cos(rad(t + s));
  const legL = 16 * Math.sin(a), legR = 16 * Math.sin(a + Math.PI);
  return {
    hip: { r: 0, x: 0, y: -(LEG - fy) + 4 * Math.abs(Math.sin(a)) },
    torso: { r: -16 + 2 * Math.sin(a * 2), x: 0, y: 0 }, head: { r: 9 + 1.5 * Math.sin(a * 2 + 1) },
    thighL: { r: t + legL }, shinL: { r: s - legL * 0.7 - 14 * Math.max(0, Math.cos(a)) },
    thighR: { r: t - 8 + legR }, shinR: { r: s + 10 - legR * 0.7 - 14 * Math.max(0, Math.cos(a + Math.PI)) },
    upperArmL: { r: 40 - 14 * Math.sin(a) }, foreArmL: { r: 55 }, upperArmR: { r: 30 + 14 * Math.sin(a) }, foreArmR: { r: 50 },
    ...feet(t + legL, s - legL * 0.7 - 14 * Math.max(0, Math.cos(a)), t - 8 + legR, s + 10 - legR * 0.7 - 14 * Math.max(0, Math.cos(a + Math.PI)),
      0, -12 * Math.max(0, Math.cos(a + Math.PI))),
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
    footL: { r: 0 }, footR: { r: -26 + sw }, // the far boot dangles, toes down
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
    footL: { r: 0 }, footR: { r: mix(mix(-26, -10, tuck), 0, f) }, // toes down while he hangs, flat once he stands
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
HAS.add('gun');
slots.splice(slots.findIndex((sl) => sl.name === 'foreArmL') + 1, 0, { name: 'gun', bone: 'gun' }); // empty until he has a gun
attachments.gun = {};
for (const k of GUNS) {
  const g = meta[k], sc = g.scale; // each picture placed so its grip sits in his hand
  attachments.gun[k] = { x: r2((g.w / 2 - g.grip[0]) * sc), y: r2(-(g.h / 2 - g.grip[1]) * sc), scaleX: Math.round(sc * 1000) / 1000, scaleY: Math.round(sc * 1000) / 1000, width: g.w, height: g.h };
}
// the game fires from 50 px ahead of his middle at 36 px up: reach the blaster's muzzle as close to that as the arm allows
const bl = meta['gun-blaster'];
const MUZZLE = [50 / GAME, 36 / GAME], GUN_LEN = (bl.w - bl.grip[0]) * bl.scale;
// aiming: the near arm held straight out in front at shoulder height (a quarter turn up from hanging), the far arm braced
// forward, the body squared up behind it
const AIM = { upperArmL: { r: 90 }, foreArmL: { r: -2 }, upperArmR: { r: 38 }, foreArmR: { r: 46 }, torso: { r: 3, x: 0, y: 0 } };
const aim = () => AIM;
// a shot: the arm kicks up and back, then settles (played once over the aim)
const shoot = (u) => {
  const k = Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u);
  return { ...AIM, upperArmL: { r: 90 + 16 * k }, foreArmL: { r: -2 + 10 * k }, torso: { r: 3 + 4 * k, x: -6 * k, y: 0 } };
};

function animation(dur, n, pose, loop = true) {
  const anim = {};
  for (let i = 0; i <= n; i++) {
    const time = (dur * i) / n, p = pose(loop ? (i % n) / n : i / n);
    if (WAIST && p.torso) {
      // bend at the waist: the abdomen takes a share of the turn (and any move of the body), the chest the rest
      p.belly = { r: p.torso.r * BEND, x: p.torso.x ?? 0, y: p.torso.y ?? 0 };
      p.torso = { r: p.torso.r * (1 - BEND) };
    }
    for (const [b, v] of Object.entries(p)) {
      if (!HAS.has(b)) continue; // (the ankles, on a suit whose boots aren't cut from the shins yet)
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
    watch: animation(2.8, 56, watch, false), // waiting: checks his watch (iggy-spine.ts plays these when he's left standing)
    jacks: animation(2.6, 104, jacks, false), // waiting: jumping jacks
    stretch: animation(7, 168, stretch, false), // waiting: a reach overhead, three squats and a toe touch
    tap: animation(2.2, 66, tap, false), // waiting: taps his foot (suits with ankles)
    spy: animation(6, 180, spy, false), // waiting with a gun out: secret-agent poses
    helmet: animation(3, 90, helmet, false), // waiting: straightens his helmet
    agent: animation(5, 150, agent, false), // waiting without one: unarmed secret-agent poses
    run: animation(1, 16, run), // one full stride (both feet); the game drives its time from the distance run
    sprint: animation(1, 16, sprint), // the same at full sprint (iggy-spine.ts switches to it at sprint speed)
    jump: animation(0.6, 6, jump),
    fall: animation(0.6, 6, fall),
    duck: animation(1.6, 8, duck),
    crawl: animation(1, 16, crawl), // one shuffle of both feet; the game drives its time from his speed
    tuck: animation(0.6, 4, tuck), // the double jump
    dash: animation(0.3, 4, dash),
    pound: animation(0.3, 4, pound),
    hang: animation(2, 8, hang),
    climb: animation(CLIMB_TIME, 14, climb, false), // the game sets its time from the climb's progress
    aim: animation(1, 1, aim), // track 1, over the others, while he holds a gun
    shoot: animation(0.18, 6, shoot, false), // track 1, once per shot
  },
};
const file = join(dir, `${cfg.name}.json`);
writeFileSync(file, JSON.stringify(skeleton, null, 1));
console.log(`wrote ${file} (${bones.length} bones, far leg stretched x${FAR.toFixed(3)})`);
}

for (const id of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SUITS)) build(SUITS[id]);
