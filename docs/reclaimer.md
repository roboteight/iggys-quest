# The Reclaimer: final boss and Level 8

The plan for Iggy's last level and its boss. Chris is drawing the art; this file is what the code will be built against, so
the two match. Timings are starting points to tune by playing.

## Story

The Reclaimer is the scrap-processing machine that eats old robots and melts them down. Iggy is the one that got away: that
is why he woke up in an alley with one working leg. Every boss on the way was built from parts it spat out, which is why they
all share its rust and verdigris. It is waiting at the end of the road home, and it wants its parts back.

- **Level 7 outro (rewrite):** the Iron Marshal falls, the trenches go quiet... and on the horizon a column of furnace smoke
  rises over a plant the size of a city. Iggy's gears go cold: he remembers it.
- **Level 8 intro:** the Reclamation Plant. Conveyors still running, crushers still dropping, and somewhere inside, the thing
  that took him apart.
- **Level 8 outro (the ending):** the furnace goes out, the plant goes dark, and for the first time in years nothing in it is
  moving. Iggy walks out the far gate. The road home is clear.

## Level 8: The Reclamation Plant

- **Look:** black iron, furnace orange, verdigris pipes. A dark plant interior that gets redder towards the arena. Falling
  ash instead of rain. Distant crushers thumping in the background layer. New style key: `plant`; new music theme: a slow,
  heavy industrial pulse that the boss fight builds on.
- **Ground:** roofs become iron gantries and platforms. Gaps are **slag pits** (glowing, they still cost a life).
- **New hazards (code):**
  - **Conveyor belts** on some platforms: carry Iggy left or right at 90 px/s. Arrows on the belt and a rattling sound
    show which way.
  - **Crushers:** a press that drops on a timer. Shadow and a hiss 0.8 s before it falls; it stays down 0.6 s (a
    platform to stand on), then rises.
- **Enemies:** a greatest-hits mix of all sixteen, at the highest difficulty, plus Rivet Rats on every cliff.
- **Length:** like the other levels (the boss arena opens at 4000 points).

## The Reclaimer

- **Size:** taller than the screen. It stands at the right of the arena with its smokestacks and the top of its head off the
  top edge. Feet (or tracks) on the arena floor; its chest maw at about Iggy's head height.
- **Health:** 60 (Iron Marshal has 36). It only takes damage while overheated (see below), so the fight is a rhythm.
- **Arena:** the camera locks as for the other bosses. Iggy has about 600 px of floor in front of it.

### The cycle

The fight is a loop of **Shielded** then **Overheated**:

| State | Length | What it means |
|---|---|---|
| **Shielded** | 7 s (phase 1), 5 s (phase 2) | A molten slag barrier wraps it. Shots melt on it (a hiss, no damage); stomping it burns (a hit). It attacks throughout. |
| **Overheating** (warning) | 1 s | The shield flickers and drips, the vents on its back start to glow, a rising whistle. |
| **Overheated** | 4 s (phase 1), 3 s (phase 2) | Shield gone. The vents blow open, glowing white. Shots do 1 damage; a stomp on a vent does 5; a charged shot 2. |

Each overheat window drops a power-up crate (like the other boss fights) so Iggy is never out of ammo for long.

### Attacks

All have a visible and audible tell, and a screen-reader announcement the first time.

