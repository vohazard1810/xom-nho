import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files = readdirSync('game').filter(f => /^test-.*\.mjs$/.test(f)).sort();
if (!files.length) throw new Error('No game tests found');
for (const file of files) {
  console.log(`RUN game/${file}`);
  const r = spawnSync(process.execPath, [`game/${file}`], {stdio: 'inherit', windowsHide: true});
  if (r.error || r.status !== 0) process.exit(1);
}
console.log(`PASS ${files.length}/${files.length} game test files`);
