# Lost Marcus 2.0 — implementation log

The durable record of the 2.0 overhaul: what was found, what was built, what was actually verified,
and exactly what comes next. Update it at every milestone. Never list planned work as done.

## 1. Audit (start of 2.0, from v3.16.0 + the unreleased 3.17.0 Steam work)

Reproduce the inventory with `npx tsx tests/tools/audit.ts`.

### Content inventory vs the 2.0 targets

| Area | Now | Notes from the audit | 2.0 target |
| --- | --- | --- | --- |
| Passive items | 177 | Only 10 are pure stat lines; most change attacks, hooks, health or economy. 22 items are deliberately out of the pools (character starters, letter halves, tainted kits). | 250+ |
| Active items | 43 | Room/timed/kill charge types exist. | 50+ |
| Trinkets ("charms") | 17 | Plus 20 pages/sweets (consumables). | 40+ |
| Characters | 10 (+10 mirrored "tainted" variants) | Distinct starting kits and passives (melee, beams, ricochet, ink hearts, dice). | 10 ✓ |
| Floor environments | 8 story chapters, 6 extra chapters, 3 hospital floors, plus special floors (Margins, Last Page, Foreword, Room 4, Home) | The 7 "alternate" chapters (Root Cellar, Coal Chute, …) are palette/name variants of the main ones, so they don't count as distinct. | 12 ✓ (≈17 distinct) |
| Standard enemies | 43 defs → **57 after M5c** | 40 distinct behaviours at the audit (the three Sludge sizes and Blot/Blotlet share code); M4–M5c add 14 distinct ones (54). Behaviours are bespoke with tells (flankers, lurchers, turrets…). | 70+ |
| Bosses and minibosses | 31 defs | Rigged, multi-phase; Patient fight retuned in 3.14. | 35+ |
| Authored room layouts | 40 templates + 10 set pieces → **157 + 10 after M3** | Before M3, 55% of rooms used a procedural layout that placed rock clusters and walls anywhere, including the middle of the room. M3: 30% procedural, rocks to the edges. | 300+ |
| Challenge runs | 5 | | 25+ |
| Endings | 5 | Plus secret floors and a hospital route. | multiple ✓ |
| Achievements | 82 | Each unlocks content (items, readers, challenges). | — |
| Signature system | none | Bindings (playstyle at run start) and bargain rooms exist, but nothing that defines the game run-to-run. | 1 deep system |

### What already works (keep it)

- **Fixed 60 Hz simulation with render interpolation** (`game.ts`): movement, projectiles, timers and
  damage are frame-rate independent by construction; high refresh rates are interpolated.
- **Composable attack profile** (`projectiles/profile.ts`): shots, spread, pierce, split, bounce,
  homing, chain, explode, statuses, modes (shot/charge/burst/beam/laser/melee). Items merge
  partial profiles with defined stacking rules and caps (shots ≤ 16, split ≤ 8, chain ≤ 6, bounce ≤ 8).
- **Hook pipeline** for items and charms (`onKill`, `onHitEnemy`, `onFire`, `onRoomClear`, …).
- **Hit feedback**: budgeted hit-stop (≤ 0.15 s/s), trauma-based shake, knockback by mass,
  enemy squash/flash, crit text and sound, enemy shots drawn above everything else.
- **Fairness**: enemies spawn with a 0.55–0.9 s rise (no contact damage), enemy shots are suppressed
  for 0.9 s after entering an uncleared room, a capsule hurtbox inside the sprite, contact boxes at
  80% of enemy size, enemy wind-up "tells".
- **Accessibility/settings**: shake, hit-pause, reduced flashing, effects density, HUD text size,
  high-contrast enemy shots, rebindable keys and controller buttons, music/effects volume.
- **Saves**: atomic file writes with backups (desktop), 3 slots, run snapshot/continue, export/import.

### Measured baseline (tests/feel.ts, simulation stepped frame by frame)

| Measure | Before | After M1 |
| --- | --- | --- |
| Frames to 90% top speed | 7 (0.12 s) | 7 |
| Stop from top speed | 22 frames, 6.9 px | same |
| Rock edge clipped by 4.5–8 px | **stopped dead** | slides round |
| Rock met squarely (≥ 11 px overlap) | stops | stops |
| Bomb pressed during hit-stop | kept | kept |
| Bomb/active/page pressed during a room slide or title card | **lost** | kept (0.35 s buffer) |

