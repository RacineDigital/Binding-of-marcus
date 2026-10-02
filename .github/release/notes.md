## What's new in 3.8.1: smoother big fights

- **Busy fights draw faster.** In a Room 4 fight against the Patient with an overpowered build (200
  enemy shots and nearly a thousand particles on screen), drawing the fight got about a fifth cheaper:
  every enemy shot's dark outline and light rim are now pre-drawn once instead of every frame, and the
  floor glow under enemy shots is skipped once there are more than 80 of them.
- **A particle budget.** Past 600 live particles, purely decorative dust, smoke and embers thin out;
  sparks, rings, flashes and stars, which tell you something happened, always appear.
- Includes everything from 3.8.0, including the fix for the freeze when Snap or Old Stoker woke up.

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
