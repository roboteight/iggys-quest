import Phaser from 'phaser';

/**
 * Enforcer Nine as a rigged cut-out of the concept sheet (see public/rig-test/enforcer.html for the live test page).
 * The body, shoulders, arms and two-segment legs are separate pictures; this file poses them and renders each pose into the boss
 * texture keys the scene already uses (boss-city-a standing, -b charging, -w0..w7 walking, -i0..i3 idle).
 */
const PARTS = ['lowerR', 'upperR', 'lowerL', 'upperL', 'body', 'shoulderL', 'shoulderR', 'armL', 'armR'] as const;
type PartName = (typeof PARTS)[number];
interface Meta { x: number; y: number; w: number; h: number; pivot: [number, number] }

const BACK_LEG = { x: 1.08, y: 1.214 }; // (914 - 483) / (838 - 483): front foot bottom over back foot bottom, measured from the hip
const SCALE = 0.27; // sheet pixels to game pixels
const CROP = { x: 20, y: 88, w: 716, h: 828 }; // the part of the sheet that is drawn; its bottom edge is the ground

export interface RigPose { bob: number; lean: number; dx: number; hipR: number; kneeR: number; hipL: number; kneeL: number; sL: number; sR: number; dyL: number; dyR: number; aL: number; aR: number; rx: number }
const REST: RigPose = { bob: 0, lean: 0, dx: 0, hipR: 0, kneeR: 0, hipL: 0, kneeL: 0, sL: 0, sR: 0, dyL: 0, dyR: 0, aL: 0, aR: 0, rx: 0 };

export function walkPose(ph: number): RigPose {
  const leg = (a: number) => ({ hip: Math.sin(a) * 0.32, knee: Math.max(0, -Math.cos(a)) * 0.6 });
  const r = leg(ph + Math.PI), l = leg(ph);
  return {
    ...REST, bob: -Math.abs(Math.sin(ph)) * 12, lean: Math.sin(ph * 2) * 0.012,
    hipR: r.hip, kneeR: r.knee, hipL: l.hip, kneeL: l.knee,
    sL: Math.sin(ph + Math.PI) * 0.035, sR: -Math.sin(ph + Math.PI) * 0.035, dyL: Math.sin(ph * 2) * 2.5, dyR: Math.sin(ph * 2 + 1) * 2.5,
    aL: Math.sin(ph + Math.PI) * 0.07, aR: -Math.sin(ph + Math.PI * 0.5) * 0.07,
  };
}
export function idlePose(th: number): RigPose {
  return { ...REST, bob: Math.sin(th) * -4, lean: Math.sin(th * 0.5) * 0.008, dyL: Math.sin(th) * 2.5, dyR: Math.sin(th + 0.5) * 2.5, sL: Math.sin(th * 0.5) * 0.012, sR: -Math.sin(th * 0.5) * 0.012, aL: Math.sin(th * 0.67) * 0.03, aR: -Math.sin(th * 0.67 + 1.2) * 0.03 };
}
export function chargePose(): RigPose {
  return { ...REST, lean: -0.05, dx: 10, dyL: -5, dyR: -5, sL: 0.05, sR: -0.05, aL: 0.09, aR: -0.09, rx: 7 };
}

export function preloadEnforcerRig(scene: Phaser.Scene) {
  for (const k of PARTS) scene.load.image(`enf-${k}`, `art/enforcer-rig/${k}.png`);
  scene.load.json('enf-meta', 'art/enforcer-rig/parts.json');
}

function render(scene: Phaser.Scene, meta: Record<PartName, Meta>, p: RigPose): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(CROP.w * SCALE); cv.height = Math.ceil(CROP.h * SCALE);
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.translate(cv.width, 0); ctx.scale(-1, 1); // the sheet faces right; the boss must face left, toward Iggy
  ctx.scale(SCALE, SCALE); ctx.translate(-CROP.x, -CROP.y);
  const part = (k: PartName, chain: [[number, number], number, number?, number?][]) => {
    ctx.save();
    for (const [piv, rot, dx = 0, dy = 0] of chain) { ctx.translate(dx, dy); ctx.translate(piv[0], piv[1]); ctx.rotate(rot); ctx.translate(-piv[0], -piv[1]); }
    const m = meta[k];
    ctx.drawImage(scene.textures.get(`enf-${k}`).getSourceImage() as CanvasImageSource, m.x, m.y);
    ctx.restore();
  };
  for (const [up, lo, hip, knee] of [['upperR', 'lowerR', p.hipR, p.kneeR], ['upperL', 'lowerL', p.hipL, p.kneeL]] as const) {
    ctx.save(); ctx.translate(0, p.bob * 0.5);
    if (up === 'upperR') { // the sheet draws this leg further back, so its foot stops short of the ground; stretch it down from the hip to meet it
      const h = meta.upperR.pivot;
      ctx.translate(h[0], h[1]); ctx.scale(BACK_LEG.x, BACK_LEG.y); ctx.translate(-h[0], -h[1]);
    }
    const uc: [[number, number], number][] = [[meta[up].pivot, hip]];
    part(lo, [...uc, [meta[lo].pivot, knee]]); part(up, uc);
    ctx.restore();
  }
  ctx.save(); ctx.translate(p.dx, p.bob);
  part('body', [[meta.body.pivot, p.lean]]);
  const shL: [[number, number], number, number, number][] = [[meta.shoulderL.pivot, p.sL, p.rx * 0.6, p.dyL]];
  const shR: [[number, number], number, number, number][] = [[meta.shoulderR.pivot, p.sR, -p.rx * 0.6, p.dyR]];
  part('shoulderL', shL); part('shoulderR', shR);
  part('armL', [...shL, [meta.armL.pivot, p.aL, p.rx * 0.4, 0]]); part('armR', [...shR, [meta.armR.pivot, p.aR, -p.rx * 0.4, 0]]);
  ctx.restore();
  return cv;
}

/** Replace the code-drawn Enforcer Nine textures with the rigged cut-out. Does nothing if the pictures did not load. */
export function makeEnforcerRigTextures(scene: Phaser.Scene): boolean {
  const meta = scene.cache.json.get('enf-meta') as Record<PartName, Meta> | undefined;
  if (!meta || PARTS.some((k) => !scene.textures.exists(`enf-${k}`))) return false;
  const put = (key: string, pose: RigPose) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, render(scene, meta, pose));
  };
  put('boss-city-a', idlePose(0.4));
  put('boss-city-b', chargePose());
  for (let f = 0; f < 8; f++) put(`boss-city-w${f}`, walkPose((f / 8) * Math.PI * 2));
  for (let f = 0; f < 4; f++) put(`boss-city-i${f}`, idlePose((f / 4) * Math.PI * 2));
  return true;
}