### Biggest weaknesses found (ranked)

1. **No signature system.** Runs differ by items, but nothing run-defining is unique to Lost Marcus.
2. **Room layouts repeat and clutter.** 40 templates; half the rooms are procedurally painted with
   rocks anywhere, so lanes through rooms are often blocked and rooms feel samey.
3. **Thin long-tail content**: 5 challenges, 17 trinkets, enemy roster short of the 2.0 target.
4. **Movement snags** on rock corners; **presses lost** during room slides (both fixed in M1).
5. **Audio**: the 30-track soundtrack is rendered from the game's own synth score; there is no
   separate ambience bus. A production soundtrack needs a composer — the system work can be done here.

## 2. Signature mechanic: three candidates

| Candidate | Combat | Builds | Run decisions | Fit with what exists | Verdict |
| --- | --- | --- | --- | --- | --- |
| **Inklings** — defeated creatures leave their story's essence; Marcus writes up to three into his margins, and each changes how he fights (and how that creature's kind treats him). | Strong: which enemy you kill matters; essences add on-kill, orbit, delayed-blast and shot mutations. | Strong: essences feed the same attack-profile and hook pipeline as items, so they combine with every build. | Strong: slot choices, levels, hunting a creature, carrying ink makes rooms more dangerous. | The book-of-monsters premise; reuses enemies, profile, hooks. | **Chosen** |
| Rewrites — at each chapter's end, rewrite the next one (flooded, silent, burning) for different rewards. | Indirect | Weak | Strong | Overlaps bargain rooms and bindings | Later, as an event type |
| Candle — a light meter that burns down; darkness empowers enemies and reveals secrets. | Medium | Weak | Medium | Overlaps darkness curses; timer pressure risks tedium | Rejected |

## 3. Plan (milestones, in order)

- **M1 — feel and stability** ✅ (this log's first entry): audit tooling, feel regression test, corner
  forgiveness, input buffering.
- **M2 — Inklings** ✅: ink meter, essence drops, three margin slots with levels I–III, 16 essences built
  on reusable mechanics, furious/annotated enemies, HUD, pickup card, journal, tests.
- **M3 — rooms** ✅ (first library pass): template validator, 117 new authored layouts in families,
  procedural layouts that keep permanent rocks to the edges and leave the door cross open.
- **M4 — Chapter I to the 2.0 standard** ✅ (first pass): four creatures for the roles the Cellar lacked,
  authored encounter sets, per-creature casting rules, a measured boss pass.
- **M5 — content expansion** in validated batches: trinkets → challenges (each with a new rule) →
  enemies by role → passives/actives built on the expanded pipeline → bosses.
- **M6 — presentation, balance, release verification** (run bot balance passes, long-session soak).

## 4. Log

### M1 — feel and stability (done)

- `tests/tools/audit.ts`: content inventory and thin-content report.
- `tests/feel.ts` (in `npm run test:e2e`): steps the simulation frame by frame and asserts
  acceleration, stopping, corner forgiveness and input buffering.
- Corner forgiveness (`rooms/collide.ts` `cornerSlide`, `player.ts`): a straight push that clips an
  obstacle's edge by up to 8 px steers round it at walking speed; squarely blocked stays blocked.
- Input buffer (`game.ts`): bomb, active, page/sweet and swap presses made while input is locked
  (room slide, boss title card, floor intro) act when control returns, within 0.35 s. Cleared on pause.

Verified: `tests/feel.ts` passes; unit tests and type check pass. Not verified by a person playing.

### M2 — Inklings, the signature system (done)

How it plays (all in `src/game/inklings.ts`, art in `src/art/inklings.ts`):
- **Ink meter.** Every kill pours in the creature's weight (furious creatures 1.5×, champions +3).
  At 16 it brims: every creature shows, over its head, the Inkling it would leave, and the next one
  killed leaves it. The player chooses the essence by choosing the kill. Bosses fill the meter.
- **Margins.** 3 (the Blot 4, +1 with the Fourth Margin). Writing an essence you hold raises it
  I → II → III; a fourth copy charges the active item. With every margin full the Inkling stays on
  the floor; standing on it, {active} writes it over the weakest margin (lowest level, oldest).
- **16 essences on reusable mechanics**, each mapped from 2–5 creatures (all 43 standard enemies
  are mapped; checked by tests): Swarm (on-kill seekers), Dive (cadence homing), Lurch (cadence
  heavy shot), Spittle (lobbed splash side shots), Ember (burn + fire spread on death), Bloat
  (death puddles, radial shots at III), Leech (hits charge the active), Gaze (timed piercing,
  spectral stare), Ward (orbiting shards that block shots; at III they fire back), Bury (shots that
  fall plant delayed bursts; at III bursts mark and chain through marked enemies), Snare (slow,
  webs, pulling webs), Hymn (fear shockwave on kill), Hoard (clean-room payouts), Unwrite (execute
  threshold), Phase (spectral, pierce, phase-after-hit), Scurry (kill haste).
- **Annotations** (bespoke pairs, both at II+): Wildfire (Ember+Bury), Ink Web (Bloat+Snare),
  Glare (Gaze+Lurch), Erasure (Unwrite+Swarm), Psalm (Hymn+Ward).
- **The creatures react.** Kinds whose essence you hold are *furious* (+15% speed, more ink). The
  more ink you carry, the more *annotated* creatures appear (ink ring, +35% health, always leave
  their Inkling): up to 8% of spawns.
- **Rules**: essence profile parts merge after items/charms/transformations with the same stacking
  rules and caps; hooks run after items and charms in margin order; anything an essence spawns is
  depth 1 (no splitting, no cadence, no recursive spawning); seekers and radial shots share an
  18-token bucket refilling 12/s; at most 10 buried bursts pending, chains ≤ 2 generations.
- **Presentation**: HUD margins panel (icons, level strokes, meter that pulses when brimming),
  pickup blob with the creature's silhouette, inspect card (current/next level, overwrite warning,
  annotation partners), first-brim explanation, Journal → Inklings page with accurate "written in"
  hints for unseen essences.
