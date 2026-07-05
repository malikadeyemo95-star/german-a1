import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const glossary = [];
const grammar = [];
const search = [];

function plain(value) {
  return value.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
}

for (let day = 1; day <= 30; day += 1) {
  const data = JSON.parse(await readFile(resolve(root,'content',`day-${String(day).padStart(2,'0')}.json`),'utf8'));
  for (const section of data.sections) {
    if (section.type === 'grammar') {
      grammar.push({id:section.id,day,title:section.title,html:section.html});
      search.push({id:`grammar-${section.id}`,kind:'Grammar',day,title:section.title,text:plain(section.html).slice(0,500),sectionId:section.id});
    }
    if (section.type !== 'vocab') continue;
    for (const row of section.html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 2) continue;
      const germanCell = cells.find((cell) => /\bde\b/.test(cell[1])) || cells[0];
      const germanIndex = cells.indexOf(germanCell);
      const german = plain(germanCell[2]).replace(/🔊/g,'').trim();
      const english = plain(cells[germanIndex + 1]?.[2] || cells[1][2]).trim();
      if (!german || !english || /^german$/i.test(german)) continue;
      const article = /^(der|die|das)\b/i.exec(german)?.[1]?.toLowerCase() || '';
      const id = `vocab-d${day}-${glossary.length + 1}`;
      glossary.push({id,day,german,english,article,sectionId:section.id});
      search.push({id,kind:'Vocabulary',day,title:german,text:english,sectionId:section.id});
    }
  }
}

await writeFile(resolve(root,'content/reference.json'),`${JSON.stringify({schemaVersion:1,glossary,grammar,search},null,2)}\n`);
console.log(`Generated ${glossary.length} glossary rows, ${grammar.length} grammar references and ${search.length} search entries.`);
