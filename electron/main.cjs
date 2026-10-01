// Desktop shell for Binding of Marcus: a single window running the self-contained game build,
// with saves written as JSON files in the user's app-data folder.
//   Windows: %APPDATA%\Binding of Marcus\saves\
const { app, BrowserWindow, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const SMOKE = process.argv.includes('--smoke');
let win = null;
app.setName('Binding of Marcus');

function savesDir() {
  const d = path.join(app.getPath('userData'), 'saves');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const safeName = (k) => String(k).replace(/[^a-z0-9_.-]/gi, '_');

/** Atomic write with a rolling backup so a crash mid-write never corrupts a save. */
function writeSave(key, json) {
  const file = path.join(savesDir(), safeName(key) + '.json');
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  if (fs.existsSync(file)) { try { fs.copyFileSync(file, file + '.bak'); } catch { /* ignore */ } }
  fs.renameSync(tmp, file);
}
function readSave(key) {
  const file = path.join(savesDir(), safeName(key) + '.json');
  for (const f of [file, file + '.bak']) {
    try { const s = fs.readFileSync(f, 'utf8'); JSON.parse(s); return s; } catch { /* try backup */ }
  }
  return null;
}

ipcMain.on('save:read', (e, key) => { e.returnValue = readSave(key); });
ipcMain.on('save:write', (_e, key, json) => { try { writeSave(key, json); } catch (err) { console.error('save failed', err); } });
ipcMain.on('save:delete', (_e, key) => { for (const ext of ['.json', '.json.bak']) { try { fs.unlinkSync(path.join(savesDir(), safeName(key) + ext)); } catch { /* ignore */ } } });
ipcMain.handle('save:folder', () => { shell.openPath(savesDir()); return savesDir(); });
ipcMain.handle('screenshot', async (_e, dataUrl) => {
  const dir = path.join(app.getPath('pictures'), 'Binding of Marcus');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `marcus-${stamp}.png`);
  fs.writeFileSync(file, nativeImage.createFromDataURL(dataUrl).toPNG());
  return file;
});
ipcMain.on('win:fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); });
ipcMain.on('win:quit', () => app.quit());

function create() {
  win = new BrowserWindow({
    width: 1440, height: 810, minWidth: 640, minHeight: 360,
    title: 'Binding of Marcus', backgroundColor: '#07050a', show: false,
    autoHideMenuBar: true, icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  win.removeMenu();
  win.once('ready-to-show', () => { if (!SMOKE) win.show(); });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt)) { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
  });
  const page = app.isPackaged ? path.join(process.resourcesPath, 'game', 'index.html') : path.join(__dirname, '..', 'dist-single', 'index.html');
  win.loadFile(page, { query: SMOKE ? { play: '1', seed: 'SMOKE123' } : {} });
  if (SMOKE) {
    // CI self-test: start a run, let it play for a few seconds, fail on any page error
    const errors = [];
    win.webContents.on('console-message', (_e, level, msg) => { if (level >= 3) errors.push(msg); });
    win.webContents.on('render-process-gone', () => { console.error('renderer crashed'); app.exit(2); });
    setTimeout(async () => {
      let ok = false;
      try { ok = await win.webContents.executeJavaScript('!!(window.__bomDebug && window.__bomDebug.world && window.__bomDebug.errors.length === 0)'); } catch (e) { errors.push(String(e)); }
      console.log(ok && !errors.length ? 'SMOKE OK' : 'SMOKE FAILED ' + errors.join(' | '));
      app.exit(ok && !errors.length ? 0 : 1);
    }, 8000);
  }
}

app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