- **Items (5, all obtainable)**: Rocker Blotter (meter +40%), The Fourth Margin, Iron Gall (+0.15
  damage per ink level), Inkhorn (active: brim the meter), Pumice Stone (active: erase the weakest
  margin, brim the meter). **Achievements (3)**: First Draft, Annotated, Fully Inked (unlock them).
- **Saves**: kept in the run's `flags.ink`, so Continue works with no save-format change;
  `save.data.inkSeen` for the Journal (defaults to empty for old saves).

Verified (automated): `tests/inklings.ts` — meter, brimming drop, write/level/overwrite, every
essence's effect, two annotations, a 30-enemy extreme build for 600 steps (0.82 ms/step,
36 peak projectiles, no errors), save & continue. Unit tests check every enemy maps to an essence and
every ink item/achievement exists. The run bot played 3 seeds through 7 chapters with no errors;
first tuning (meter 10, 22% annotated) filled all margins at III by chapter 4, so it was retuned to
meter 16 and ≤ 8% annotated (margins full by chapter 2–3, III mostly late).
**Not verified**: how it feels in human play; balance of individual essences.

### M3 — rooms (done: validator, generation rules, first library pass)

- **Validator** (`src/rooms/validate.ts`), run by the unit tests on every authored layout and on
  3,000 generated ones: 15x9 with known characters; each doorway and the cell inside it open; no
  enemy slot in a door mouth (3 wide, 2 deep); every floor cell walkable from a door (sealed pockets
  only beside a turret/flyer); at most 12 permanent obstacles (rock, block, pillar) in the room's core
  unless tagged `centerpiece`. The 10 original templates that broke a rule were fixed.
- **Procedural layouts** (`generation/roomgen.ts`): rock clusters grow from the walls and stay in a
  two-cell band along them; walls are spurs from a wall, not free-standing bars; no permanent
  obstacle or pit on the door-to-door cross (breakable props may stand there); unreachable pockets
  are filled; core rocks capped at 12 unless the room is built round a ring or pillars. Measured on
  6,000 layouts: rule breaks went from 1,860 (678 unreachable pockets, 1,182 over-cluttered cores)
  to 0.
