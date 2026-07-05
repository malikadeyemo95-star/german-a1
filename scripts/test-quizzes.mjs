import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const quizData = JSON.parse(await readFile(new URL('../content/quizzes.json', import.meta.url), 'utf8'));
const testData = JSON.parse(await readFile(new URL('../content/tests.json', import.meta.url), 'utf8'));
assert.equal(quizData.quizzes.length, 25);
assert.equal(quizData.quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0), 125);
assert.ok(quizData.quizzes.every((quiz) => quiz.questions.every((question) => question.prompt && question.answer && question.explanation)));
assert.ok(quizData.quizzes.flatMap((quiz) => quiz.questions).some((question) => question.type === 'choice'));
assert.ok(quizData.quizzes.flatMap((quiz) => quiz.questions).some((question) => question.type === 'reorder' && question.tokens.length > 1));
assert.deepEqual(testData.tests.map((test) => test.day), [7, 14, 21, 28, 30]);
assert.ok(testData.tests.every((test) => test.taskHtml.length && test.keyHtml && test.passScore < test.maxScore));
const assessmentDays = new Set([...quizData.quizzes.map((quiz) => quiz.day), ...testData.tests.map((test) => test.day)]);
assert.deepEqual([...assessmentDays].sort((a,b) => a - b), Array.from({ length:30 }, (_, index) => index + 1));
for (const day of assessmentDays) {
  const payload = JSON.parse(await readFile(new URL(`../content/day-${String(day).padStart(2,'0')}.json`, import.meta.url), 'utf8'));
  const assessmentSection = day === 30
    ? payload.sections.find((section) => /how to run your mock exam/i.test(section.title))
    : payload.sections.find((section) => section.type === 'quiz' && !/answer key/i.test(section.title) && (/mini quiz/i.test(section.title) || /\btest\s*\d/i.test(section.title)));
  assert.ok(assessmentSection,`Day ${day} has no assessment journey section`);
  assert.ok(payload.sections.filter((section) => /example sentences/i.test(section.title)).every((section) => section.type === 'sentences'),`Day ${day} misclassifies example sentences`);
}
console.log('Verified all 30 lesson assessments, 125 explained questions, four weekly tests and the Day 30 mock exam.');
