// The Chromium the browser tests drive: CHROME_PATH (or CHROMIUM_PATH) when set, otherwise the first
// one found in the usual places (a Playwright browser folder, a system Chrome/Chromium). Undefined
// leaves the choice to Playwright.
import * as fs from 'fs';
import * as path from 'path';

function playwrightChromes(): string[] {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    return fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()
      .flatMap((d) => [path.join(root, d, 'chrome-linux', 'chrome'), path.join(root, d, 'chrome-win', 'chrome.exe')]);
  } catch { return []; }
}

export const CHROME: string | undefined = process.env.CHROME_PATH || process.env.CHROMIUM_PATH || [
  ...playwrightChromes(),
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => fs.existsSync(p));