| Attack | Tell | What happens | How to survive |
|---|---|---|---|
| **Claw slam** | A shadow on the floor under Iggy and a hydraulic screech, 0.9 s | The claw crashes down on the shadow (hit if under it). It stays stuck in the floor for 1.2 s. | Step out of the shadow. While it is stuck, jump on the claw and run up the arm: the top of the arm is the quickest way to the vents. |
| **Wrecking ball** | The chain winds back with a creak, 0.8 s | A low sweep across the arena floor, then back (two passes). Every third sweep is a high one. | Jump the low sweeps; duck under the high one. |
| **Intake** | The turbines spool up: a rising roar, scrap blowing towards the maw, 1.2 s | For 3 s it pulls Iggy towards the maw: 160 px/s on the ground, 240 px/s in the air (jumping makes it worse). Reaching the maw = **swallowed**: a hit (one suit lost), chewing noises, and he is spat out across the arena with 1.5 s of protection. | Run away from it; stay on the ground; shelter behind a scrap block. The magnet power-up does **not** help (that's the point). |
| **Scrap drop** | Clanking from above, a shadow, 0.7 s | Two or three scrap blocks fall into the arena (hit if one lands on him). They stay as cover: standing behind one blocks the Intake pull. They melt after 10 s. | Dodge the shadows, then use the blocks. |
| **Slag spit** (phase 2+) | The maw glows and gurgles, 0.6 s | Three molten blobs lobbed in arcs (like the mortar), leaving small burning puddles for 3 s. | Read the arcs; don't stand in puddles. |
| **Conveyor floor** (phase 2+) | The floor plates grind and arrows light up | The arena floor runs towards the maw at 70 px/s for 6 s. Combined with the Intake, this is the scariest moment of the fight. | Keep running. |

### Phases

1. **Phase 1 (60 to 31 health):** stands still. Shield 7 s / overheat 4 s. Attacks from: claw slam, wrecking ball, scrap
   drop. Teaches the rhythm.
2. **Phase 2 (30 to 13 health):** a roar, the screen shakes, it rips the conveyor out of its own floor. Shield 5 s /
   overheat 3 s. Adds Intake, slag spit and the conveyor floor. Attacks come quicker.
3. **Phase 3 (12 to 0 health):** its armour plates fall off and the shield is gone for good. It slumps forward and drags
   itself towards Iggy on its arms, 15 px/s, shrinking the arena. The glowing core in its chest is always exposed (shots 1,
   stomp on the core 4). Intake almost constantly (2 s on, 1.5 s off). A desperate last stand that should last about 20 s.

When it falls: the furnace light dies, the eyes go out one by one, a long mechanical groan, then silence and the ending card.

### Fairness and accessibility

- Every attack has a sound, a visual tell and (the first time) an announcement. The shield state is announced on change
  ("Shield up", "Overheating", "Vents open: hit it now") and shown in the boss HUD bar as text, not only colour.
- The **enemy speed** assist slows the whole cycle (longer overheat windows, slower tells).
- The **stay protected longer** assist weakens the Intake pull (110 / 160 px/s) and lengthens protection after being
  swallowed.
- Reduced motion: no screen shake, no flicker (steady colours instead), no spinning debris.
- High contrast: the vents and the shield get a solid outline.

## Art wanted

All in the concept-sheet style and palette. Side-on (it faces left, towards Iggy) helps a lot, because this one gets a proper
Spine rig with moving limbs.

1. **`reclaimer.webp`, the main sheet.** The Reclaimer side-on, with these drawn as separate, non-overlapping parts so they can
   be rigged:
   - body / furnace housing with the chest maw (jaw drawn **open**, and ideally a closed version too);
   - the claw arm in 2 to 3 segments (shoulder, forearm, claw);
   - the wrecking-ball arm, its chain and the ball;
   - the head with its many eyes; the smokestacks;
   - the legs or tracks;
   - the back vents, closed and **blown open** (glowing white).
2. **`reclaimer-details.webp`:** the slag shield (a molten barrier around it), a falling scrap block, a slag blob, the
   exposed core, and the armour-off phase 3 body.
3. **`plant-backdrop.webp`, optional:** the Reclamation Plant interior (gantries, conveyors, furnaces, crushers) for the
   level backdrop.
4. **`reclaimer-concept.webp`, optional:** a nice full illustration for the landing page.

## Code to write

- `levels.ts`: style `plant`, level 8, the boss definition; rewrite level 7's outro.
- Art: the `plant` backdrop and gantry buildings, slag pits, ash; a `plant` music theme.
- Hazards: conveyor belts, crushers.
- The boss: its own state machine (shield cycle, phases, the six attacks, arena shrink in phase 3) rather than the shared
  boss code, and a Spine rig like Iggy's and Enforcer Nine's.
- Landing page: level 8 card, the boss in "The boss mechs", "8 worlds" and "8 boss mechs" in the highlights.
