// The announcer: a deep, slow voice that reads out transformations, sweets and pages, like the one
// in Isaac. Uses the system's speech voices (Windows, macOS and browsers all have them); silent if
// there are none or it's switched off in Options.
let voice: SpeechSynthesisVoice | null | undefined;
function pickVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
  const vs = s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  if (!vs.length) return null;
  // prefer a deep British or US male voice when one is installed
  const like = ['daniel', 'george', 'ryan', 'uk english male', 'david', 'guy', 'mark', 'fred', 'alex'];
  for (const k of like) { const v = vs.find((x) => x.name.toLowerCase().includes(k)); if (v) return v; }
  return vs.find((v) => /male/i.test(v.name) && !/female/i.test(v.name)) ?? vs[0];
}

/** Say a name out loud. `vol` is 0..1 (the effects volume). */
export function announce(text: string, vol = 1): void {
  const s = (globalThis as any).speechSynthesis as SpeechSynthesis | undefined;
  if (!s || vol <= 0 || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    if (voice === undefined || voice === null) voice = pickVoice(s);
    s.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/!+$/, '') + '!');
    if (voice) u.voice = voice;
    u.rate = 0.82; u.pitch = 0.45; u.volume = Math.min(1, vol * 1.1);
    s.speak(u);
  } catch { /* no speech here */ }
}
