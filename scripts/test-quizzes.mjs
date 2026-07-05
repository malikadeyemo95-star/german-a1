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
console.log('Verified 25 mini quizzes, 125 explained questions, four weekly tests and the Day 30 mock exam.');
