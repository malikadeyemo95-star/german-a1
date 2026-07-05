import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'content/manifest.json'), 'utf8'));
const source = await readFile(resolve(root, 'course-source.html'), 'utf8');
let sections = 0;
const failures = [];

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function findBalanced(html, start, tagName) {
  const tag = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tag.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tag.exec(html))) {
    depth += match[0][1] === '/' ? -1 : 1;
    if (depth === 0) return tag.lastIndex;
  }
  throw new Error(`Unclosed <${tagName}> at ${start}`);
}

for (const entry of manifest.days) {
  const day = JSON.parse(await readFile(resolve(root, 'content', entry.file), 'utf8'));
  if (day.day !== entry.day || day.sourceHash !== entry.sourceHash) failures.push(`Day ${entry.day}: manifest mismatch`);
  const opening = new RegExp(`<section\\s+id=["']d${entry.day}["'][^>]*>`, 'i').exec(source);
  if (!opening) failures.push(`Day ${entry.day}: missing from canonical source`);
  else {
    const sourceSection = source.slice(opening.index, findBalanced(source, opening.index, 'section'));
    if (hash(sourceSection) !== day.sourceHash) failures.push(`Day ${entry.day}: canonical source hash mismatch`);
  }
  for (const section of day.sections) {
    sections += 1;
    const actual = hash(section.html);
    if (actual !== section.sourceHash) failures.push(`${section.id}: content hash mismatch`);
  }
}

if (manifest.days.length !== 30) failures.push(`Expected 30 days, found ${manifest.days.length}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Verified 30 day files and ${sections} preserved section payloads.`);
