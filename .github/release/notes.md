## What's new in 3.14.0: getting ready for everyone

**Grandfather's letter is easy to follow.** On the hospital path:
- The **Lost & Found** door always opens after a hospital boss while it's holding the top half, and
  the letter costs nothing to take.
- The **Deep Crawlspace** holding the bottom half is open (no bombing) and marked on your map from
  the start of the chapter. Rooms holding a half you still need show the letter on the map.
- A checklist under the minimap says where each half is and ticks them off; each chapter opens
  with a tip, and the Room 4 door says which half is still missing.

**The Patient (Room 4)**
- Room 4 is one long ward room, two screens wide, instead of a huge hall.
- It forgets itself about half as often, is gone for less time when it does, and comes back a
  short step from where it was instead of across the room.
- It no longer borrows the bosses that burrow, sink or blink out of reach (Grubmother, Bilgemaw,
  Matron, Choirmaster, Thornwife).
- It has less health (4,000, down from 9,500): measured fights with ordinary builds ran past five
  minutes, more than twice as long as It Remembers.

**First-run hints.** On your first few runs, a small card at the top of the screen shows one thing
at a time (move, fire, doors, cherry bombs, the map, active items, pages) with your own keys or
controller buttons, and ticks it off when you do it. Options -> Tutorial hints turns them off.

**Secrets you can follow.** Once the story is finished, the boarded back stair behind Chapter II's
boss announces itself (and says a cherry bomb opens it) until you've climbed it once. The ending
screen now gives the clue for the next ending you haven't found.

**What's new, in the game.** After an update, returning players see these notes once as pages of the
book, and the title screen has a **What's new** entry to read them again.

**Accessibility and comfort**
- **Reduce flashing** (Options) softens every full-screen flash to a faint glow. The boot screen
  now carries a photosensitivity notice.
- **HUD text size** (Options): 100%, 115% or 130% for everything you read during a run.
- **High-contrast enemy shots** (Options) gives every enemy shot a solid black ring and a thick
  white rim, so they stand out by brightness alone, whatever colours you can tell apart.
- **Effects: Low** (Options) thins out decorative particles for slower computers.

**Renamed sets.** Three item sets named after real people now have names of their own. Effects,
unlocks and synergies are unchanged, and your collection carries over.
- The cold set is now **Frostbitten** (Frost Skate, Paste Pot, Darkroom Lamp, Lucky Threes, Rime
  Wings, Cellar Spider, Kind Words, Icebox, Flotsam, Frosted Glass, Ginseng Tonic).
- The blood set is now the **Night Count** (Seeing Red, Last Light, Blood Hymn, Peashooter, Held
  Breath, Power Chord, Slime Heart, Baby Talk).
- The toddler set is now **Tantrum** (Oversized Nappy, Chewed Pencil, Bike Helmet).
- Four dice have new names: **Grandfather's Die** (the six-sided one), the **Hollow Die**, the
  **Countdown Die** and the **Shifting Die**.

**Comfort**
- **A tip when you fall** (your first 30 deaths): drawn from how the run ended, like a charged
  active item you never used, bombs still in your pocket, or a boss you could have hit while it was open.
- **Pause when away** (Options, on by default): switching windows, hiding the tab or unplugging the
  controller pauses the run.
- **Controller rumble** (Options): big hits, explosions and getting hurt rumble the controller.

**Safer saves and better bug reports**
- The browser version now keeps a backup of each save, like the desktop version, so one bad write
  can't wipe a slot.
- Errors are logged (on the desktop next to your saves, in `logs/errors.log`). Options -> Error log
  opens the folder, or copies a report in the browser, ready to send with a bug report.

**Fixed**
- The downloaded game, opened by double-clicking `Lost Marcus.html`, now plays the recorded
  soundtrack in Chrome and other browsers that refused to read the music files from disk. Before, it
  quietly fell back to the synth tracks.
- Restarting a Second Edition run from the pause menu or with Begin again after a death started a
  normal run. It keeps the mode now,
  and a Daily Run can't be restarted for a different seed.
- Sweets and pages left in cursed rooms could crash the game when picked up, and a broken sweet
  could stop the room from drawing. Saves holding one load safely.

## Download and play

### Windows (recommended)
- **Lost-Marcus-Setup-X.Y.Z.exe**: installer with Start-menu and desktop shortcuts.
- **Lost-Marcus-X.Y.Z-portable.exe**: no install needed. Just double-click it.

Your progress is saved automatically to `%APPDATA%\Lost Marcus\saves`. Press F11 for fullscreen.

> Windows SmartScreen may warn about an unrecognised app because the .exe is not code-signed.
> Click **More info**, then **Run anyway**.

### Any computer (browser version)
1. Download **Lost-Marcus-VERSION.zip** and unzip it.
2. Double-click **Lost Marcus.html**. It runs offline in Chrome, Edge or Firefox.

### Other files
- **Lost-Marcus-VERSION.html**: the browser version as a single file.
- **Lost-Marcus-VERSION-web.zip**: a multi-file build for web hosts (itch.io, Netlify, GitHub Pages).
