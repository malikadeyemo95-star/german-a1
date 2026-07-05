import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../content/reference.json',import.meta.url),'utf8'));
assert.ok(data.glossary.length >= 150);
assert.ok(data.grammar.length >= 20);
assert.equal(data.search.length,data.glossary.length + data.grammar.length);
assert.ok(data.glossary.some((entry)=>entry.article==='der'));
assert.ok(data.glossary.some((entry)=>entry.article==='die'));
assert.ok(data.glossary.some((entry)=>entry.article==='das'));
assert.ok(data.grammar.every((entry)=>entry.html.includes('<details')));
console.log(`Verified ${data.glossary.length} glossary entries and ${data.grammar.length} original grammar sections.`);
