# Changelog

Every version of Lost Marcus, newest first. Each release page only lists what's new in that release.

## What's new in 3.1.1

- **Smoother walking.** The walk cycle has twice as many frames and a calmer stride, so the legs
  don't flicker. The body dips once on each footfall, the head now moves exactly with the body
  (it used to bob on its own beat, half a pixel out), and footstep dust lands when the feet do.
- **Marcus is the plain default character again**, like Isaac: no signature ability, just the
  baseline everyone else is measured against.
- Bram's shaved head is smooth instead of streaky.

## What's new in 3.1.0: "Readers"

### Every reader has their own thing
All ten readers are now drawn on Marcus's hand-drawn sprite, Isaac-style: same body, their own
hair, colours and accessories (Wren's ginger braid, Edda's black bob with a needle in it, Elias's
beard and spectacles, Bram's shaved head and bandage, Ozzie's goggles and more). Each also has a
signature, shown on the Tab screen:
- **The Blot**, Azazel-style: it can't shoot. A wound tears open in its chest, its eyes blaze, and
  it spews a short, thick beam of ink, then the wound seals over. It also flies on wings of ink.
- **Ozzie**, Loaded: every shot rolls a die, and a six hits for triple damage.
- **Edda**, Stitchwork: needles pierce and stitch enemies together.
- **Wick**: moth shots home in on enemies.
- **Ada**, Rose Cuttings: thorns slow what they hit and leave brambles behind.
- Wren's pebbles ricochet, Elias flies through stone, Nell has her long beam and Bram fights up
  close.

### Item pools, sorted
- **Every item now lives in exactly one pool**, and every item of a transformation shares it:
  - The Inkwell (the devil pool, paid in hearts): Inkblooded and every pact.
  - Wax Chapel (the angel pool): Waxen Saint and Drainer.
  - Hexed Room: Hollowed and Ossified, plus cursed things.
  - Crawlspace (secret rooms): King Vamp.
  - Mott's Wares (the shop): Clockwork, Jeffy and the dice.
  - The Curio (item rooms): Mothkin, Needleworker and most shot changers.
  - Chapter's End (boss rooms): food and stat-ups.
- **You can tell where an item is from.** Its description shows a coloured tag (for example
  "Inkwell item"). Inkwell items trail ink smoke and sit on a red ring, Hexed items spark purple and
  Chapel items shed light, even when they turn up somewhere else. The Collection shows each item's
  pool, including where to look for ones you haven't found.
- **New Inkwell items:** Ink Horns, The Signature and Wings of the Well.
- **New Hexed items:** Black Cat, Hex Doll and Cracked Mirror.

### Bosses, redrawn
Every boss is repainted with far more detail and smoother, longer animation loops. On top of that,
each boss has its own animation layer:
- embers and smoke off the Furnace Heart;
- moths escaping the Wardrobe;
- pages circling the Unbound;
- snow falling round the Rime Bride;
- glowing eyes, drips and steam.

It Remembers now looks like its own thing: a flesh-bound book with a green eye.

### Also
- **Automatic updates (Windows installer).** From this version on, the installed game checks for a
  new version when it starts, downloads it in the background and installs it when you quit. The
  main menu shows when one is ready. The portable .exe and the browser version can't update
  themselves, but the main menu tells you when a new version is out. *(Install 3.1.0 with the
  Setup .exe once; after that, updates are automatic.)*
- **Flight is obvious.** Flying readers hover higher above a small shadow with a downdraft under
  them, always show wings, and get a "Flying" line under their stats. You're told when you start
  flying.
- **The Pincushion's spikes take their price from fliers too.**
- **Only red hearts cost you the bargain door.** Like Isaac, getting hit on wax, ink or brass
  hearts no longer lowers your Inkwell / Chapel chance. Only losing red hearts does (and paying
  the Pincushion never counts).
- **The Unbound's sweeping lasers can be dodged.** They used to start beside you and sweep across
  most of the room. Now they always open with you in a gap, warn for a full second, and turn
  slowly enough to walk round the book ahead of them.
- **The Boys.** Crug's Pen, Ewen's Bike, Gavyn's Pouch and Sam's Beer are now a Collection set
  called The Boys. They're no longer a transformation. Holding all four still unlocks Grandad's
  Radio.
- Toffee the tabby is now called **Badger**.

## What's new in 3.0.4

