import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'content/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const cards = [];
const counts = {};

function plain(value) {
  return value
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

for (const entry of manifest.days) {
  const day = JSON.parse(await readFile(resolve(root, 'content', entry.file), 'utf8'));
  let index = 0;
  for (const section of day.sections.filter((item) => item.type === 'flashcards')) {
    const cardPattern = /<div\b[^>]*class=["'][^"']*\bfc\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    while ((match = cardPattern.exec(section.html))) {
      const question = plain((/<(?:span|div)\b[^>]*class=["'][^"']*\bq\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>/i.exec(match[1]) || [,''])[1]);
      const answer = plain((/<(?:span|div)\b[^>]*class=["'][^"']*\ba\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div)>/i.exec(match[1]) || [,''])[1]);
      if (!question || !answer) continue;
      index += 1;
      const base = `d${day.day}-c${index}`;
      cards.push({ id:`${base}-en-de`,sourceId:base,day:day.day,direction:'en-de',prompt:question,answer,german:answer,english:question });
      cards.push({ id:`${base}-de-en`,sourceId:base,day:day.day,direction:'de-en',prompt:answer,answer:question,german:answer,english:question });
    }
  }
  counts[day.day] = index * 2;
}

manifest.days.forEach((day) => { day.cardCount = counts[day.day] || 0; });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(resolve(root, 'content/cards.json'), `${JSON.stringify({ schemaVersion:1, cards }, null, 2)}\n`);
console.log(`Generated ${cards.length} bidirectional SRS cards.`);
