#!/usr/bin/env bash
# Download counts for every release, per file, from the GitHub API (the repository is public).
# Usage: bash scripts/downloads.sh
set -euo pipefail
curl -s "https://api.github.com/repos/RacineDigital/Binding-of-marcus/releases?per_page=100" | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  const rel = JSON.parse(s); let total = 0;
  for (const r of rel) {
    const n = r.assets.reduce((a, x) => a + x.download_count, 0); total += n;
    console.log(`${r.tag_name.padEnd(8)} ${String(n).padStart(4)}   ` + r.assets.map((a) => `${a.name}: ${a.download_count}`).join(", "));
  }
  console.log(`total    ${String(total).padStart(4)}`);
});'