- **Fixed: Blight of the Unread made your items look duplicated.** That curse hides what's on item
  pedestals, but it was also hiding the items you already owned, so the item tracker filled up
  with identical "?" icons. Now only pedestals are hidden (like Isaac's Curse of the Blind): your
  items always show, and picking a hidden item up shows what it was.
- The hidden-item icon is a clear question mark now.

## What's new in 3.0.3

- **Clearer stat icons.** Each stat has its own picture and colour now: a yellow running shoe
  (speed), a red sword (damage), blue tear drops (fire rate), a ruler with a double arrow (range),
  a cyan shot with speed streaks (shot speed) and a four-leaf clover (luck).
- **Stats are named.** Hold Tab to see every stat with its name and value, and when one changes
  the popup says which (for example "+1.0 damage").

## What's new in 3.0.2

- **The announcer voice is gone.** Sweets, pages and transformations are no longer read out loud
  (transformations still get their title card and sound).

## What's new in 3.0.1

- **Homing lasers always hit.** A laser is instant, so with any homing item it now locks onto the
  enemy nearest your aim and bends in a smooth curve that ends right on its body. Before, it
  aimed at enemies' feet and turned too slowly, so about one homing laser in four missed. The
  Burning Glass beam uses the same targeting and holds onto its target instead of flickering.

## What's new in 3.0: Echoes

- **Echoes.** Where you died last time, your echo is waiting. Next run, the chapter you fell in
  has a room behind a pale, frosted door with a handprint on it: inside is a ghost of the reader you
  died as, fighting the way you did (strafing, dashing, firing your shots), and the more you
  were carrying, the harder it is. Lay it to rest and it leaves behind one of the things it had.
  (Not in challenges or the Daily Run, and the rest of the seed's floor is never changed.)
- **Champion bosses.** Now and then a chapter boss turns up as a champion: **Crimson** (faster,
  bleeds creep as it moves), **Gilded** (tougher, pays out buttons and a locked chest) or **Inked**
  (leaks rings of ink). Each one is recoloured and pays better.
- **A new transformation: The Crew.** Carry three of the crew's things (Crug's Pen, Ewen's Bike,
  Gavyn's Pouch, Sam's Beer, Toffee) and one of your mates turns up for every fight and helps out.
- **New items:** the **Snow Globe** (shake it and the whole room stops, enemies and shots hanging
  in the air), the **Rewind Tape** (go back three seconds, healing what you took; earned by laying
  an echo to rest) and **Grandad's Radio** (every so often it crackles and confuses every enemy in
  the room; earned by becoming The Crew).
- **Fixed:** the Readers screen ran off the page with ten readers. They're in a grid now, with
  mouse support and each reader's completion marks underneath.

## What's new in 2.9

- **The final bosses are final.** Only the bosses you can end the story on are hard (the Binding's,
  the Unwritten, the Author and the Patient); they hit harder, attack faster and have a bullet-hell
  last stand under 20% health. Ending bosses never show up anywhere else.
- **The Unwritten and the Author are the Delirium fight now:** ten times the health, eight phases,
  new bullet patterns (flowers, sweeping walls, seekers, rotating crosses), layered spirals that
  build up through the fight, and they change shape constantly, into any boss you've beaten
  (including the Iron Lung, the Patient and It Remembers).
- **VS screen** before every boss: your reader on one side, the boss on the other.
- **Transformations announce themselves:** a big title in the middle of the screen, a sound, and
  an announcer voice says the name (it also reads out sweets and pages; turn it off in Options).
  Item descriptions show transformation progress filling up (◆◆◇ 2/3, "this completes it!"), and
  holding Tab shows every transformation you've started.
