import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TEST_DEFINITIONS } from './test-definitions.mjs';

const root = resolve(import.meta.dirname, '..');
const tests = [];

for (const dayNumber of [7, 14, 21, 28, 30]) {
  const day = JSON.parse(await readFile(resolve(root, 'content', `day-${String(dayNumber).padStart(2, '0')}.json`), 'utf8'));
  const key = day.sections.find((section) => /answer key/i.test(section.title));
  const taskSections = dayNumber === 30
    ? day.sections.filter((section) => ['listening','reading','writing','speaking'].includes(section.type))
    : day.sections.filter((section) => /\btest \d\b/i.test(section.title) && !/answer key/i.test(section.title));
  if (!key || !taskSections.length) throw new Error(`Could not model Test Day ${dayNumber}`);
  const definition = TEST_DEFINITIONS[dayNumber];
  const objectiveSections = definition.objectiveSections.map((section, sectionIndex) => ({
    ...section,
    questions:section.questions.map((question, questionIndex) => ({
      id:`d${dayNumber}-auto-${sectionIndex + 1}-${questionIndex + 1}`,
      ...question,
    })),
  }));
  const objectiveMax = objectiveSections.flatMap((section) => section.questions).reduce((sum, question) => sum + question.points, 0);
  const selfMax = definition.selfSections.reduce((sum, section) => sum + section.maxScore, 0);
  const maxScore = dayNumber === 30 ? 60 : 40;
  if (objectiveMax + selfMax !== maxScore) throw new Error(`Test Day ${dayNumber} scoring adds to ${objectiveMax + selfMax}, expected ${maxScore}`);
  tests.push({
    id: dayNumber === 30 ? 'a1-mock-exam' : `weekly-test-${dayNumber / 7}`,
    day: dayNumber,
    title: dayNumber === 30 ? 'Full A1 mock exam' : `Week ${dayNumber / 7} test`,
    maxScore,
    passScore: dayNumber === 30 ? 36 : 30,
    taskHtml: taskSections.map((section) => section.html),
    keyHtml: key.html,
    objectiveSections,
    objectiveMax,
    selfSections:definition.selfSections,
    selfMax,
  });
}

await writeFile(resolve(root, 'content/tests.json'), `${JSON.stringify({ schemaVersion:1, tests }, null, 2)}\n`);
console.log('Generated four weekly tests and the Day 30 mock exam.');
