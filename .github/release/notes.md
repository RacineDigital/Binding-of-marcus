## What's new in 3.8.0: fights you can learn

### Fixed: the game could freeze when a boss woke up
Since 3.5.0, Snap (one of the Twin Snips) and Old Stoker could hang the game the moment their fight
began. The way each boss was dealt its extra bullet patterns could loop forever for those two names.
It now can't loop at all, and a test checks every boss.

### Bosses with a rhythm
The Chapter I and II bosses were rebuilt around a pattern you can learn. Each has a fixed order of
attacks, a clear tell before every one, and a **moment after its big attack where it's spent**: it
heaves for breath, a gold ring pulses under it, its health bar turns gold, and every hit lands for
50% more (with a bright ring to tell you so).
- **The Grubmother** sweeps her spray across you (step against the sweep), sprays again, then
  burrows and erupts under you, and is left stuck half out of the ground. Below half she lunges
  first and burrows twice.
- **The Wardrobe** is solid walnut while closed: most of a hit clunks off. She opens up to attack
  (a charge that bursts her doors open, the doors volley, the spinning hangers), and that's when to
  hit her.
- **The Twin Snips** take turns, so you only ever read one threat at a time. Snip's dash into a
  wall leaves its blades stuck. Kill one and the other is left alone and furious, with both sets of moves.
- **Old Stoker** swings three fans of coal with the gap moving each time, then charges. Into a wall,
  he's dazed while the coals come down on marked spots around you. Then he stomps where you stood.
- **Furnace Heart** turns its jets (three lanes now, five when it overheats), lobs coal, then vents
  steam with one gap and has to cool with its grate open: hit the grate. Its iron casing turns most
  shots otherwise.
- Every other boss is briefly spent after any move that throws its whole body (charges, dashes,
  leaps, stomps, rolls).

### Enemies with jobs
- **Rag Crawler** (chaser) bunches up, then lurches in a straight line: step aside.
- **Dust Moth** (flanker) loops round to your side, shivers, dives, and loops again.
- **Gasper** (ranged) backs off when you crowd it.
- **Pillbug** (defender) plants itself between you and the nearest shooter or nest; its rolling
  shell turns shots, but flipped over by a wall its belly takes extra.
- **Mite Nest** (support) feeds the wounded around it with a green thread: kill it first.
- **Stoker**: a charger that hits a wall is dazed and open, like the pillbug.

### Readable, physical combat
- **Enemy shots are drawn above everything**, including explosions, beams and particles, so a big
  build can never hide what's about to hit you. Your own shots get quieter the more of them there are.
- **Hit pause** is a new option (Full, Light, Off), and it's drawn from a small budget so a hail of
  hits never makes the controls feel sticky. Melee swings that connect land with a beat of hit pause
  and a thump.
- **No free hits on the way in:** no ordinary enemy can fire in your first second in a room, and none
  starts within two tiles of a door (checked across every generated room).

### Big builds
- **Charged attacks can't be made useless** by stacking multishot items: charge time is capped at
  2 seconds, and letting go of a beam past 60% still fires a thinner one.
- **"On hit" items** (Grandfather's Spectacles, Ink Horns, Reading Lamp, Nell's embers) no longer
  trigger on burn and poison ticks.
- **Homing shots** no longer chase enemies that can't be hurt.

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
