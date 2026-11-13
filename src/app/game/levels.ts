import type { ThemeName } from './music';

export type LevelStyle = 'city' | 'hollow' | 'wastes' | 'drowned' | 'void' | 'spores' | 'war' | 'ice' | 'dunes' | 'wind' | 'locks' | 'sky' | 'plant' | 'foundry';

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
  /** the score that opens the boss arena, if not BOSS_SCORE (the last level is longer) */
  goal?: number;
}

/** Score at which the level's boss arena appears. Defeating the boss finishes the level. */
export const BOSS_SCORE = 4000;

/** pour: a ladle of molten metal lobbed onto the floor, which burns for a few seconds. sweep: the hammer swung flat across
 *  the arena, low (jump it) or high (duck under it). volley: aimed shots. spread: a fan. mortar: lobbed shells. stomp: a shockwave, then it kneels (stomp its head).
 *  charge: a lunge forward (back off). ring: shots in every direction, with gaps. rain: shells falling on marked spots. */
export type BossAttack = 'volley' | 'spread' | 'mortar' | 'stomp' | 'charge' | 'ring' | 'rain' | 'pour' | 'sweep';
export interface BossDef {
  name: string;
  blurb: string;
  hp: number;
  /** walking speed in px/s (0 = hovers in place) */
  speed: number;
  attacks: BossAttack[];
  /** where shots leave the mech, relative to the middle of its feet (facing left) */
  muzzle: [number, number];
  /** an energy shield that this many hits break (a head stomp smashes it outright); it comes back after a few seconds */
  shield?: number;
  /** the shield is held up by this many locks: each break smashes one for good, and with none left it's gone */
  locks?: number;
  /** the attacks once its locks are gone, and once it's down to a third of its health (its fight gets harder in stages) */
  phase2?: BossAttack[];
  phase3?: BossAttack[];
}

