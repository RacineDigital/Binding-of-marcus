import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/pirata-one/400.css';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/600.css';
import { boot } from './game/boot';
import { watchForUpdates } from './core/update';
import { installErrorLog, logError } from './core/errorlog';

installErrorLog();
watchForUpdates();

boot().catch((e) => {
  console.error(e); logError(e, 'boot');
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Failed to start: ' + (e?.message ?? e);
});
