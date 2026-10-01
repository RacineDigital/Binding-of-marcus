# Binding of Marcus

A top-down, room-by-room action roguelike for the browser. Marcus goes down into the cellar of his late
grandfather's bindery, where the frightening stories the old bookbinder stitched shut have come
unbound. He has to fight through eight chapters and bind the story again.

Every sprite, room, sound effect and piece of music is generated in code at runtime. There are no
image or audio asset files.

## Download and play

Download the latest zip from the repository's **Releases** page, unzip it, and double-click
**Binding of Marcus.html**. It is a single self-contained file that runs offline in any modern browser.

## Running from source

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm test           # seeded-generation determinism + content validation (Node)
npm run smoke      # automated full playthrough in headless Chromium (needs the dev server running)
npm run build:single               # the whole game as one self-contained HTML file in dist-single/
npm run release                    # build the release zips into release/
```

To publish a new release, bump `version` in `package.json` and push, or push a tag such as `v1.1.0`. The
**Release** GitHub Actions workflow tests, builds and packages the game, then attaches the files to a new
GitHub Release tagged `v<version>`. A version that already has a release is skipped.

URL options: `?play` skips the menu and starts a run, `&seed=ABCD2345` starts from a fixed seed,
`&char=wren` picks a character. `?art=player|items|bosses|enemies0..3|props0..7|familiars` opens the
sprite preview sheets.

## Controls (all rebindable in Options → Controls)

| Action | Keyboard | Controller |
| --- | --- | --- |
| Move | W A S D | Left stick / D-pad |
| Fire | Arrow keys | Right stick (free aim) or face buttons |
| Use active item / interact | E | RB / RT |
| Cherry bomb | Space | LB |
| Use page or sweet | Q | LT |
| Steady (slow, precise movement) | Shift | L3 |
| Swap consumable | F | |
| Drop charm (hold) | R | R3 |
| Full map (hold) | Tab | Back |
| Pause | Esc / P | Start |

## What's in it

- **Combat.** Movement and twin-stick shooting run on a fixed 60 Hz step. Acceleration is tight
  and shots partly inherit Marcus's momentum. There is hit-stop on heavy hits, trauma-based screen
  shake, knockback, impact particles and enemy hit flashes. Shots leave persistent ink splatter on
  the floor.
- **Composable attacks.** Items feed a single `AttackProfile` that covers multishot, spread,
  piercing, spectral, homing, bouncing, splitting, explosions, chain lightning, orbiting,
  boomerang, wiggle, spiral, lobbed arcs, growth, acceleration, ink creep, statuses and critical
  hits. Shots, charge shots, bursts, beams, lasers, melee swings and familiars all read the same
  profile, so the modifiers stack in every combination:
  - Split shots home in on their own targets.
  - Piercing explosive shots blast every enemy they pass through.
  - Bouncing explosive shots detonate on each wall hit.
  - Larger shots orbit wider.
  - Beams bend toward enemies and reflect off walls.
- **173 items:** 123 passives, 29 actives and 21 familiars. Each one is a data definition with stat
  changes, attack changes, health and resource grants, bomb modifiers, hooks and an icon. There are
  also 20 Torn Pages (cards), 12 Unmarked Sweets (pills, randomised per run and identified on use)
  and 17 Charms (trinkets).
- **Reference items.** A Drain Gang / Bladee set (Icedancer, Gluee, Red Light, 333, Exeter...), a
  Playboi Carti set (Whole Lotta Red, Die Lit, Vamp Anthem, Magnolia, Sky, Stop Breathing...) and
  internet-era objects (Brick Phone, Pocket Pet, Lava Lamp, Aero Bubble, Y2K Bug).
- **Nine transformations.** Collecting three items that share a tag (moth, ink, clock, wax,
  thread, bone, void, drain, vamp) triggers one.
- **Eight chapters:**
  1. The Cellar
  2. The Boiler Rooms
  3. The Underworks
  4. The Forgotten Ward
  5. The Depths
  6. The Chapel
  7. The Hollow
  8. The Binding

  Chapters I–VII each have a seeded alternate version: Root Cellar, Coal Chute, Flooded Drains,
  Morgue, Catacombs, Belfry and Inkwell. Every chapter has its own floor and wall painter, palette,
  ambient particles, lighting, enemy pool, boss pool and music.
- **45 enemy types and 15 bosses.** Each enemy has a telegraphed attack. Each boss has an intro
  card, several attack patterns, phase changes and a death sequence. The Rat King and the Blotted
  Man tear themselves in half. The Unbound has three phases.
- **Seeded floors.** Floors are built on a hidden 13×13 grid with 1×1, 2×1, 1×2 and 2×2 rooms.
  Each floor places:
  - a boss room at the furthest dead end;
  - a treasure room and a shop;
  - optional special rooms: Proving Room (challenge), Pincushion (sacrifice), Button Parlor
    (arcade), Hexed Room (cursed), Archive (library), Lurker's Den (miniboss) and Odd Room (event);
  - a Crawlspace (secret room) and a Deep Crawlspace (super secret room) behind walls you have to
    bomb open.

  Bargain rooms (the Inkwell, where you pay in hearts, or the Wax Chapel, a free blessing) can
  appear after a boss. The same seed always produces the same layouts, room contents, bosses, shop
  stock and pedestal items.
- **Rooms** are a mix of procedurally generated layouts (mirrored rock clusters, walls, pillars, pit
  lakes, rings, corridors, hazards) and 40 handmade templates, with role-based enemy slots. Deeper
  rooms can roll a variant: Ambush (a second wave), Champion Den, Lights Out or Gilded Room. They
  contain rocks, chalk-marked stones with rewards inside, iron blocks, pits, spikes, timed spikes,
  four kinds of fire, paper/coal/wax heaps, powder kegs, urns, pillars and webs.
- **Health.** Red felt hearts, wax hearts (temporary), ink hearts (burst when lost), brass hearts
  (armour that absorbs a whole hit) and gilded hearts (spill buttons when broken). You get brief
  invulnerability after a hit.
- **Resources and pickups.** Buttons (currency), keys, cherry bombs, spark jars (active-item
  charge), tin, locked, crimson and reliquary boxes, slot machines, a fortune owl, beggars, a
  wishing well, the seamstress and the grandfather clock.
- **Progression.** 49 achievements unlock items, characters, challenges and Hard mode, so the item
  pool grows as you play. The save also holds an item collection, statistics, best scores, settings
  and a resumable run (Continue).
- **Modes.** Normal, Second Edition (Hard, unlocked by finishing the story) and a Daily Run with the
  same seed and reader for everyone that day. Every run ends with a score and a personal best.
- **Five characters:** Marcus, Wren, Edda, Elias and The Blot. **Five challenge runs.**
- **Audio.** Around 80 layered sound effects are rendered offline at startup with variants, pitch
  jitter, stereo panning, voice limiting and a shared reverb. The soundtrack is rendered offline in
  the background: synthesized distorted guitars (double-tracked, palm-muted chugs and power chords),
  a full drum kit, synth bass, pads, organ, choir and strings. Each chapter has its own genre (dark
  synthwave, industrial rock, darkwave, chamber rock, djent, gothic metal, industrial darksynth,
  symphonic gothic metal) with a calm stem and a combat stem that crossfade with the fight.
- **Smooth on any display.** The simulation runs at a fixed 60 Hz and rendering interpolates between
  steps, so 120/144/165/240 Hz monitors get smooth motion (frame cap and smoothing are in Options).
- **HUD.** Collected items show as an icon grid in the bottom-right corner; standing next to an item
  or shop pickup shows a readable card with its effects and price.

## Architecture

```
src/
  core/         loop constants, math, seeded RNG, input (keyboard + gamepad, rebinding), events
  render/       PixelArt toolkit (ramp shading, selective outlines), sprites, renderer/compositor
  art/          procedural painters: player rig, rooms, props, doors, pickups, NPCs, familiars, items
  effects/      pooled particles, lightning, decals
  audio/        DSP helpers, SFX recipes, music sequencer, Web Audio engine
  player/       player controller, health model, stats, characters
  projectiles/  attack profile, projectile pool, beams / lasers / melee
  enemies/      enemy runtime, AI helpers (BFS flow field, steering, patterns), per-chapter defs
  bosses/       boss framework (attack scheduler, phases, telegraphs) and boss defs
  items/        item schema, registry, pools, familiar runtime, item data files
  rooms/        room data, templates, collision
  generation/   floor graph generation and room population
  game/         game/scene control, world simulation, room flow, pickups, bombs, NPCs, renderer
  ui/           HUD, menus, drawing helpers
  save/         persistent save data
  data/         floors, achievements & challenges, lore
tests/          Node test suite, Playwright smoke bot, screenshot helper
```

The game world renders into a 480×270 buffer. It is upscaled with a sharp-bilinear pass, and a
smooth lighting layer and an additive glow layer are composited on top. The UI is drawn afterwards
at full display resolution, so text stays crisp.
