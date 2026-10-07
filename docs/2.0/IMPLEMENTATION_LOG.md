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
| Standard enemies | 43 defs | 40 distinct behaviours (the three Sludge sizes and Blot/Blotlet share code). Behaviours are bespoke with tells (flankers, lurchers, turrets…). | 70+ |
| Bosses and minibosses | 31 defs | Rigged, multi-phase; Patient fight retuned in 3.14. | 35+ |
| Authored room layouts | 40 templates + 10 set pieces | 55% of rooms use a procedural layout instead (mirrored feature painting), which places rock clusters and walls anywhere, including the middle of the room. | 300+ |
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
- **M2 — Inklings**: ink meter, essence drops, three margin slots with levels I–III, 16 essences built
  on reusable mechanics, furious/annotated enemies, HUD, pickup card, journal, tests.
- **M3 — rooms**: a template validator (door approaches, reachability, lanes, enemy slots), a large
  authored layout library per room shape, procedural layouts that keep permanent rocks to the edges
  and leave the door cross open.
- **M4 — Chapter I to the 2.0 standard**: encounter sets, cellar-specific rooms and props, boss pass.
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

## 5. Known issues

- One randomized e2e check ("the build fights") failed once and passed on re-run: enemies spawn at
  random spots and can sit out of the firing line.

## 6. Next steps (exact)

1. M2: `src/game/inklings.ts` (data + runtime), hook into `World.killEnemy`, `Player.recompute`,
   HUD margin slots and meter, pickup + inspect card, journal page, save fields with migration,
   unit + browser tests.
