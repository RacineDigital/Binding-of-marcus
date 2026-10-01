# Lost Marcus

[![Downloads](https://img.shields.io/github/downloads/RacineDigital/Binding-of-marcus/total?label=downloads)](https://github.com/RacineDigital/Binding-of-marcus/releases) [![Latest release downloads](https://img.shields.io/github/downloads/RacineDigital/Binding-of-marcus/latest/total?label=latest%20release)](https://github.com/RacineDigital/Binding-of-marcus/releases/latest)

A top-down, room-by-room action roguelike for Windows and the browser. Marcus goes down into the cellar of his late
grandfather's bindery, where the frightening stories the old bookbinder stitched shut have come
unbound. He has to fight through eight chapters and bind the story again.

Every sprite, room, sound effect and piece of music is generated in code at runtime. There are no
image or audio asset files.

## Download and play

Open the repository's **Releases** page and download one of these (every version's changes are in
[CHANGELOG.md](CHANGELOG.md)):

- **Windows:** `Lost-Marcus-Setup-X.Y.Z.exe` (installer with shortcuts) or
  `Lost-Marcus-X.Y.Z-portable.exe` (no install). Progress is saved to
  `%APPDATA%\Lost Marcus\saves`. F11 toggles fullscreen. The .exe is not code-signed, so
  SmartScreen may warn: click **More info**, then **Run anyway**.
- **Any computer:** the zip. Unzip it and double-click **Lost Marcus.html**. It is one
  self-contained file that runs offline in any modern browser and saves in the browser's storage.

### Discord status (desktop)
The Windows version can show what you're doing on your Discord profile ("Playing Lost Marcus",
the chapter, the boss you're fighting and how long the run has lasted). It needs a Discord
application, whose name is what Discord shows after "Playing":

1. Go to https://discord.com/developers/applications, click **New Application** and give it the
   name you want people to see (for example *Lost Marcus (Beta)*).
2. Copy the **Application ID** from the General Information page and put it in
   `DISCORD_CLIENT_ID` in `electron/main.cjs` (or set the `LOST_MARCUS_DISCORD_ID` environment
   variable). The official app's ID is already filled in.
3. Optional: under **Rich Presence → Art Assets**, upload a 512×512 or larger image named `logo`.
   It appears as the big picture on the status card. `art/discord-logo-1024.png` is made for this.

It turns itself off when Discord isn't running and can be switched off in Options → Discord status.

### Saving
The game autosaves on every room you enter and when you close it, so **Continue** puts you back in
the exact room with the floor as you left it. There are three save slots (Save Slots on the title
screen), each of which can be exported to a file, imported again, or erased. Settings are shared
between slots.

## Running from source

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm test           # seeded-generation determinism + content validation (Node)
npm run smoke      # automated full playthrough in headless Chromium (needs the dev server running)
npm run build:single               # the whole game as one self-contained HTML file in dist-single/
npm run release                    # build the release zips into release/
npm run desktop                    # build and run the desktop (Electron) version
npm run dist:win                   # Windows installer + portable .exe in release-desktop/ (run on Windows)
npm run test:synergy               # every item x every attack mode in headless Chromium (needs the dev server)
```

The Release workflow also builds the Windows .exe files on a Windows runner, starts the packaged game
in a self-test mode (`--smoke`), and attaches them to the release. The **Windows build check**
workflow does the same on every push without publishing.

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
| Map and item info (hold) | Tab | Back |
| Pause | Esc / P | Start |
| Screenshot | F9 / F12 | |
| Fullscreen (desktop) | F11 / Alt+Enter | |

Menus also work with the mouse: hover, click and scroll.

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
  - Beams bend toward enemies and reflect off walls, and carry every effect: statuses, crits,
    splits, explosions, chaining, creep, lifesteal, wiggle, spirals, rear and side beams.
  - Blades carry the same effects; rear and side shots add extra blades.
  - Attack modes combine instead of replacing each other: a blade with a laser fires a laser each
    swing, a blade with the Burning Glass releases beams from its spin, lasers make the Burning
    Glass charge faster, Held Breath thickens beams and lasers, and Bellows Lung adds shot sprays.
  - Shadow twins copy your beam or laser; contact familiars apply your status effects.

  `npm run test:synergy` checks every item with every attack mode and every pair of modes, checks
  that each shot modifier's effect really shows up in every mode, and runs hundreds of random builds.
- **204 items:** 139 passives, 43 actives and 22 familiars. Each one is a data definition with stat
  changes, attack changes, health and resource grants, bomb modifiers, hooks and an icon. There are
  also 20 Torn Pages (cards), 12 Unmarked Sweets (pills, randomised per run and identified on use)
  and 17 Charms (trinkets).
- **Reference items.** A Drain Gang / Bladee set (Icedancer, Gluee, Red Light, 333, Exeter...), a
  Playboi Carti set (Whole Lotta Red, Die Lit, Vamp Anthem, Magnolia, Sky, Stop Breathing...) and
  internet-era objects (Brick Phone, Pocket Pet, Lava Lamp, Aero Bubble, Y2K Bug), plus Jeffy's
  Big Boy Diaper, Nose Pencil and Blue Bike Helmet.
- **The dice.** Every die from Isaac: D1, D4, the D6, D7, D8, D10, D12, D20, D100, Eternal D6,
  Spindown Dice and D Infinity (which rolls whichever face it shows), plus a D9 that rerolls your
  charms. The strongest ones are earned: the D4 (two transformations at once), D8 (15 damage),
  Spindown Dice (three challenges), D100 (beat the Author) and D Infinity (roll every other die).
- **Ten transformations.** Collecting three items that share a tag (moth, ink, clock, wax,
  thread, bone, void, drain, vamp, jeffy) triggers one, and each one changes how you look. Jeffy
  throws a tantrum of pencils whenever he gets hit.
- **One pool per item.** Every item lives in exactly one pool, and a transformation's items all
  share theirs. Inkblooded lives in the Inkwell, King Vamp in secret rooms, Clockwork in the shop,
  and so on. Each item's description says which pool it is from, and Inkwell, Hexed and Chapel
  items carry a glow of their room wherever they turn up.
- **Twenty chapters in a different order every run.** A run is seven chapters drawn from twenty
  (never two from the same family), then The Binding. The first chapter is always a gentle one,
  and no chapter shows up more than one step earlier than its usual depth. Enemy health and room
  budgets follow how deep you are, not which chapter you are in, so any chapter is fair wherever it
  lands.
  - The originals: The Cellar, The Boiler Rooms, The Underworks, The Forgotten Ward, The Depths,
    The Chapel and The Hollow.
  - Their alternates: Root Cellar, Coal Chute, Flooded Drains, Morgue, Catacombs, Belfry and
    Inkwell.
  - New: The Attic, The Greenhouse, The Print Shop, The Frozen Cistern, The Clocktower and The
    Library Stacks.

  Every chapter has its own floor and wall painter, palette, ambient particles, lighting, enemy
  pool, boss pool and music.
- **45 enemy types and 25 bosses.** Each enemy has a telegraphed attack. Each boss has an intro
  card, several attack patterns, phase changes and a death sequence. Every chapter has at least two
  bosses that fit it: the Thornwife in the Greenhouse, the Rime Bride in the Frozen Cistern, the
  Pendulum in the Clocktower, the Typesetter in the Print Shop and the Bookbinder in the Binding
  join the originals. The Rat King and the Blotted Man tear themselves in half. The Unbound has
  three phases.
- **Beyond the Binding.** Once you've finished the story, beating the Binding opens two ways on: an
  EXIT door that ends the run as a win, and a tear in the page. The tear leads to **The Margins**, a
  huge chapter of the hardest creatures with five identical boss rooms, one to three treasure rooms
  and a shop. Every boss there drops a boss item, but only one of them opens the way to **The Last
  Page**, a huge arena where **The Unwritten** waits: it rewrites itself into the shapes of the
  bosses you've beaten (and fights like them) before throwing everything at once. Once you've
  beaten the Unwritten twice, a third way opens: a **beam of light** up to **The Dedication** and
  **The Foreword**, where **The Author** waits. Each path has its own ending: the EXIT, the ink,
  and the light. After your first finished story the Binding's boss is always **It Remembers**,
  the Unbound awake and angrier (like Mom's Heart becoming It Lives), so you know you're in the
  end game.
- **Final bosses.** Only the bosses you can end the story on are hard: they hit harder, attack
  faster and have a bullet-hell last stand. The Unwritten and the Author are the Delirium fight:
  ten times the health, eight phases, layered bullet patterns and constant shape changes into any
  boss you've beaten. Every boss opens with an Isaac-style VS screen.
- **Transformations announce themselves** with a big title card and a sound.
- **Echoes.** Where your last run died, your echo waits next time: a ghost of the reader you
  died as, in a room of its own, fighting the way you did. Lay it to rest and it leaves one of the
  items it carried. Chapter bosses are sometimes **champions** (Crimson, Gilded or Inked).
- **The story, and the paths it hides.** Everything in the book belonged to someone: Grandfather
  Elias, who was writing it for Marcus; Grandmother Ada, whose clock stopped at 4:04; Aunt Edda,
  Nell, Wren and the rest. Their things carry a line of history in the Collection, the characters
  and bosses tie back to them, and 25 of **Grandfather's Notes** lie around the chapters (on the
  hospital path and after the endings too), readable again from the Journal. Read in order, they
  tell what really happened, and point at the paths that are hidden:
  - **The back stair (St. Agnes).** Once the story is finished, the Chapter II boss room has a
    boarded stair. Bomb it open and the run goes up into the hospital instead of Chapters III–V:
    **The Waiting Room**, **The Night Ward** and **Intensive Care** (where **the Iron Lung**
    breathes). Grandfather tore his letter in two: one half waits at the hospital's lost property
    (always the Lost & Found here, so don't get hit), the other is in a Deep Crawlspace (there's
    always one). With the whole letter, **Room 4** opens after Intensive Care, and **The Patient**
    is waiting in the bed. Without it, the run goes back down to the usual chapters.
  - **Five endings**, numbered and kept in the Journal with a clue for each one you haven't seen:
    Morning (the Binding), In His Own Hand (the Last Page), For Marcus (the Foreword), The Visit
    (Room 4) and **Goodnight**: see the other four, then visit Room 4 again, and the morning comes
    in through the window. Each ending closes with a line for whichever reader got there, and the
    title screen changes once the book is finished.
  - New keepsakes to earn: Get Well Soon (put the letter together), Grandad's Cardigan (the visit)
    and The Last Word (Goodnight).
- **Seeded floors.** Floors are built on a hidden 13×13 grid with 1×1, 2×1, 1×2 and 2×2 rooms.
  Each floor places:
  - a boss room at the furthest dead end;
  - a treasure room and a shop;
  - optional special rooms: Proving Room (challenge), Pincushion (sacrifice), Button Parlor
    (arcade), Hexed Room (cursed), Archive (library), Lurker's Den (miniboss) and Odd Room (event);
  - a Crawlspace (secret room) and a Deep Crawlspace (super secret room) behind walls you have to
    bomb open.

  Bargain rooms can appear after a boss: the Inkwell (pay in hearts), the Wax Chapel (a free
  blessing) or the Lost & Found (things you left behind, traded one-for-one for something you
  carry). The odds are on the HUD like Isaac's devil/angel chance: getting hit this chapter costs
  +35%, getting hit by the boss costs +15%, and a door last chapter halves it. Hold Tab to see the
  breakdown. The same seed always produces the same layouts, room contents, bosses, shop stock and
  pedestal items.
- **Rooms** are a mix of procedurally generated layouts (mirrored rock clusters, walls, pillars, pit
  lakes, rings, corridors, hazards) and 40 handmade templates, with role-based enemy slots. Deeper
  rooms can roll a variant: Ambush (a second wave), Champion Den, Lights Out or Gilded Room. They
  contain rocks, chalk-marked stones with rewards inside, iron blocks, pits, spikes, timed spikes,
  four kinds of fire (all of which can be shot out), paper/coal/wax heaps, powder kegs, urns, pillars and webs.
- **Room clear rewards.** Every cleared room usually drops something, and big rooms roll twice.
  Clearing rooms without getting hit builds a Flawless streak that pays out pickups, a chest every
  fifth room and a locked chest every tenth. Fast clears can toss a button, and now and then a room
  pays out a jackpot.
- **Health.** Red felt hearts, wax hearts (temporary), ink hearts (burst when lost), brass hearts
  (armour that absorbs a whole hit) and gilded hearts (spill buttons when broken). You get brief
  invulnerability after a hit.
- **Resources and pickups.** Buttons (currency), keys, cherry bombs, spark jars (active-item
  charge), tin, locked, crimson and reliquary boxes, slot machines, a fortune owl, beggars, a
  wishing well, the seamstress and the grandfather clock.
- **Progression.** 70 achievements unlock items, characters, challenges and more modes, so the item
  pool grows as you play. The save also holds the Collection (every curio, plus a Bestiary of every
  creature with kill counts), Run History (your last 30 runs, any of which you can replay by seed),
  statistics, best scores and settings.
- **Costumes.** Items that would show on you do (rings, spectacles, masks, crowns, halos, wings,
  capes), the strongest items restyle your whole outfit, and every transformation gives you a new
  look (King Vamp: pale, red-eyed, crowned and caped).
- **Modes.** Normal; Second Edition (Hard) and Endless (the story keeps going after The Binding,
  harder each chapter), both unlocked by finishing the story; and a Daily Run with the same seed and
  reader for everyone that day. Every run ends with a score and a personal best.
- **Ten characters:** Marcus, Wren, Edda, Elias, The Blot, Ada (Grandmother, with slowing thorn shots;
  finish The Visit carrying her ring), and four hard-won readers who start with
  items: Ozzie (the D6; beat It Remembers holding a die), Nell (the Burning Glass and a lantern;
  beat the Unwritten), Bram (a bone folder and a tin heart; beat three bosses in one run without
  any of them hitting you) and Wick (flies, with two moths; finish the story as Mothkin). Each
  reader's card shows completion marks for the five endings (cream on Normal, red on Second
  Edition). **Five challenge runs.**
- **Audio.** Around 80 layered sound effects are rendered offline at startup with variants, pitch
  jitter, stereo panning, voice limiting and a shared reverb. The soundtrack is rendered offline in
  the background: synthesized distorted guitars (double-tracked, palm-muted chugs and power chords),
  a full drum kit, synth bass, pads, organ, choir and strings. Each chapter has its own genre (dark
  synthwave, industrial rock, darkwave, chamber rock, djent, gothic metal, industrial darksynth,
  symphonic gothic metal, shoegaze, witch house, EBM, baroque metal) with a calm stem and a combat stem that crossfade with the fight.
- **Smooth on any display.** The simulation runs at a fixed 60 Hz and rendering interpolates between
  steps, so 120/144/165/240 Hz monitors get smooth motion (frame cap and smoothing are in Options).
- **HUD.** Collected items show as an icon grid in the bottom-right corner. Standing next to an item,
  shop pickup, page, sweet or charm shows its description in the style of the External Item
  Descriptions mod: quality-coloured name, stat arrows, effects, transformation progress, whether
  it is new to your collection, and the price. A large card style is available in Options, along
  with an optional run timer. Stats have icons and show +/- changes; holding Tab shows the full map
  and what your active item, charms, pages and sweets do.
- **Hitboxes** match what you see: shots collide where they're drawn (their height above their
  shadow), and Marcus is hurt on a chin-to-hips capsule just inside his sprite.

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
