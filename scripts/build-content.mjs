import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'course-source.html');
const outputDir = resolve(root, 'content');
const source = await readFile(sourcePath, 'utf8');

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function findBalanced(html, start, tagName) {
  const tag = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tag.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tag.exec(html))) {
    if (match[0][1] === '/') depth -= 1;
    else depth += 1;
    if (depth === 0) return tag.lastIndex;
  }
  throw new Error(`Unclosed <${tagName}> at ${start}`);
}

function directDetails(sectionHtml) {
  const bodyStart = sectionHtml.indexOf('>') + 1;
  const bodyEnd = sectionHtml.lastIndexOf('</section>');
  const body = sectionHtml.slice(bodyStart, bodyEnd);
  const tag = /<\/?details\b[^>]*>/gi;
  const ranges = [];
  let depth = 0;
  let start = -1;
  let match;
  while ((match = tag.exec(body))) {
    if (match[0][1] !== '/') {
      if (depth === 0) start = match.index;
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) ranges.push([start, tag.lastIndex]);
    }
  }
  if (depth !== 0) throw new Error('Unbalanced <details> content');
  return { body, ranges };
}

function text(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionType(summary) {
  const value = summary.toLowerCase();
  if (/quiz|test|exam/.test(value)) return 'quiz';
  if (/grammar|alphabet|pronunciation rule|theory/.test(value)) return 'grammar';
  if (/vocabulary|wortschatz/.test(value)) return 'vocab';
  if (/example|sentence/.test(value)) return 'sentences';
  if (/dialogue|dialog|gespräch/.test(value)) return 'dialogue';
  if (/speaking|sprechen/.test(value)) return 'speaking';
  if (/listening|hören/.test(value)) return 'listening';
  if (/reading|lesen/.test(value)) return 'reading';
  if (/writing|schreiben/.test(value)) return 'writing';
  if (/flashcard|karte/.test(value)) return 'flashcards';
  if (/homework|hausaufgabe/.test(value)) return 'homework';
  if (/revision|review|answer key|scoring/.test(value)) return 'revision';
  return 'lesson';
}

await mkdir(outputDir, { recursive: true });
const manifest = [];

for (let day = 1; day <= 30; day += 1) {
  const open = new RegExp(`<section\\s+id=["']d${day}["'][^>]*>`, 'i').exec(source);
  if (!open) throw new Error(`Day ${day} not found`);
  const start = open.index;
  const end = findBalanced(source, start, 'section');
  const sectionHtml = source.slice(start, end);
  const opening = sectionHtml.slice(0, sectionHtml.indexOf('>') + 1);
  const title = text((/data-title=["']([^"']*)/i.exec(opening) || [,''])[1]);
  const { body, ranges } = directDetails(sectionHtml);
  const first = ranges[0]?.[0] ?? body.length;
  const last = ranges.at(-1)?.[1] ?? first;
  const goal = text((/<p[^>]*class=["'][^"']*\bgoal\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(body) || [,''])[1]);
  const sections = ranges.map(([from, to], index) => {
    const html = body.slice(from, to);
    const summaryHtml = (/<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(html) || [,'Section'])[1];
    const summary = text(summaryHtml);
    return {
      id: `d${day}-s${index + 1}`,
      type: sectionType(summary),
      title: summary,
      html,
      sourceHash: hash(html),
    };
  });
  const payload = {
    schemaVersion: 1,
    day,
    title,
    goal,
    sourceHash: hash(sectionHtml),
    introHtml: body.slice(0, first).trim(),
    sections,
    footerHtml: body.slice(last).trim(),
  };
  const file = `day-${String(day).padStart(2, '0')}.json`;
  await writeFile(resolve(outputDir, file), `${JSON.stringify(payload, null, 2)}\n`);
  manifest.push({
    day,
    title,
    goal,
    file,
    sectionCount: sections.length,
    types: [...new Set(sections.map((section) => section.type))],
    sourceHash: payload.sourceHash,
  });
}

await writeFile(
  resolve(outputDir, 'manifest.json'),
  `${JSON.stringify({ schemaVersion: 1, generatedFrom: 'course-source.html', days: manifest }, null, 2)}\n`,
);

console.log(`Extracted ${manifest.length} days and ${manifest.reduce((sum, day) => sum + day.sectionCount, 0)} typed sections.`);