- **Authored library** (`src/rooms/layouts.ts`): 117 new layouts (157 authored in all) in families:
  edge bays (20), pits (12), pillar halls (9), breakable cover (9), hazards with lanes (12),
  ambush (7), arenas (5), shooter cover (7), swarms (5), heavy duels (5), webs (4), lanes (4),
  asymmetric (10), late-chapter dense rooms (8, chapter IV on). Several carry `minFloor` so harder
  shapes appear later. Rooms are flipped at random on X and Y, so each plays up to four ways (not
  counted toward the total). Rooms now use an authored layout 70% of the time (was 45%).
- Rooms record their layout in `flags.layout`; `__bomDebug.layout(name)` stamps a named layout into
  an unvisited room and `tests/tools/roomshot.ts` photographs layouts for review.

Verified (automated): unit tests (211,889 checks incl. the validator on all 157 layouts and 3,000
generated rooms), all e2e suites, boot test, and the run bot over 4 seeds × 7 chapters (no page
errors, every run reached chapter 7 or the Binding). Screenshots of 9 layouts were reviewed; one
(pillar nave) was too cramped and was opened up. **Not verified**: how the new rooms play by hand;
whether the family mix needs per-chapter weighting.

### Audio — ambience bus (done)

- `src/audio/ambience.ts`: a third audio bus beside music and effects, with its own **Ambience
  volume** setting (Options; saves without it default to 60%, no migration needed). Each floor has a
  soundscape: a looping room-tone bed (brown or pink noise, low-pass, a slow swell, mains hum where
  it fits) plus sparse details from 12 synthesised kinds (drips, creaks, crackle, distant pipes,
  chimes, page rustle, deep groans, ink bubbles, monitor beeps, gusts, moth wings, steam) and a clock
  for the clock tower and Home. 17 soundscapes: the 8 story chapters, the 6 extra chapters, the
  Margins, the hospital floors and Home; alternate chapters use their family's. Silent outside a
  run; a fight pulls it down to 45% so combat sounds stay on top.
- Levels measured offline: beds sit 11–19 dB under the calm music.

Verified (automated): `tests/ambience.ts` (in `test:e2e`) — silent on the title, four floors each
play their soundscape, all 12 details synthesise, the setting reaches the bus, fights duck it, no
page errors; unit tests check every floor maps to a soundscape. **Not verified**: by ear.
**Remaining asset work (honest)**: the soundtrack and all sounds are synthesised in-engine. The
music system (adaptive layers, boss phases, stingers) is production-ready, but a soundtrack people
would seek out needs a composer's recorded score, and the ambience would be better from field
recordings. (Correction, 3.17.1: the recordings in `assets/music/audio` are the original 3.3.0 chapter themes,
restored after 3.15 had replaced them with synth renders; they run 68–82 s.) A composed score can
replace those files (re-run `scripts/prepare-music.py`) with no engine work.

### M4 — Chapter I (the Cellar) to the 2.0 standard (first pass done)

The audit found the Cellar's nine creatures well made (tells, counters) but covering only chase,
flank, ranged, turret and one guard: no ambusher, nothing that zones the floor, no heavy, and only
the Mite Nest as support. Each new creature fills one of those roles, has a hand-drawn sprite
(`src/art/hand/cellar2.ts`), a tell before it acts and a stated answer (`src/enemies/defs_cellar2.ts`):
- **Paper Lurker** (ambush): a breathing paper mound, harmless to touch while buried; shudders when
  you come close, then bursts out and zig-zags at you with crouch-and-lunge. Shooting the mound first
  knocks it out stunned for 1.5× damage. Alone in a room it gives itself up, so a room never stays
  locked on a hidden enemy.
- **Mildew** (zoning): a rooted cap; glows and swells, then puffs three spore patches that hurt to
  stand in (at most six alive). Killing it dries them up at once.
- **Lampkeeper** (support/shield): allies in its lantern light take half damage (dashed ring on the
  floor, gold glow on protected allies, gold glint and a thread to the keeper when a hit is turned).
  It stands behind its group, away from you. New engine hook: `EnemyDef.aura`, applied in
  `World.damageEnemy` via `wardOf`.
