import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/pirata-one/400.css';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/600.css';
import { boot } from './game/boot';

boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.textContent = 'Failed to start: ' + (e?.message ?? e);
});
