# Gameplay overhaul — 3.15.0

This pass reviews the major run systems and implements changes to build agency, readable rewards,
replay consistency and presentation. It is not a claim that every item combination or the complete
difficulty curve has been human-playtested.

## Rules reviewed

| System | Finding | Result |
| --- | --- | --- |
| Starting builds | Readers provide variety, but little control over a run's direction before the first reward. | Four optional bindings with stated benefits and costs. Challenges and Daily Runs keep a fixed binding. |
| Treasure | Normal mode seldom offered a choice; Hard offered choices earlier and more often. | Every treasure room offers two items, preferring different roles. The player still receives only one. |
| Flawless rewards | Random extra drops and occasional locked chests made mastery rewards hard to anticipate. | Every three consecutive unhurt combat clears earns an unlocked chest. Bosses and completed challenge rooms count. Refights do not advance the streak. |
| Voluntary damage | Sacrifice payments spoiled flawless status despite already being an explicit cost. | Payments marked as voluntary no longer break combat streaks or flawless chapter status. Actual damage still reduces health and is recorded. |
| Damage scaling | Enemy hits become a full heart at Chapter VI, or IV on Hard, with little explanation. | A chapter-entry message announces that increase. Existing caps, i-frames and defensive item behavior remain. |
| Active items | Room, kill and time recharge are distinct rules. | Clockwork adds one charge only to room-recharged actives on a combat clear. It supplies a Tuning Fork only when the reader has no active. |
| Item-pool persistence | Continue regenerated the floor using the already-consumed item pool, consuming phantom items and resetting its random sequence. | Reconstruction preserves both the consumed set and the saved pool RNG state. |
| Room persistence | Re-entering or continuing could reset damage/time used to judge a clear. | Room damage and elapsed time persist. Rejected treasure offers stay rejected after Continue. |
| Loot | Generic drop resolution and kill drops used unseeded random calls. | These use seeded generators with saved event counters. This does not claim every combat/AI event is deterministic. |
| Restart/history | Restart could discard the chosen difficulty. | Restart preserves mode and binding; history records bindings and challenge IDs. |
| Daily Runs | Local calendar dates, unlocked readers/items and story progress changed the shared run. | UTC date, loaned reader, complete item pool and profile-independent floor generation. Retry retains its seed and day; finishing after midnight credits the original day. |
| Health and bargains | Red, wax and ink have separate roles; bargain odds use red damage. | Retained. Inkwell's existing last-half-heart safeguard remains and needs better player-facing explanation. |
| Economy | Keys, bombs, shop tiers, paid restocks and Lost & Found already provide competing uses for resources. | Retained; rejected treasure choices remain eligible for Lost & Found. Daily shops remain independent of lifetime donations. |
| Routes and progression | The newer 3.14.0 release adds letter guidance, tutorial, accessibility and a shorter Patient fight. | Integrated those changes; preserved the Journal story guide and combination tracking. |

## Visual direction

- A foil-stamped book presentation for reader and binding selection, with keyboard and mouse controls.
- Cool stone and shadows against warm candlelight; less debris in the central combat space.
- Cached floor borders and light shafts, plus a woven runner connecting treasure offers.
- Grouped resources, visible flawless progress and role labels for choices. Blind items do not reveal their roles.
- First-run tutorial messages take precedence over the binding badge to avoid overlapping text.

## Validation and remaining playtests

The Node suite covers seeded generation, content, draft roles and future loot after serialization.
Browser regressions exercise the actual save/continue, reward, restart and menu-input paths. Release
validation also includes a built-file boot test and Electron distribution tests.

Before describing the game as Steam-ready, human playtests still need to measure:

- Win rate, clear time and active usage by binding and reader, especially Clockwork with healing actives.
- Whether always offering an offensive option removes too much early-run uncertainty.
- Full-run resource accumulation with a chest every three clean rooms; mastery should not trivialize shops.
- Item inspection, controller focus and combat readability at small resolutions and enlarged HUD sizes.
- Story comprehension and route discovery without developer guidance.
- Minimum-spec performance and the real Windows package through the Steam client.

No additional item volume, permanent stat grind or online leaderboard was added in this pass.