export const BOSSES: Record<LevelStyle, BossDef> = {
  city: { name: 'Enforcer Nine', blurb: 'A hunched, bird-legged peacekeeper with cannons for arms.', hp: 24, speed: 50, attacks: ['volley', 'volley', 'stomp'], muzzle: [-90, -120] },
  hollow: { name: 'Grandfather Gloom', blurb: 'A crooked clockwork giant on striped stilts that lobs exploding music-box gifts.', hp: 26, speed: 40, attacks: ['mortar', 'mortar', 'volley', 'stomp'], muzzle: [-38, -164] },
  wastes: { name: 'Dust Scorpion', blurb: 'A four-legged walker with a cannon on its tail.', hp: 28, speed: 60, attacks: ['spread', 'volley', 'charge', 'stomp'], muzzle: [34, -128] },
  drowned: { name: 'Deep Diver', blurb: 'A diving-suit mech with a glass dome and heavy claws.', hp: 30, speed: 35, attacks: ['volley', 'mortar', 'charge', 'stomp'], muzzle: [-70, -92] },
  void: { name: 'Neon Warden', blurb: 'A hovering sentinel on a ring of light.', hp: 32, speed: 70, attacks: ['spread', 'ring', 'volley', 'stomp'], shield: 4, muzzle: [-72, -86] },
  war: { name: 'Iron Marshal', blurb: 'A rolling siege tank with a long gun, the one that has been shelling the trenches.', hp: 36, speed: 38, attacks: ['mortar', 'rain', 'volley', 'spread', 'stomp'], muzzle: [-78, -88] },
  spores: { name: 'Spore Mother', blurb: 'A tripod walker under a giant mushroom cap.', hp: 34, speed: 30, attacks: ['mortar', 'rain', 'spread', 'stomp'], muzzle: [-58, -108] },
  ice: { name: 'Icebreaker', blurb: 'An armoured icebreaker hull on spiked tracks, with a ram prow and frost-cannon turrets.', hp: 40, speed: 70, attacks: ['charge', 'volley', 'spread', 'ring', 'stomp'], shield: 5, muzzle: [-60, -120] },
  dunes: { name: 'Dune Dredger', blurb: 'A colossal mining dredge with a bucket wheel that reshapes the sand.', hp: 43, speed: 40, attacks: ['mortar', 'rain', 'charge', 'spread', 'stomp'], muzzle: [-100, -122] },
  wind: { name: 'Gale Warden', blurb: 'A towering turbine mech whose chest is a giant fan.', hp: 46, speed: 30, attacks: ['spread', 'ring', 'volley', 'charge', 'stomp'], shield: 6, muzzle: [-10, -110] },
  locks: { name: 'Brass Kraken', blurb: 'A mechanical squid lurking in the flooded lock, all brass tentacles and porthole eyes.', hp: 48, speed: 0, attacks: ['mortar', 'volley', 'rain', 'ring', 'stomp'], muzzle: [-30, -120] },
  sky: { name: 'Iron Albatross', blurb: 'A flying fortress airship with a gun turret and a bridge window that glows.', hp: 52, speed: 45, attacks: ['mortar', 'rain', 'volley', 'ring', 'spread'], shield: 7, muzzle: [-40, -40] },
  // the secret final boss (level 14): three golden locks hold up its shield, then the floor gives way and it fights harder
  foundry: {
    name: 'The Forgemaster', blurb: 'The walking foundry that forged every boss mech, with a forge hammer, a ladle of molten metal and three golden locks on its chest.',
    hp: 120, speed: 22, attacks: ['stomp', 'pour', 'rain', 'volley'], muzzle: [-32, -273], shield: 6, locks: 3,
    phase2: ['sweep', 'pour', 'ring', 'rain', 'stomp'], phase3: ['sweep', 'pour', 'ring', 'rain', 'charge', 'volley'],
  },
  // the final boss runs its own fight (play.scene.ts, the Reclaimer section); these attacks are only a fallback
  plant: { name: 'The Reclaimer', blurb: 'The scrap plant that eats old robots and melts them down. The machine that took Iggy apart.', hp: 60, speed: 0, attacks: ['mortar', 'volley'], muzzle: [-120, -220] },
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
    intro: 'Spindle Hollow is all crooked chimneys and striped roofs, and every shadow seems to be smiling. Somewhere in the music-box fog a giant clock on striped stilts is ticking, and it has a present for Iggy.',
    outro: 'Grandfather Gloom chimes thirteen, sways and is finally still. The fog thins, and the hills beyond are the colour of old rust.',
  },
  {
    id: 'wastes', number: 3, name: 'Rust Wastes',
    blurb: 'A dust-choked desert of skeleton towers and a broken highway.',
    style: 'wastes', music: 'wastes', precip: { vx: 320, vy: -20 }, lightning: false, bg: '#2b1210',
    intro: 'The wastes are quiet except for the wind and the creak of skeleton towers. Iggy\'s shadow is the longest thing for miles, and something with a cannon on its tail has noticed it.',
    outro: 'The Dust Scorpion sinks into the sand. Far off, lit windows blink beneath the waves of a drowned city.',
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
    outro: 'The Iron Marshal rolls to a stop and its long gun droops. The trenches go quiet. Far off across a frozen rail yard, a column of furnace smoke climbs into the sky, and Iggy\'s gears go cold. He remembers that smoke. The only way towards it is across the ice.',
  },
  {
    id: 'glacier', number: 8, name: 'Glacier Yards',
    blurb: 'A rail yard frozen solid. Every surface is slippery, and icicles hang over the tracks.',
    style: 'ice', music: 'ice', precip: { vx: 30, vy: -60 }, lightning: false, bg: '#0a1420',
    intro: 'The rail yard froze years ago with the trains still on the tracks. Every surface is glazed with ice, so Iggy slides wherever he goes: duck to dig his boot spikes in and stop. Something huge is breaking a path through the ice ahead.',
    outro: 'The Icebreaker grinds to a halt and its boiler hisses out in a cloud of steam. Beyond the yard the snow thins into sand, and the sand glitters like broken glass.',
  },
  {
    id: 'dunes', number: 9, name: 'Glass Dunes',
    blurb: 'Rolling dunes fused into glass. Slide down the slopes to build speed.',
    style: 'dunes', music: 'dunes', precip: { vx: 160, vy: -20 }, lightning: false, bg: '#2a1a0c',
    intro: 'A desert where the sand has been fused into glass by some old fire. The dunes roll on for miles: running uphill is slow, but hold duck on the way down and Iggy slides like a sled. A dredge is mining the dunes somewhere ahead.',
    outro: 'The Dune Dredger\'s bucket wheel creaks to a stop, half buried. The wind picks up. Ahead, a canyon is walled off by a row of giant fans, every one of them turning.',
  },
  {
    id: 'gorge', number: 10, name: 'Turbine Gorge',
    blurb: 'A canyon dammed by giant fans. The wind pushes Iggy back.',
    style: 'wind', music: 'wind', precip: { vx: -380, vy: -30 }, lightning: false, bg: '#14201f',
    intro: 'The only way on is through Turbine Gorge, where a wall of industrial fans blows a gale down the canyon. Where the wind streaks show, it pushes Iggy back: duck to brace against it. The heavier suits stand up to it better.',
    outro: 'The Gale Warden\'s blades judder and stop. The canyon falls silent, and below it the old canal locks have flooded, green and still.',
  },
  {
    id: 'locks', number: 11, name: 'Sunken Locks',
    blurb: 'Flooded canal locks. Iggy sinks in the water and walks along the bottom.',
    style: 'locks', music: 'locks', precip: { vx: 0, vy: -40 }, lightning: false, bg: '#071a17',
    intro: 'The canal locks have flooded. Iggy is a heavy robot, so in the water he sinks and walks along the bottom: slow, with floaty jumps, and his shots fizzle under water. Something big lives in the deepest lock.',
    outro: 'The Brass Kraken sinks into the dark, its eyes shuttering one by one. Above the locks, airships are tied to platforms floating in the clouds. The last road home goes up.',
  },
  {
    id: 'skydocks', number: 12, name: 'Sky Docks',
    blurb: 'A floating airship port above the clouds, with nothing underneath.',
    style: 'sky', music: 'sky', precip: { vx: 60, vy: -20 }, lightning: false, bg: '#3a6a9a',
    intro: 'The Sky Docks float above a sea of cloud: decks, moorings and drifting platforms, and nothing at all underneath. A missed jump is a long fall. The fortress that guards the docks is waiting at the far end.',
    outro: 'The Iron Albatross lists, its gasbag torn, and slides down through the clouds with Iggy still aboard. It crashes through the roof of a plant the size of a city. He knows this place. It is where he was taken apart.',
  },
  {
    id: 'plant', number: 13, name: 'The Reclamation Plant', goal: 7000,
    blurb: 'Iron gantries over slag pits, conveyors and crushers, and the machine at the heart of it all.',
    style: 'plant', music: 'plant', precip: { vx: 20, vy: -60 }, lightning: false, bg: '#0b0605',
    intro: 'The Reclamation Plant never stopped working. Conveyors still run, crushers still drop, and slag still glows in the pits below the gantries. Every robot on the road home was built from parts this place spat out. Somewhere inside is the machine that took Iggy apart, and it wants its parts back.',
    outro: 'The Reclaimer\'s furnace sputters and goes out. Its eyes go dark one by one, and for the first time in years nothing in the plant is moving. Iggy walks out through the far gate into the morning. The road home is clear, and nothing rattles.',
  },
  {
    // the secret level: unlocked by finding the golden breadboard on every one of the 13 levels before it (progress.service.ts)
    id: 'foundry', number: 14, name: 'The Foundry Below', goal: 6000,
    blurb: 'The secret foundry under the plant, where every boss mech was forged.',
    style: 'foundry', music: 'foundry', precip: { vx: 30, vy: -90 }, lightning: false, bg: '#120604',
    intro: 'The thirteen golden breadboards fit together into a key, and under the plant a door that was never on any map grinds open. Below is a foundry older than the plant itself, still pouring metal. Every boss Iggy fought was forged down here, and the thing that forged them is waiting.',
    outro: 'The Forgemaster\'s hammer drops, its furnace eye goes dark, and the molten channels cool to black glass. The foundry falls silent. Nothing will be forged down here again, and Iggy climbs back up into the daylight with the golden key in his hand.',
  },
];

export const levelById = (id?: string | null): LevelDef => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
