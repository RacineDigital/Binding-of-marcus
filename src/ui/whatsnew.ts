// The newest CHANGELOG section, bundled in at build time and laid out for the in-game "What's new"
// pages, so the notes players read are always the ones in the repository.
import changelog from '../../CHANGELOG.md?raw';

export interface NewsLine { s: string; kind: 'head' | 'body' | 'bullet' | 'gap' }

/** The newest "## What's new in ..." section: its title and its paragraphs as plain-text blocks. */
export function latestNews(): { title: string; blocks: NewsLine[] } {
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## '));
  if (start < 0) return { title: "What's new", blocks: [] };
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end < 0) end = lines.length;
  const title = lines[start].replace(/^##\s*/, '');
  const plain = (s: string) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/->/g, '→').trim();
  const blocks: NewsLine[] = [];
  let para: string[] = [], bullet = false;
  const flush = () => {
    if (!para.length) return;
    const t = para.join(' ');
    // a paragraph that opens with a bold lead ("**Lead.** the rest") becomes a heading and its text
    const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(t);
    if (!bullet && m) { blocks.push({ s: plain(m[1]), kind: 'head' }); if (m[2]) blocks.push({ s: plain(m[2]), kind: 'body' }); }
    else blocks.push({ s: plain(t), kind: bullet ? 'bullet' : 'body' });
    para = []; bullet = false;
  };
  for (const raw of lines.slice(start + 1, end)) {
    if (!raw.trim()) { flush(); if (blocks.length && blocks[blocks.length - 1].kind !== 'gap') blocks.push({ s: '', kind: 'gap' }); continue; }
    if (/^###\s/.test(raw)) { flush(); blocks.push({ s: plain(raw.replace(/^###\s*/, '')), kind: 'head' }); continue; }
    if (/^\s*- /.test(raw)) { flush(); bullet = true; para.push(raw.replace(/^\s*- /, '')); continue; }
    para.push(raw.trim());
  }
  flush();
  while (blocks.length && blocks[blocks.length - 1].kind === 'gap') blocks.pop();
  return { title, blocks };
}
