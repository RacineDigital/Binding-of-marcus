import { defineConfig, type Plugin } from 'vite';
import type { OutputAsset, OutputChunk } from 'rollup';
import * as fs from 'fs';
import * as path from 'path';

// The recorded chapter soundtrack lives in assets/music/audio as NN-<chapter>.ogg. It is served at
// music/<chapter>.ogg in development and copied next to the page in every build (never inlined:
// the game loads each track when its chapter starts).
function chapterMusic(): Plugin {
  const dir = path.resolve(__dirname, 'assets/music/audio');
  const files = () => (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
    .filter((f) => /\.ogg$/i.test(f))
    .map((f) => ({ id: f.replace(/^\d+[-_ ]?/, '').replace(/\.ogg$/i, '').toLowerCase(), file: path.join(dir, f) }));
  return {
    name: 'chapter-music',
    configureServer(server) {
      server.middlewares.use('/music', (req, res, next) => {
        const id = (req.url ?? '').replace(/^\//, '').replace(/\?.*$/, '').replace(/\.ogg$/, '');
        const f = files().find((x) => x.id === id);
        if (!f) return next();
        res.setHeader('Content-Type', 'audio/ogg');
        fs.createReadStream(f.file).pipe(res);
      });
    },
    generateBundle() {
      for (const f of files()) this.emitFile({ type: 'asset', fileName: `music/${f.id}.ogg`, source: fs.readFileSync(f.file) });
    },
  };
}

// Inlines the JS bundle and CSS (fonts included, as data URIs) into index.html so the
// release build is a single file that runs straight from disk, no web server needed.
function singleFile(): Plugin {
  return {
    name: 'single-file',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_opts, bundle) {
      const html = bundle['index.html'] as OutputAsset | undefined;
      if (!html) return;
      let src = String(html.source).replace(/<link rel="modulepreload"[^>]*>\s*/g, '');
      for (const [name, file] of Object.entries(bundle)) {
        const tagName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (file.type === 'chunk' && name.endsWith('.js')) {
          const code = (file as OutputChunk).code.replace(/<\/script/gi, '<\\/script');
          src = src.replace(new RegExp(`<script[^>]*src="[^"]*${tagName}"[^>]*></script>`), () => `<script type="module">\n${code}\n</script>`);
          delete bundle[name];
        } else if (file.type === 'asset' && name.endsWith('.css')) {
          src = src.replace(new RegExp(`<link[^>]*href="[^"]*${tagName}"[^>]*>`), () => `<style>\n${String(file.source)}\n</style>`);
          delete bundle[name];
        }
      }
      html.source = src;
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: single ? [chapterMusic(), singleFile()] : [chapterMusic()],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 4000,
      ...(single
        ? {
            outDir: 'dist-single',
            assetsInlineLimit: Number.MAX_SAFE_INTEGER,
            cssCodeSplit: false,
            modulePreload: { polyfill: false },
            rollupOptions: { output: { inlineDynamicImports: true } },
          }
        : {}),
    },
    server: { host: true },
  };
});
