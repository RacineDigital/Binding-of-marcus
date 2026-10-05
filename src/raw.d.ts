// Vite's ?raw imports: a file's text, bundled in at build time.
declare module '*.md?raw' { const text: string; export default text; }
