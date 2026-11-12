# Levels 8 to 12: ice, dunes, wind, water and sky

The plan for five new levels and their bosses. Chris is drawing the art; this file is what the code will be built against.
Numbers are starting points to tune by playing.

## Order and story

The new levels go **before** the Reclamation Plant, which moves from level 8 to **level 13** and keeps the Reclaimer as the
final boss. The road home climbs through ice, desert, wind, water and sky, and the furnace smoke Iggy sees at the end of
level 7 is still on the horizon the whole way, getting closer.

| # | Level | Style key | Mechanic | Boss |
|---|---|---|---|---|
| 8 | Glacier Yards | `ice` | Slippery surfaces | Icebreaker |
| 9 | Glass Dunes | `dunes` | Slopes, sliding, quicksand | Dune Dredger |
| 10 | Turbine Gorge | `wind` | Wind pushback, updrafts | Gale Warden |
| 11 | Sunken Locks | `locks` | Water: sink, wade, currents | Brass Kraken |
| 12 | Sky Docks | `sky` | Floating platforms, lifts | Iron Albatross |
| 13 | The Reclamation Plant | `plant` | (unchanged) | The Reclaimer |

**Story beats** (each level's outro leads into the next):

- **7 → 8:** the trenches go quiet; the furnace smoke is far off across a frozen rail yard. (Level 7's outro gets a second
  rewrite: it currently leads straight to the Plant.)
- **8 Glacier Yards:** a rail yard frozen solid, trains iced to the tracks. Something huge is breaking a path through the ice.
- **9 Glass Dunes:** past the ice, a desert where the sand has been fused into glass. A dredge is mining it.
- **10 Turbine Gorge:** the only way on is a canyon dammed by a wall of giant fans, all of them running.
- **11 Sunken Locks:** beyond the gorge, the old canal locks have flooded. Something lives in the deepest one.
- **12 Sky Docks:** the last road is up: a floating airship port, and the fortress that guards it.
- **12 → 13:** from the sky docks Iggy finally sees the Reclamation Plant, right below him. (The Plant's intro stays as it is.)

## Shared rules

- **Accessibility, every level:** each new mechanic is announced the first time it appears, has a visible and audible tell,
  and has a gentler assist setting (named per level below). Reduced motion removes screen-filling effects (sandstorm, ink,
  heavy wind streaks) and keeps an icon or tint instead.
- **Suits matter:** the heavier suits (Steel Sentinel and up) resist wind and currents a little better, and grip ice a little
  better. Never so much that the plain suit can't finish a level.
- **Enemies:** each level mixes in the existing sixteen where they fit (listed per level).
- **Each boss uses its level's mechanic**, so the fights feel different.

---

## Level 8: Glacier Yards (ice)

- **Look:** a rail yard under snow and aurora: iced-over freight cars as platforms, frozen waterfalls, signal gantries, drifting
  snow. Pale blue ice, verdigris and rust showing through, the orange of a lone signal lamp.
- **Music:** a sparse, glassy minor-key theme with a ticking hi-hat, like ice creaking.

**Slippery surfaces (all horizontal surfaces):**
- Acceleration and braking drop to about **15 percent** of normal: Iggy reaches full speed over ~0.6 s and slides
  **one to two body lengths** after letting go. Turning round takes as long as stopping.
- **Duck brakes hard:** boot spikes dig in and he stops in about a quarter of the normal slide. This is the precise control.
- Landing keeps his horizontal speed (no grip on landing).
- Wall slides are faster and shorter before a wall kick.
- **Assist (stay protected longer):** ice grips at about 40 percent instead of 15.

**Hazards:**
- **Icicles** hang under gantries and over the tracks. When he runs under one: a crack sound and a shake for 0.6 s, then it
  drops (hit if under it), and shatters.
- **Snowdrifts** on some platforms: not slippery, slow him to 70 percent. Safe places to stop.
- Some gaps are frozen ponds: thin ice that cracks and breaks 0.8 s after he lands on it.

**Enemies:** skeleton soldiers, Rust Hounds (sliding on the ice makes their charge longer), Pogo Troopers, Magpie Drones.

### Boss: Icebreaker

A giant armoured icebreaker hull on spiked tracks: a riveted ram prow, frost-cannon turrets on the deck, a boiler glowing
through cracks in its ice-crusted armour.

- **Health:** 40. Arena: a frozen lake (the whole floor is ice) with solid walls at each end.

| Attack | Tell | What happens | How to survive |
|---|---|---|---|
| **Ram charge** | Tracks spin, ice spray, an engine roar, 1 s | Charges across the arena at 320 px/s. | Jump over the prow (it is low enough), or get to the far end. If it hits the far wall it is **stunned 3 s** and its boiler hatch opens: the weak point (shots 1, stomp on the hatch 4). |
| **Frost breath** | Vents frost, a hiss, 0.7 s | Freezes a stretch of floor into glare ice (even slicker, ~5 percent grip, 6 s). | Duck to brake on it, or jump across. |
| **Ice shards** | Turrets swivel, 0.5 s | Three shards lobbed in arcs; they stick in the floor as small obstacles for 4 s. | Read the arcs. |

- **Phase 2 (half health):** charges back and forth twice in a row, and frost breath follows each charge.
- Otherwise its armour is tough: shots do 1 only through the hatch; elsewhere they chip ice off (no damage).

---

## Level 9: Glass Dunes (sand and slopes)

- **Look:** rolling dunes of pale sand fused into glass shards, half-buried wrecks of giant machines, heat shimmer, a white sun.
  Sand gold, glass blue-white, rust.
- **Music:** a slow, hypnotic phrygian theme with hand-drum rhythms.

**Slopes (new: the ground is no longer flat roofs):**
- The ground is a rolling height line (dunes up to ~140 px high, slopes up to ~35 degrees). Iggy's feet follow it.
- **Uphill** he runs at 70 percent; **downhill** at 125 percent.
- **Slide:** hold Duck on a downslope to slide: speed builds to ~480 px/s. While sliding he **smashes small enemies** he hits
  (like the dash). Jumping off a crest while sliding launches him far (~1.6x a normal jump's distance).
- The slide ends on flat ground or uphill as speed runs out, or when Duck is let go.
- **Quicksand pits** in some troughs: he sinks slowly (to waist depth over 1.5 s, then deeper). Each jump lifts him out
  a little; three jumps escape. Sinking fully costs a life (slowly enough that it never feels sudden). Ripples and a sucking
  sound mark them.
- **Sandstorm gusts** every 20 to 30 s: a push of 80 px/s for 4 s and sand blowing across the screen (reduced motion: an
  icon and a light tint instead).
- **Assist:** quicksand sinks half as fast; slopes slow him less.

**Enemies:** Burrowers (they belong here), Crawlers, Grenadiers, Scrap Magnets on crests.

### Boss: Dune Dredger

A colossal mining dredge on treads: a turning bucket wheel the height of the screen at the front, a conveyor spine, sand chutes
and exhaust stacks.

- **Health:** 45. Arena: a wide bowl of dunes that the boss reshapes.

| Attack | Tell | What happens | How to survive |
|---|---|---|---|
| **Bucket wheel** | The wheel speeds up, grinding, 1 s | Digs a pit where Iggy stands and dumps the sand as a new dune elsewhere. The arena's shape keeps changing. | Move off the marked spot (a ring of disturbed sand). |
| **Sand blast** | A chute tilts towards him, 0.6 s | A wide jet of sand that pushes him back 200 px/s for 1.5 s. | Duck to hold position, or get behind a dune. |
| **Quicksand** (phase 2) | The ground ripples | Turns a trough into quicksand for 6 s. | Stay on the crests. |

- **Weak point:** the **engine housing** on its side. Only reachable at speed: slide down a dune and launch off the crest into
  it (5 damage, and he bounces off). Shooting the housing does 1 (so the fight can be won either way, slower by shooting).
- **Phase 2 (half health):** the wheel spins faster and it reshapes the arena twice as often.

---

## Level 10: Turbine Gorge (wind)

- **Look:** a canyon dammed by a vast industrial wind farm: walls of giant fans, spinning blades, catwalks and cable bridges.
  Grey-green rock, verdigris steel, orange warning stripes, white wind streaks.
- **Music:** a fast, breathless theme with a whooshing filtered noise layer.

**Wind pushback:**
- Marked **wind zones** (wind streaks, flags and a roar that rises with strength) blow towards the fan's direction:
  normally **160 px/s** against him, gusting to 240.
- Running into it is slow (Iggy runs 250); jumps go shorter and drift back.
- **Duck braces:** the push is halved while ducking (on the ground).
- **Heavier suits are pushed less:** Patchwork 90 percent, Steel Sentinel 80, Night Guardian 70, Gold Circuit 65.
- **Updraft vents** lift him up to high routes (300 px of lift while he's over one).
- **Spinning blades** between fans: hazards to time past (they slow and stop in a rhythm).
- **Assist:** wind is 60 percent as strong.

**Enemies:** Gearbats, Death-rays, Rivet Zeppelins, Shield Guards.

### Boss: Gale Warden

The biggest fan itself: a towering turbine mech, its chest a giant shrouded fan, its arms smaller fans, a motor housing glowing
behind the blades.

- **Health:** 45. Arena: a catwalk with a spinning-blade grinder at the left (behind Iggy).

| Attack | Tell | What happens | How to survive |
|---|---|---|---|
| **Gale** | The blades spin up, rising whine, 1 s | Blows Iggy back towards the grinder at 220 px/s for 3 s. Touching the grinder is a hit. | Duck to brace and run against it. |
| **Debris storm** | Scrap rattles in the wind | Scrap blown through the air in lines at different heights. | Jump or duck through the gaps. |
| **Arm fans** | An arm fan turns towards him | A narrow up- or downdraft column that lifts or pins him for 1 s. | Step out of the column. |
| **Reverse** (phase 2) | The whine drops, then reverses | Sucks him in for 2 s, then blows him out hard. | Same as the Reclaimer's pull: run away; then brace for the blast. |

- **Blade shield:** while the fan spins fast, shots **bounce off** the blades. Shots get through only when the blades slow
  (every ~6 s, for 2 s: the whine drops and the blades visibly slow).
- **Overload** (after every third gale): the blades jam and stop for 4 s, the motor housing is exposed (shots 2, stomp from
  a high catwalk 5).
- **Phase 2 (half health):** gales are stronger and the reverse joins in.

---

## Level 11: Sunken Locks (water)

- **Look:** a drowned canal system: lock gates, sluices, rusted pumps, chains and murky green water with light shafts.
  Bottle green, rust, brass, and the bubbles.
- **Music:** slow and muffled; it filters to a muffled underwater mix whenever Iggy is submerged.

**Water:**
- Iggy is a heavy robot: in water he **sinks and walks along the bottom** (he can't drown).
- Under water: walking at 55 percent, jumps at 65 percent height and floaty (lower gravity), bubbles stream from him.
- **Shots fizzle underwater:** he has to surface (or stand where the water is shallow) to shoot.
- **Wading** (water below his waist): 80 percent speed, can shoot.
- **Currents** in some channels: carry him along or against him at 100 px/s (arrows of bubbles show which way).
- **Lock gates:** switches (like level 1's brass button) raise or lower the water in a basin over 3 s, opening and closing routes.
- **Assist:** walking under water at 75 percent, currents weaker.

**Enemies:** Death-rays, Crawlers (under water too), Glitch Mites, Gloop Tenders on the dry walkways.

### Boss: Brass Kraken

A mechanical squid in the main lock: a riveted brass mantle, porthole eyes, a dozen segmented tentacles, a pump heart glowing in
its mantle.

- **Health:** 45. Arena: a lock basin with walkways on both walls at two heights and water in the middle.

| Attack | Tell | What happens | How to survive |
|---|---|---|---|
| **Tentacle slam** | A tentacle rises out of the water, dripping, 0.8 s | Slams down on a walkway (hit if under it), then lies across it for 2 s. | Step aside, then **stomp the tentacle** while it lies there: each stomp damages it; three stomps on one tentacle and it retracts, hurting the Kraken (3). |
| **Flood** | The pump heart thumps faster, water churns | Raises the water to the upper walkway for 8 s: Iggy is wading or under water and can't shoot. | Climb to the upper walkway in time; or walk the bottom and wait. |
| **Ink jet** | The mantle swells | Clouds the water and darkens the lower part of the screen for 3 s (reduced motion: a tint, not a cloud). | Stay on the walkways. |
| **Whirlpool** (phase 2) | The water spins | A current drags him round the basin. | Grab a walkway edge (the ledge hang works here). |

- **Weak point:** its **eyes**, which only open after two tentacles have retracted. Shots into an open eye do 2.
- **Phase 2 (half health):** more tentacles at once, floods last longer, and the whirlpool joins in.

---

## Level 12: Sky Docks (sky)

- **Look:** a floating airship port above a sea of cloud: mooring masts, wind-socks, propeller lifts, airships tied to
  floating decks. Sky blue to gold, white cloud, brass, verdigris.
- **Music:** big, open and soaring, a major-key march that turns minor near the boss.

**Nothing under you:**
- No buildings: **floating platforms** (some drift up and down, some side to side), **airship decks** that sway, **propeller
  lifts** that rise 200 px and fall back, and **drifting crates** to hop across.
- **Updrafts** from vents in the decks (like the wind level's) for big climbs.
- A miss is a long fall (a life), so **checkpoints are every ~1200 px** instead of ~2000.
- **Assist:** platforms move more slowly; a missed jump into the cloud returns him to the last platform once per checkpoint
  instead of costing a life.

**Enemies:** Rivet Zeppelins (at home here: more often), Magpie Drones, Gearbats, Glitch Mites.

### Boss: Iron Albatross

A flying fortress airship: a huge riveted gasbag, gun turrets along its gondola, four propeller engines and a bridge with a
glowing window. The fight is on its own deck and the airships alongside.

- **Health:** 50 (the turrets have their own small health; the bridge is the boss bar).
- **Arena:** Iggy starts on a dock; the Albatross pulls alongside and its deck becomes the floor.

| Attack | Tell | What happens | How to survive |
|---|---|---|---|
| **Turret fire** | A turret swivels and glows, 0.6 s | Each turret fires bursts (like the soldiers' bullets) along the deck. | Duck or jump; **destroy the turrets one at a time** (each has 4 health). Each turret down opens more of the deck. |
| **Bombing run** | It banks away, engines roar | Pulls back and drops a line of bombs on the dock (like the zeppelin, bigger). | Watch the gaps; get back aboard as it comes alongside. |
| **Prop wash** | An engine turns to face the deck | Blows the deck sideways (wind level rules) for 3 s. | Duck to brace. |

- **Phase 2 (all turrets down):** the bridge window opens to shots (1, charged 3) and it starts dropping bombs on its own deck.
- **Phase 3 (a fifth health left):** the gasbag tears, the whole ship lists and starts sinking through the cloud; Iggy runs up
  the tilting deck to the bridge for the last hits. Then a long fall... onto the roof of the Reclamation Plant.

---

## Art wanted

Same as before: all in the concept-sheet style and palette. **Bosses side-on** (facing left, towards Iggy), with their moving
parts drawn **clear of the body** so they can be rigged in Spine.

**Bosses (one sheet each):**
1. **`icebreaker.webp`:** hull with the ram prow; the tracks; 2 to 3 deck turrets; the boiler hatch closed and **open**
   (glowing); frost vents.
2. **`dune-dredger.webp`:** the body on treads; the **bucket wheel drawn separately**; sand chutes; the engine housing
   (the weak point) on its side.
3. **`gale-warden.webp`:** the body with the fan **shroud**, and the **fan blades drawn separately** (so they can spin);
   both arm fans; the motor housing exposed (blades stopped).
4. **`brass-kraken.webp`:** the mantle with the porthole eyes **open and closed**; **tentacle segments** drawn separately
   (a base, a middle and a tip are enough); the pump heart.
5. **`iron-albatross.webp`:** the gasbag; the gondola with the bridge window; **one turret** drawn on its own (it will be
   repeated); a propeller engine on its own; the **torn gasbag** for the last phase.

**Level pieces (optional, but they help a lot), one small sheet per level:**
- **Ice:** an icicle (hanging and broken), a snowdrift, a frozen freight-car platform, thin ice.
- **Dunes:** a quicksand pit, a stretch of dune with glass shards, a half-buried machine wreck.
- **Wind:** a wall fan, a spinning-blade hazard, an updraft vent, a wind-sock.
- **Locks:** a lock gate, a switch, a sluice, a chain, the water surface.
- **Sky:** a floating platform, a propeller lift, a mooring mast, a dock crate.
- **Backdrops (optional):** a wide scene for each level, used for the far parallax layer.

## Build order and effort

1. **Renumbering:** the Plant becomes level 13; its id and saved progress stay the same (levels are found by id), only the
   number and order change. Level 7's outro is rewritten for Glacier Yards.
2. **Ice** and **Wind** first: changes to how Iggy moves, quick to build.
3. **Water** and **Sky**: new movement rules and platform kinds, built from pieces that exist (moving platforms, the lock
   switch, the zeppelin's bombs, the soldiers' bullets).
4. **Dunes** last: slopes need a new kind of ground (a height line instead of flat roofs), the biggest single piece of work.
5. Each boss as its art arrives, rigged the same way as the Reclaimer.
