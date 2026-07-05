import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, './');
assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));

const shell = [
  'index.html','manifest.json','icon.png','icon512.png',
  'assets/app.css','assets/app.js','assets/state.js','assets/audio.js','assets/srs.js','assets/speaking.js',
  'content/manifest.json','content/cards.json','content/quizzes.json','content/tests.json','content/reference.json',
  ...Array.from({ length:30 },(_,index)=>`content/day-${String(index + 1).padStart(2,'0')}.json`),
];
await Promise.all(shell.map((file) => access(resolve(root, file))));
const worker = await readFile(resolve(root, 'sw.js'), 'utf8');
assert.match(worker, /deutschweg-v14/);
assert.match(worker, /cache\.addAll\(APP_FILES\)/);
assert.match(worker, /event\.request\.mode === 'navigate'/);
assert.match(worker, /SKIP_WAITING/);
console.log(`PWA manifest and ${shell.length} offline shell/course files verified.`);
