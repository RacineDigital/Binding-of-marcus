// Loudness of each floor's ambience bed against its recording, as heard while exploring (the music
// muffled and lowered, the ambience at full room tone), at the default volume settings. Renders
// offline in the browser and prints RMS levels and the ambience's share of the mix.
//   npx tsx tests/tools/mixprobe.ts   (npm run dev first)
import { chromium } from 'playwright-core';
import { CHROME } from '../browser';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage();
  await p.goto(process.env.BASE_URL || 'http://localhost:5173/'); await p.waitForTimeout(1500);
  const out = await p.evaluate(`(async () => {
    const { Ambience, SOUNDSCAPES } = await import('/src/audio/ambience.ts');
    const { RECORDINGS } = await import('/src/audio/recorded.ts');
    const SR = 22050, SECS = 10, rms = (buf) => { const d = buf.getChannelData(0); let s = 0; for (let i = SR * 2; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / (d.length - SR * 2)); };
    const res = [];
    for (const id of Object.keys(SOUNDSCAPES)) {
      const c = new OfflineAudioContext(1, SR * SECS, SR);
      const bus = c.createGain(); bus.gain.value = 0.6 * 0.5; bus.connect(c.destination);   // default ambience volume x bus scale
      const rv = c.createGain(); rv.gain.value = 0;
      const a = new Ambience(c, bus, rv); a.set(id);
      const amb = rms(await c.startRendering());
      let mus = null;
      const rec = RECORDINGS.find((r) => r.id === id) ?? (id === 'hospital' ? RECORDINGS.find((r) => r.id === 'waiting') : null);
      if (rec) {
        const raw = await (await fetch('/music/' + rec.id + '.ogg')).arrayBuffer();
        const m = new OfflineAudioContext(1, SR * SECS, SR);
        const src = m.createBufferSource(); src.buffer = await m.decodeAudioData(raw);
        const lp = m.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.5;
        const g = m.createGain(); g.gain.value = 0.85 * 0.8 * 0.7 * 0.55;   // exploring: muffled x0.85, recording x0.8, music volume 0.7 x bus 0.55
        src.connect(lp); lp.connect(g); g.connect(m.destination); src.start(0, 20);
        mus = rms(await m.startRendering());
      }
      res.push({ id, amb: +amb.toFixed(4), mus: mus === null ? null : +mus.toFixed(4), share: mus ? Math.round(100 * amb / (amb + mus)) : null });
    }
    return res;
  })()`);
  for (const r of out as any[]) console.log(`${r.id.padEnd(12)} ambience ${String(r.amb).padEnd(7)} music ${String(r.mus).padEnd(7)} ambience share ${r.share ?? '-'}%`);
  await b.close();
})();
