import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'content/manifest.json'), 'utf8'));
let sections = 0;
const failures = [];

for (const entry of manifest.days) {
  const day = JSON.parse(await readFile(resolve(root, 'content', entry.file), 'utf8'));
  if (day.day !== entry.day || day.sourceHash !== entry.sourceHash) failures.push(`Day ${entry.day}: manifest mismatch`);
  for (const section of day.sections) {
    sections += 1;
    const actual = createHash('sha256').update(section.html).digest('hex');
    if (actual !== section.sourceHash) failures.push(`${section.id}: content hash mismatch`);
  }
}

if (manifest.days.length !== 30) failures.push(`Expected 30 days, found ${manifest.days.length}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Verified 30 day files and ${sections} preserved section payloads.`);
