import type { ThemeName } from './music';

export type LevelStyle = 'city' | 'hollow' | 'wastes' | 'drowned' | 'void' | 'spores' | 'war';

/** One entry per level. The scene, art and music all read from here. */
export interface LevelDef {
  id: string;
  number: number;
  name: string;
  blurb: string;
  style: LevelStyle;
  music: ThemeName;
  /** how the falling rain / flakes / spores layer scrolls (pixels per second) */
  precip: { vx: number; vy: number };
  lightning: boolean;
  bg: string;
  /** story card shown before the level, and after its boss falls */
  intro: string;
  outro: string;
}

/** Score at which the level's boss arena appears. Defeating the boss finishes the level. */
export const BOSS_SCORE = 4000;

export type BossAttack = 'volley' | 'spread' | 'mortar' | 'stomp';
export interface BossDef {
  name: string;
  blurb: string;
  hp: number;
  /** walking speed in px/s (0 = hovers in place) */
  speed: number;
  attacks: BossAttack[];
  /** where shots leave the mech, relative to the middle of its feet (facing left) */
  muzzle: [number, number];
}

export const BOSSES: Record<LevelStyle, BossDef> = {
  city: { name: 'Enforcer Nine', blurb: 'A hunched, bird-legged peacekeeper with cannons for arms.', hp: 24, speed: 50, attacks: ['volley', 'volley', 'stomp'], muzzle: [-80, -92] },
  hollow: { name: 'Jack-in-the-Boxer', blurb: 'A crooked jester on a spring that lobs exploding gifts.', hp: 26, speed: 40, attacks: ['mortar', 'mortar', 'stomp'], muzzle: [-10, -150] },
  wastes: { name: 'Dune Scorpion', blurb: 'A four-legged walker with a cannon on its tail.', hp: 28, speed: 60, attacks: ['spread', 'volley', 'stomp'], muzzle: [40, -150] },
  drowned: { name: 'Deep Diver', blurb: 'A diving-suit mech with a glass dome and heavy claws.', hp: 30, speed: 35, attacks: ['volley', 'mortar', 'stomp'], muzzle: [-60, -60] },
  void: { name: 'Neon Warden', blurb: 'A hovering sentinel on a ring of light.', hp: 30, speed: 70, attacks: ['spread', 'volley', 'spread', 'stomp'], muzzle: [-70, -88] },
  war: { name: 'Iron Marshal', blurb: 'A rolling siege tank with a long gun, the one that has been shelling the trenches.', hp: 36, speed: 38, attacks: ['mortar', 'volley', 'spread', 'stomp'], muzzle: [-84, -96] },
  spores: { name: 'Spore Mother', blurb: 'A tripod walker under a giant mushroom cap.', hp: 34, speed: 30, attacks: ['mortar', 'spread', 'stomp'], muzzle: [-70, -45] },
};

export const LEVELS: LevelDef[] = [
  {
    id: 'rooftops', number: 1, name: 'Rain-soaked Rooftops',
    blurb: 'A stormy night skyline of spires and lit windows.',
    style: 'city', music: 'city', precip: { vx: 130, vy: -520 }, lightning: true, bg: '#05070d',
    intro: 'Iggy powers on in a rain-soaked alley with one working leg and a vague memory of being important. The only road home runs across the rooftops, and Enforcer Nine, the city\'s last peacekeeper, does not like rusty strangers.',
    outro: 'Enforcer Nine folds up with a long, sad whistle. Behind it, a crooked little moon rises over a village that looks like a drawing someone left out in the rain.',
  },
  {
    id: 'hollow', number: 2, name: 'Spindle Hollow',
    blurb: 'Crooked striped houses, twisted trees and a swirly moon.',
    style: 'hollow', music: 'hollow', precip: { vx: 14, vy: -70 }, lightning: false, bg: '#0a0a1a',
    intro: 'Spindle Hollow is all crooked chimneys and striped roofs, and every shadow seems to be smiling. Somewhere in the music-box fog a jester on a spring is waiting to give Iggy a present.',
    outro: 'The Jack-in-the-Boxer pops, rattles and is finally still. The fog thins, and the hills beyond are the colour of old rust.',
  },
  {
    id: 'wastes', number: 3, name: 'Rust Wastes',
    blurb: 'A dust-choked desert of skeleton towers and a broken highway.',
    style: 'wastes', music: 'wastes', precip: { vx: 320, vy: -20 }, lightning: false, bg: '#2b1210',
    intro: 'The wastes are quiet except for the wind and the creak of skeleton towers. Iggy\'s shadow is the longest thing for miles, and something with a cannon on its tail has noticed it.',
    outro: 'The Dune Scorpion sinks into the sand. Far off, lit windows blink beneath the waves of a drowned city.',
  },
  {
    id: 'drowned', number: 4, name: 'Drowned Metropolis',
    blurb: 'Half-sunken towers, hanging vines and drifting green spores.',
    style: 'drowned', music: 'drowned', precip: { vx: 6, vy: 40 }, lightning: false, bg: '#06191c',
    intro: 'Half the metropolis lies under green water. Vines hang from broken balconies, and a diver in a very large suit patrols what is left of the skyline.',
    outro: 'The Deep Diver\'s dome cracks and its lights go out. Above the water, the sky has turned strange colours, and a grid of neon stretches to the horizon.',
  },
  {
    id: 'void', number: 5, name: 'Neon Void',
    blurb: 'Floating islands, a ringed planet and a neon grid horizon.',
    style: 'void', music: 'void', precip: { vx: 10, vy: 60 }, lightning: false, bg: '#0a0224',
    intro: 'There is no ground here, only floating islands, a ringed planet and a glowing grid. The Neon Warden circles on its ring of light, and it has never once been late for an arrest.',
    outro: 'The Neon Warden\'s ring flickers out. The last islands drift together, and beyond them something is growing.',
  },
  {
    id: 'spores', number: 6, name: 'Spore Garden',
    blurb: 'Giant glowing mushrooms under twin moons and an aurora.',
    style: 'spores', music: 'spores', precip: { vx: 8, vy: 36 }, lightning: false, bg: '#020c14',
    intro: 'The Spore Garden is warm, soft and not entirely friendly. Giant caps glow in the dark, and at the very top of the hill a tripod walks slowly under a mushroom the size of a house.',
    outro: 'The Spore Mother settles into the moss and lets out one long puff of light. Beyond the garden the sky turns the colour of old brass, and far off something heavy is firing.',
  },
  {
    id: 'trenches', number: 7, name: 'Ember Trenches',
    blurb: 'Barbed wire, rubble and shell craters under a smoking sky.',
    style: 'war', music: 'war', precip: { vx: 30, vy: -90 }, lightning: true, bg: '#1a0f0d',
    intro: 'The trenches are all mud, wire and smoke. Somewhere past the ridge the Iron Marshal, a siege tank with a very long gun, has been shelling this ground for years, and it has not run out of shells yet. Listen for the whistle, find the marker and get out of the way.',
    outro: 'The Iron Marshal rolls to a stop and its long gun droops. The smoke thins, the last shell lands somewhere harmless, and for the first time in years the trenches are quiet. Iggy\'s gears are humming. All his parts work, the road home is clear, and nothing rattles.',
  },
];

export const levelById = (id?: string | null): LevelDef => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