- **Old Trunk** (heavy): rattles, hops at you with a landing mark where you stood, slams (4 slow
  shots on chapter I, 6 later), then gapes open for 0.95 s taking 1.6× (closed: 0.75×). New engine
  hook: `e.data.landAt` draws a landing mark for any creature.
- All four map to Inkling essences (Bury, Bloat, Ward, Lurch) and join the Cellar and Root Cellar.

**Encounters** (`FloorTheme.encounters`, `castEncounter` in `populate.ts`): 15 authored Cellar groups
(e.g. lantern and spitters, paper ambush, mould bed, trunk and mites, nest guard), each pairing a
threat with something that changes how you answer it. Half of a Cellar room's casts come from an
encounter that fits its budget and slots; members take the slots that suit their role best.
**Casting rules** (`EnemyDef.cast`): per-room maximums (Lurker, Mildew, Trunk ≤ 2; Lampkeeper ≤ 1)
and required company (a Lampkeeper needs 2 others, counting an ambush's second wave).
Measured over 300 seeds: 39% of Cellar rooms came from encounters; every new creature appears.

**Boss pass** (`tests/tools/bossprobe.ts`): a bot fights each boss frame by frame with three builds;
in `dodge` mode it scores 16 moves by predicted shot paths, moving bodies (bosses and adds),
telegraph marks and spore patches. Results (5 trials each, base build, dodging):

| Boss | Time to kill | Phase 2 at | Hits taken by the dodger |
| --- | --- | --- | --- |
| Grubmother | 23–25 s | ~9 s | 1–3 |
| Wardrobe | 28–31 s | ~15 s | 3–9 |
| Twin Snips | 28–31 s | ~15 s | 1–2 |

Average build (3 shots): 12–17 s. Strong late-game build (21 damage, 3 shots): 4.4–4.9 s, still
reaching phase 2. A Chapter I run rarely holds a build like that; no damage cap was added.
Change from the pass: the **Wardrobe's charge now marks its whole path** (to the first wall)
during its tilt, like the Grubmother's lunge and Snip's dash; it was the one boss charge with no
direction shown. The probe found its own blind spots first (it ignored adds, body motion and
telegraphs); the figures above are after fixing those.

Verified (automated): `tests/cellar.ts` (17 checks: each creature's tell, behaviour and counter,
a crowded room at 0.17 ms/step), `tests/bosses.ts` (each Cellar boss dies to the base build inside
60 s, reaches phase 2, dodger ≤ 12 hits), unit checks for casting rules and encounter data, all
earlier suites. **Not verified**: how the new creatures and encounters feel by hand; the dodging
bot is a proxy for fairness, not a player.

### M5a — Chapter II (the Boiler Rooms), same pattern (done)

Role audit: only five Boiler creatures of its own (flyer, two turrets, heavy, hopper) plus borrowed
Cellar ones; no environment manipulator, no support, no ranged harasser of its own, no shield.
New (`src/enemies/defs_boiler2.ts`, sprites `src/art/hand/boiler3.ts`):
- **Bellows** (environment): swells as it breathes in (dust drawn toward it), then blows a cone that
  shoves you (direct collision-aware push) and makes any fire in it spit embers at you.
- **Foreman** (support): keeps behind the others; lifts its whistle (steam rising), then hastens
  allies within 100 px for 3 s (×1.4 speed, steam trailing off them). New hook: `data.hasteT` in
  `Enemy.spd()`. New sound: `whistle`.
- **Riveter** (ranged): plants with a sighting line that tracks you for 0.5 s, then locks and
  brightens; three rivets go down the locked line; 1.1 s reload. New hook: `data.aimLine` drawn by
  the renderer for any creature.
- **Brickback** (shield): a firebrick slab turns shots from the side it faces (×0.15); it takes 0.75 s
  to turn round; up close it raises the slab and slams it (ring of cinders), then is open (×1.3).
- 13 Boiler encounters (foreman's crew, riveter behind bricks, shield wall, bellows and valve…);
  the Coal Chute also gets the new creatures. Over 400 seeds, 37% of Boiler rooms came from
  encounters and every encounter and new creature appeared.
- Boss probe, base build, dodging bot, 4 trials: Furnace Heart 31–33 s (phase 2 at 16–19 s, 2–4 hits);
  Old Stoker 27–31 s (phase 2 at ~14 s, 3–5 hits). No changes needed; both added to `tests/bosses.ts`.

Verified (automated): `tests/boiler.ts` (16 checks: each tell, effect and counter, crowded room
0.22 ms/step), boss regression for five bosses, all earlier suites. **Not verified**: by hand.

### M5b — Chapter III (the Underworks), same pattern (done)

Role audit: swarm (rats), ambush (leech), heavy (bloater, sludge), turret (grate eye), shooter
(drowned); no environment, support or zoning creature. New (`src/enemies/defs_under2.ts`, sprites
`src/art/hand/under3.ts`):
- **Sluice Keeper** (environment): turns its wheel; a band of floor through where you stand (across
  or down the room) trickles for 0.9 s, then a current runs along it for 2.6 s, carrying you and any
  walking creature at 85 px/s. New hook: `data.flow`, drawn by the renderer (dim while warning,
  running stripes once open).
- **Bilge Priest** (support): goes to a body that fell in the last 6 s, chants for 1.25 s (a blue
  ring marks the spot), and raises it at half health (once per creature, twice per priest).
  Standing on the spot breaks the rite and staggers it. New hook: `World.recentDeaths` (non-boss,
  not spawned young, not already raised; per room). New sounds: `chant`, `bubble`.
- **Fumarole** (zoning): a floor vent that bubbles, then belches a slow homing spore cloud
  (24 px/s, 7 s life, at most three out per vent).
- 12 Underworks encounters; the Flooded Tunnels get the new creatures. Over 400 seeds, 40% of
  Underworks rooms came from encounters; every encounter and creature appeared.

**Boss pass.** The probe now shoots any add within 70 px before the boss (as a player would);
before that, summoned adds lived all fight and inflated hits. Bilge Maw: 35–40 s, phase 2 at ~19 s,
0–3 hits. **The Rat King was an outlier**: 56–90 s and up to 12 hits (its two Rat Princes had 110
health each on top of the King's 300, and up to six fast rats). Changed: Princes 110 → 85 health,
rats summoned only while fewer than five live. After: 46–59 s, 3–9 hits. It stays the longest
Chapter III fight on purpose (it is two fights). `tests/bosses.ts` now covers seven bosses.

Verified (automated): `tests/under.ts` (12 checks), boss regression, all earlier suites. **Not
verified**: by hand.

### M5c — Chapter IV (the Ward), same pattern (done)

Role audit: teleporting melee (orderly), bouncing heavy (wheelchair), lobbing shooter (nurse),
ghost flyer (bedsheet), ambush (mimic), zoning heavy (drip sentinel); no swarm, turret or protector.
New (`src/enemies/defs_ward2.ts`, sprites `src/art/hand/ward3.ts`):
- **Spilled Pills** (swarm): capsules rolling in straight lines, reflecting off walls; a 0.3 s wobble
  before each turn toward you.
- **Monitor** (turret): alarm flash (0.6 s), then six blips 0.12 s apart on one sine path (`wig`
  with a shared phase), so the stream is a lane to step out of. New sound: `beep`.
- **Mourner** (protector): kneels by the nearest other creature; after 0.5 s that creature is
  invulnerable while the pale thread holds (drawn via `data.tetherBy`). Any hit on the Mourner
  breaks the hold and it waits 1.5 s before kneeling again; death frees its charge. It never
  tethers something already invulnerable for its own reasons.
- 12 Ward encounters; the Morgue gets the new creatures. 39% of Ward rooms from encounters over
  400 seeds; every encounter and creature appeared.
- Boss probe (base build, dodging bot, 4 trials): Sleepwalker 31–34 s, phase 2 at ~16 s, 2–4 hits.
  Matron 45–54 s, 3–10 hits, most from her aimed five-shot syringe fans at 190 px/s, the fastest
  regular boss shot this early. Changed to 165 px/s; the bot's numbers stayed noisy (it threads
  fans instead of stepping out of them). `tests/bosses.ts` now covers nine bosses.

Verified (automated): `tests/ward.ts` (11 checks), all suites. **Not verified**: by hand.
The boss regression allows the noisiest two (Rat King, Matron) up to 16 dodger hits (Matron: up to 12 over 9 fights): over 11 Rat
King fights the bot took 2–13 (median 4), so one fight can exceed 12 by chance.

### HUD change requested by the owner (3.17.0)

Restored the pre-3.15 left column (coins, bombs, keys going down, no box); removed the boxes behind
the counters, ink margins, stats, binding banner, minimap, item tracker, letter checklist, timer
and pedestal labels; removed the first-run "Move with WASD" prompts from the HUD; the binding
banner now shows for 3.5 s at a chapter start or when the clean streak changes, then fades.
Kept: the Tab map frame, the boss bar frame and the item-description backdrop (readability).

### Owner feedback after 3.17.0 (3.17.1)

- **Music**: the 3.15 overhaul had replaced the 30 recorded chapter themes (uploaded in 3.3.0) with
  synthesised arcade-rock renders marked combat-only, and raised the exploring low-pass from 1100 Hz
  to 6500 Hz, so music never quietened between fights. Restored the original recordings, their
  track list (`recorded.ts`), the 1100 Hz exploring muffle and the old synth fallbacks (including the
  menu theme); removed the arcade-rock generator (`drive.ts`, `scripts/render-soundtrack.mjs`).
  Kept the linear crossfade for recordings (no loudness bump mid-fade). Checked in a browser: a
  room with no enemies sits on the muffled path (calm 1, combat 0); a fight opens it (0, 1).
- **Treasure rooms**: back to one curio; a choice of two only from Chapter III on, 20% (Hard: from
  Chapter II, 50%), as before 3.15. `run.flags.treasureChoice` forces a choice room for tests.
- **Binding banner** removed from the HUD entirely.
- `tests/e2e.ts` "walking right" now holds the key for 0.4 s of game time (the first run start can
  skip frames while it loads; it was failing on wall-clock timing).

### Owner feedback after 3.17.1 (3.17.2)

- **Density**: "about six per room". Budget ×2.1 (`DENSITY` in populate.ts), Chapter I near-start
  cap 2.5 → 5, swarm groups 4–5, generated layouts 5–7 slots (+ up to 3 by depth), encounter rooms
  fill their other slots with more of the group, and any room cast short is topped up to 6 (10 in
  big rooms) with more of the creatures already in it, on open floor away from the doors (`fillRoom`).
  Hard caps: 9 creatures in a normal room, 15 in a big one (swarms count each). Measured over 120
  seeds x 7 chapters: median per combat room 5 in Chapter I, 6 in II–VII; averages 5.7–8.1
  (before: medians 3–5, averages 3.3–6.1, with outliers up to 29).
- **Inklings switched off** (`src/game/inkflag.ts`, `INK.on = false`): every entry point is a no-op,
  the HUD margins and Journal page are hidden, the five ink items are in no pool, and the three ink
  achievements are left out. The code and its tests stay (`tests/inklings.ts` turns it on).
- **Story rewrite** (owner: "less book, deeper, cooler to a normal person"). New premise, set out
  in `src/data/lore.ts`: Marcus Hale, 17, crashed off the Harrow Lane bridge at 4:04 driving to
  St. Agnes, where Grandad Elias (41 years the hospital's boiler man) died the same minute; Marcus
  is in a coma and the game is inside it. Rewritten: intro, all five endings (ids kept for saves:
  morning = Not Yet, own_hand = The Voicemail, for_marcus = First Light, the_visit = Room 4,
  goodnight = Wake Up), epilogues, fortunes, story guide, all 25 notes (ids kept), achievements
  text, character text, floor names/subtitles/title cards ("Floor I"; binding = The Deep End,
  margins = The Static, lastpage = Dead Air, dedication = The Eulogy, foreword = First Light,
  home = Awake), book-themed boss names/lines (bookbinder = The Surgeon, unwritten = The Noise,
  author = The Old Man), "reader" -> "character", "Second Edition" -> "Hard", "chapter" -> "floor"
  and "Grandfather" -> "Grandad" in player-facing item/UI strings. The intro wraps its lines now.
  Not changed: the menus are still drawn as an open book, consumable "pages" and the ink-themed
  item names, and art (bosses and floors keep their sprites under new names).
- **Music ringing** (reported): every synth track (21) and recording (30) was rendered/decoded and
  scanned for a sustained narrow tone above 1.5 kHz; none found. Not reproduced; needs details.

### 3.17.3: boss music

The owner's recorded boss loop ("Ink and Iron", 87 s, converted to Vorbis by
`scripts/prepare-music.py` as `assets/music/audio/31-boss.ogg`) plays in every boss fight:
`bossMusic()` returns `rec_boss` with the old synth boss themes as the fallback, and the two
final-boss phase changes no longer switch tracks. Checked in a browser: the floor plays its theme,
the boss room switches to the 87.3 s recording.

### After 3.17.3: no studio splash, no credits, a shorter title menu

At the owner's request: the Papermoth splash (`src/ui/splash.ts`) is deleted and the game opens
straight on the title (or the intro on a first launch); the studio name is gone everywhere
(package author and copyright are now Racine Digital, matching the app ID; THIRD_PARTY_NOTICES
regenerated). The credits screen and its Options row are deleted; the font licences it pointed to
remain in THIRD_PARTY_NOTICES.txt beside the game. The unused legacy `mainScreen()` went with them.
The title menu keeps Continue, New Run, Daily Run, (Challenges once open), Journal, Options and
Quit; What's new moved into the Journal (it still opens by itself after an update), and the
footer is down to the next goal and the version.

### Item tiers and item flow (after 3.17.4)

Owner's direction: "take a page out of Isaac's book": lots of weak items, rare great ones, and
fewer items overall. Measured with `tests/tools/itemflow.ts` (headless, 200 seeds x 6 floors).

- **Rarity follows quality** (`QUALITY_WEIGHT` in `src/items/pools.ts`): x2 / x1.6 / x1 / x0.55 / x0.3
  for quality 0-4. Treasure rolls went from Q0-1 0%, Q2 60%, Q3 38%, Q4 2% to Q0 26%, Q1 29%,
  Q2 33%, Q3 10.5%, Q4 1.2%. Shop rolls: Q1 30% -> Q0-1 76%.
- **Re-tiered ~90 items** with smaller numbers (every changed number also changed in its text):
  17 to quality 0, ~45 to quality 1, ~20 quality 3 down to 2, Lamp Lure loses its damage, The Debt
  +2.5 -> +2. Eight junk items moved from the shop into the treasure pool so treasure rooms can
  roll junk (each item still lives in exactly one pool).
- **Fewer items**: free items offered per floor 2.9-3.3 -> 2.5-3.0 (treasure and boss still one
  each; everything else about 40% less); shop stock 2-3 -> 1-2 (upgrades still add up to 4).
  Secret room item 30% -> 15%, super-secret 70% -> 45%, two-item library 40% -> 15%, deal rooms
  one item (a second sometimes from Floor IV), cursed room item 30% -> 20%, locked chest item
  12% -> 6%, crimson box item 20% -> 12%, marked rock item weight halved.
- Not yet re-measured: how hard the later floors feel with weaker builds. Boss regression tests use
  fixed builds, so they still pass; the run bot is too slow to re-run here.

## 5. Known issues

- One randomized e2e check ("the build fights") failed once and passed on re-run: enemies spawn at
  random spots and can sit out of the firing line.

- Inklings balance is only bot-tested (the bot kills instantly and takes everything).
- Boss-specific essences are not implemented (bosses fill the meter instead).

## 6. Next steps (exact)

0. Audio: by-ear pass on ambience levels per floor; commission or record a score (see above).
1. M3 follow-up: more authored layouts toward 300 (big 2x1/1x2/2x2 room layouts are still built
   from single-room layouts; give them their own), chapter-specific layout sets with weights.
2. Carry the M4 pattern to Chapter V–VII (II, III and IV done): role audit per chapter, new creatures for missing
   roles (toward 70), encounter sets per chapter, boss probe per chapter's bosses.
3. Human playtest of Inklings and the new rooms; tune meter size, annotated rate, weakest essences.
