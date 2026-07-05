import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const files = await Promise.all(['app.js','state.js','audio.js','srs.js','speaking.js'].map((file) => readFile(new URL(`../assets/${file}`,import.meta.url))));
const gzipped = files.reduce((sum,file)=>sum+gzipSync(file).length,0);
assert.ok(gzipped < 200_000,`JS bundle is ${gzipped} gzipped bytes`);
const html = await readFile(new URL('../index.html',import.meta.url),'utf8');
const ids = [...html.matchAll(/\bid=["']([^"']+)/g)].map((match)=>match[1]);
assert.equal(new Set(ids).size,ids.length,'Static HTML contains duplicate IDs');
assert.match(html,/class="skip-link"/);
assert.match(html,/aria-label="Primary navigation"/);
assert.match(html,/aria-live="polite"/);
const css = await readFile(new URL('../assets/app.css',import.meta.url),'utf8');
assert.match(css,/:focus-visible/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(css,/\[hidden\]\{display:none!important\}/);
console.log(`Static accessibility contracts verified; JavaScript is ${gzipped} bytes gzipped.`);