- **New items:** Crug's Pen (flaming shots), Ewen's Bike (spikes and creep can't hurt you), Gavyn's
  Pouch (fire rate up, fat top lip), Sam's Beer (brown creep shots that fizz into foam, damage up)
  and **Toffee**, a brown tabby kitten who stalks and pounces, hisses enemies away when you're hurt
  and brings you presents. **The Cherry Orchard**: an ultra-rare item that sets your bombs to 99.
- **A new reader: Ada, the Gardener.** Grandmother, with thorn shots that slow, her ring and her
  pressed clover. Unlock: finish The Visit while carrying Grandmother's Ring.
- **Completion marks**, like Isaac's: every reader's card shows which of the five endings they've
  reached (cream on Normal, red on Second Edition).
- The boss music stops when the boss dies. Fewer black (ink) hearts. The golden bomb no longer gives
  infinite bombs (it's +5 now). Item descriptions show up from a bit further away. Enemy homing
  shots now home in on you (they were chasing other enemies).

## What's new in 2.8 (beta): the story

- **Grandfather's Notes.** 25 notes in Grandfather's handwriting turn up lying in rooms, on stands.
  Read one and it goes in the Journal (Journal → Notes). In order, they tell what really happened
  in the house on Harrow Lane, and they point at the hidden paths.
- **The back stair to St. Agnes.** Once you've finished the story, the Chapter II boss room has a
  boarded-up stair. Bomb it and the run climbs into the hospital instead of Chapters III–V: the
  Waiting Room, the Night Ward and Intensive Care, with its new boss, **the Iron Lung**.
- **Grandfather's letter, torn in two.** One half is at the hospital's lost property (the bargain
  door there is always the Lost & Found, so stay unhurt), the other is hidden in a Deep Crawlspace.
  Hold Tab to see which halves you have. With the whole letter, **Room 4** opens after Intensive
  Care, and **The Patient** is in the bed: a new three-phase final boss with a heart monitor that
  beeps rings of shots, IV tubes, pills, a breath that drags you in, and a flatline.
- **Five numbered endings:** Morning, In His Own Hand, For Marcus, The Visit and **Goodnight**, the
  last one. See the first four, visit Room 4 again, and the morning comes in through the window.
  Endings are listed in the Journal with a clue for each one you haven't found, and every ending
  closes with a line for the reader who got there. The title screen changes once the book is done.
- **Everything ties together.** Items that belonged to the family show where they came from in the
  Collection; characters and bosses point back at each other (Edda sewed Grandad's name into his
  hospital coat, the Pendulum stopped at 4:04, the Matron's book doesn't have your name in it).
  New fortunes hint at the hidden paths.
- **New keepsakes:** Get Well Soon (put the letter together), Grandad's Cardigan (finish The Visit;
  15% of hits just don't land) and The Last Word (see Goodnight; your shots finish things).

## What's new in 2.7 (beta)

**2.7.2:** the strongest dice have to be earned. D4: have two transformations at once. D8: reach
15 damage. Spindown Dice: complete three challenges. D100: beat the Author. D Infinity: roll every
other die (D1, D4, D6, D7, D8, D9, D10, D12, D20) at least once.

**2.7.1:** the four newest characters are hard to earn now. Ozzie: beat It Remembers holding a die.
Nell: beat the Unwritten. Bram: beat three chapter bosses in one run without any of them hitting
you. Wick: finish the story as Mothkin.

- **The end game makes itself known.** Once you've finished the story, the Binding is never the
  same: its chapter card warns you in red, and its boss is always **It Remembers**: the Unbound,
  awake, with every attack open from the start and more health (like Mom's Heart becoming It Lives).
- **The light has to be earned.** The beam of light after the Binding only comes down once you've
  beaten the Unwritten twice. Until then you'll see how close you are (1/2).

## What's new in 2.6 (beta)

- **Jeffy.** Find the Big Boy Diaper, the Nose Pencil and the Blue Bike Helmet to become Jeffy:
  each piece shows on you, and together you're shirtless in a diaper and helmet with a pencil up
  your nose. Getting hit throws a tantrum of pencils.
- **Every die from Isaac:** D1, D4, D6, D7, D8, D10, D12, D20, D100, Eternal D6, Spindown Dice and
  D Infinity, plus a D9 (Isaac never had one: it rerolls your charms). Old Dice is now the D6.
- **Three endings after the Binding.** Next to the EXIT and the ink tear, a beam of light now goes
  up to the Dedication and the Foreword, where the Author waits. Each path has its own ending.
- **Four new characters who start with items:** Ozzie (the D6, 2 luck), Nell (the Burning Glass and
  the Pocket Lantern), Bram (melee with the Bone Folder, plus the Tin Heart) and Wick (flies, with
  two moths). Characters you've won with get a gold star.
- **More ink hearts** in room drops, chests, boss drops and heart rolls.
- Creep shots leave a puddle where they land; refighting a room with the D7 rolls a fresh reward;
  whole-number stats read +1 instead of +1.0; the Tab screen shows which face D Infinity is on.

## What's new in 2.5 (beta)

- **Beyond the Binding.** Finish the story once, and next time the Binding opens two ways on: an
  EXIT door (ends the run as a win) or a tear in the page. The tear leads to **The Margins**: a
  huge chapter of the hardest creatures with five identical boss rooms, treasure rooms and a shop.
  Every boss drops a boss item; only one opens the way to **The Last Page** and **The Unwritten**,
  which rewrites itself into the bosses you've beaten.
- **Five new themed bosses:** the Thornwife (Greenhouse), the Rime Bride (Frozen Cistern), the
  Pendulum (Clocktower), the Typesetter (Print Shop) and the Bookbinder (The Binding). Every
  chapter now has at least two bosses that fit it.
- **Bosses look better:** heavier shadows, a glow in the chapter's colours (red when they're nearly
  dead), a breathing idle and ink dripping off them at low health. Chapter I bosses are a bit
  gentler.
- **The Lost & Found:** a third room that can open after a boss, next to the Inkwell and the Wax
  Chapel. It holds the items you left behind; take one, leave one of yours.
- **Bargain door odds on the HUD**, like Isaac's devil/angel chance. They drop when you get hit.
- **Stat icons**, with +/- readouts when a stat changes.
- **Hold Tab** to see what your active item, charms, pages and sweets do, plus the door odds.
- **Accurate hitboxes:** shots collide where they're drawn, for you and for enemies.
- **Fixed:** beams, lasers, ghost shots and arcing shots couldn't put out fires or blow up kegs.
- **Collection, Bestiary and Achievements** scroll with the mouse wheel and show a scrollbar; what
  you've found is grouped by set.
- **Inkwell prices** show the hearts you'd really pay (wax or ink once you're out of red).

## What's new in 2.4 (beta)

- **Papermoth Games.** A studio splash on launch: a folded-paper moth flutters in (any key skips it).
- **Items change how you look.** Wear Grandmother's Ring (new), spectacles, masks, crowns, halos,
  wings, capes and more. The strongest items restyle your whole outfit, and every transformation
  is a new look: King Vamp, Mothkin, Inkblooded, Clockwork, Waxen Saint, Needleworker, Ossified,
  Hollowed and Drainer.
- **A cleaner title menu.** Only what you can use: Continue (when a story is in progress), New Run,
  Daily Run, Challenges (once unlocked), Journal (readers, collection, bestiary, history, stats),
  Options (now with save slots and credits) and Quit.

## What's new in 2.3 (beta)

- **The Bilgemaw has a real body.** Its segments stay connected, follow the head, and can be hit:
  damage to any segment reaches the boss, and chain lightning arcs down the whole body.
- **Prettier menus.** Engraved headings like the logo, book-cover frames with a ribbon bookmark,
  keycap-style controls, and a new pause screen with your controls and run details.
- **Descriptions follow your controls.** Item, pickup, page and sweet descriptions name the keys you
  have bound (or the controller buttons when you're on a pad).

## What's new in 2.2 (beta)

**2.2.1:** Discord status is switched on (it shows "Playing Lost Marcus" with your chapter, boss fight and run time while Discord is open).

- The game is now called **Lost Marcus**, with a new title logo. Desktop saves from Binding of
  Marcus are copied over automatically the first time you start it.
- Discord status: shows the chapter you're in, the boss you're fighting and the run time.
- The Rust Crab and the Bone Knight are gone: they blocked every shot from the front, so only bombs
  could kill them.

## What's new in 2.1

**2.1.1:** the Options menu scrolls (mouse wheel, arrows or hover/click), so every setting is reachable.

- **A real Windows game.** Installer and portable .exe, saves to disk, three save slots with
  export/import, autosave on every room, and Continue drops you back in the exact room.
- **New title screen** with mouse support, Run History, a Bestiary and save-slot management.
- **Twenty chapters in a random order every run**, six of them new (Attic, Greenhouse, Print Shop,
  Frozen Cistern, Clocktower, Library Stacks), each with its own music.
- **Every item synergizes.** Beams, lasers and blades carry every shot effect, attack modes combine
  instead of replacing each other, and an automated test checks every item in every mode.
- **External Item Descriptions-style info** for items, shop stock, pages, sweets and charms.
- **More room clear rewards:** Flawless streaks, swift clears, jackpots, double rolls in big rooms.
- **Endless mode**, an optional run timer and screenshots (F9).
- Fixes: the pause menu no longer closes straight away, every fire can be put out, homing shots no
  longer circle close enemies, and a trapdoor that opens under you waits until you step off it.
