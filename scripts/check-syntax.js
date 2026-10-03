import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? files(p) : (p.endsWith('.js') ? [p] : []);
  });
}
const list = files(path.resolve('src'));
let failed = 0;
for (const file of list) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) { failed++; console.error(r.stderr || r.stdout); }
}
if (failed) process.exit(1);
console.log(`Syntax OK: ${list.length} JavaScript files`);
