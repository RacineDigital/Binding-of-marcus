// Render the original rock score through the same Web Audio engine used by the game.
// Start npm run dev first. Optional arguments select chapter IDs; default is all gameplay tracks.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const metadataPath = 'assets/music/chapter-map.json';
const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
const requested = process.argv.slice(2);
const targets = metadata.filter(t => !['home', 'room4'].includes(t.chapter_id) && (!requested.length || requested.includes(t.chapter_id)));
if (!targets.length || requested.some(id => !targets.some(t => t.chapter_id === id))) throw new Error('Select known gameplay chapter IDs (home/room4 retain their ending themes)');
const audioDir = 'assets/music/audio';
const filenames = readdirSync(audioDir);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  // A source edit in the development server must not reload an in-flight export.
  await page.routeWebSocket('**/*', socket => socket.close());
  // Export without the game loop consuming random values between render yields.
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/');
  await page.waitForFunction(() => !!window.__bomDebug, null, { polling: 100 });
  for (const track of targets) {
    const id = track.chapter_id, index = metadata.indexOf(track);
    const result = await page.evaluate(async ({id, title, index}) => {
      const { driveSong } = await import('/src/audio/drive.ts');
      const { renderSong } = await import('/src/audio/render.ts');
      const { clearInstCache } = await import('/src/audio/inst.ts');
      const { clearVoiceCache } = await import('/src/audio/synthvoices.ts');
      // Repeatable performances and percussion without coupling gameplay RNG to music.
      let seed = [...id].reduce((s,c) => Math.imul(s ^ c.charCodeAt(0),16777619) >>> 0,2166136261);
      const random = Math.random;
      Math.random = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      try {
        const song = driveSong(id,title,index);
        const { combat } = await renderSong('drive-export-' + id, song);
        const length = combat.length, channels = [combat.getChannelData(0),combat.getChannelData(1)];
        const bytes = new Uint8Array(44 + length * 4), view = new DataView(bytes.buffer);
        const str = (offset,s) => [...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
        str(0,'RIFF'); view.setUint32(4,bytes.length-8,true); str(8,'WAVE');str(12,'fmt ');
        view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);
        view.setUint32(24,combat.sampleRate,true);view.setUint32(28,combat.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,length*4,true);
        let peak=0,sum=0;
        for(let i=0;i<length;i++) for(let ch=0;ch<2;ch++) {
          const v=channels[ch][i]; if(!Number.isFinite(v)) throw new Error('Nonfinite audio sample');
          peak=Math.max(peak,Math.abs(v));sum+=v*v;
          view.setInt16(44+(i*2+ch)*2,Math.round(Math.max(-1,Math.min(1,v))*32767),true);
        }
        let binary='';for(let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
        return {wav:btoa(binary),bpm:song.bpm,bars:song.bars,samples:length,sampleRate:combat.sampleRate,peak:20*Math.log10(peak),rms:20*Math.log10(Math.sqrt(sum/(length*2)))};
      } finally { Math.random=random; clearInstCache(); clearVoiceCache(); }
    },{id,title:track.title,index});
    const file = filenames.find(f=>f.replace(/^\d+[-_ ]?/, '').replace(/\.ogg$/i,'') === id);
    if (!file) throw new Error('Missing recording filename for '+id);
    const wavPath = join(tmpdir(), `lost-marcus-${id}.wav`);
    writeFileSync(wavPath,Buffer.from(result.wav,'base64'));
    const encode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',wavPath,'-map_metadata','-1','-c:a','libvorbis','-q:a','6',join(audioDir,file)],{stdio:'inherit'});
    if(encode.status!==0) throw new Error('ffmpeg failed for '+id);
    Object.assign(track,{bpm:result.bpm,bars:result.bars,duration_seconds:result.samples/result.sampleRate,loop_end_sample:result.samples,sample_rate:result.sampleRate,peak_dbfs:+result.peak.toFixed(2),rms_dbfs:+result.rms.toFixed(2),mood:'Fast melodic arcade rock; double-tracked guitars, punchy drums, chip hooks and a lead-guitar finish.',direction:'Original composition in src/audio/drive.ts; no sampled or quoted melodies.'});
    delete track.mp3;
    track.ogg = 'audio/' + file;
    track.score = 'src/audio/drive.ts';
    // Persist each completed track so a partial render can be resumed safely.
    writeFileSync(metadataPath,JSON.stringify(metadata,null,2)+'\n');
    console.log(`${id}: ${result.bpm} BPM, ${(result.samples/result.sampleRate).toFixed(2)}s, peak ${result.peak.toFixed(1)} dBFS, RMS ${result.rms.toFixed(1)} dBFS`);
  }
} finally { await browser.close(); }
