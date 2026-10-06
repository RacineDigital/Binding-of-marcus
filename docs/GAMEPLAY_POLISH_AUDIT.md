# Gameplay and menu polish audit

This is a repository-based audit with a genre comparison to *The Binding of Isaac*'s familiar completion marks, unlocks, challenges, and item collection. Live web access was unavailable during this pass, so this is not a source-by-source research report.

## What is already here

The game already has substantial run variety: 242 items, 43 enemies, 26 bosses, 20 readers, eight floors, alternate floors, secret rooms, challenges, multiple endings, a bestiary, collection tracking, achievements, and run history. The opportunity is to make that depth easier to understand and pursue, rather than add volume for its own sake.

## Checklist and implementation status

- [x] **Explain the story before asking players to decode it.** The opening names Elias, says the monsters belong to the book, and establishes that Elias died before the game begins. The Journal's spoiler-marked **Story so far** guide explains the family, hospital route, guilt, and endings in plain language.
- [x] **Give progression a clear next step.** The title screen now points to the next chapter boss, back stair, letter, Room 4, other endings, or reader marks as appropriate to the save.
- [x] **Make post-run reflection useful.** Run History now records the ending, route, newly read notes, new unlocks, acquired items, reader, seed, and score. The existing death/ending summaries already show the build, chapter progress, and unlock rewards.
- [x] **Help players learn item combinations.** Newly discovered attack combinations are saved and listed in the Journal. First-time item pickups now show a concise effect in a dismissible ribbon; the existing **Item descriptions** option controls the full-size inspect card.
- [x] **Clarify whether endings are imagined or real.** The Visit now explicitly labels the hospital scene as the book's version of St. Agnes. Epilogues label imagined scenes as part of the book and distinguish Marcus and Nell's life back home.

## Menu checks for a playtest

- [x] The Journal remains within its existing 480×270 menu layout; its new story and combination pages support keyboard, controller navigation, and mouse selection where applicable.
- [x] Options now includes **Reduced screen flashes**, which tones down full-screen white flashes, the damage vignette, and the boss-intro flash.
- [ ] Ask first-time players to find the first alternate route, explain why Marcus enters the hospital, and identify what a completion mark means without external help.
- [ ] Playtest the menus at the smallest supported window size, with remapped controls, controller focus, low screen-shake settings, and reduced flashes enabled.

## Scope note

These changes prioritize signposting and comprehension. Manual first-time-player and small-window playtests remain open; automated build and simulation checks cannot replace them. The game already has a large amount of content, so test discoverability before adding more items, floors, or lore fragments.
