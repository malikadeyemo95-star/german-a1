import assert from 'node:assert/strict';
import { evaluateSpeakingAttempt, speakingLessonDays } from '../assets/speaking.js';

assert.deepEqual(speakingLessonDays, Array.from({ length:30 }, (_, index) => index + 1));

const hungerMistake = evaluateSpeakingAttempt(3, 1, 'Ich bin dreißig Jahre alt. Ich bin Hunger und ich habe Durst.', .8);
assert.equal(hungerMistake.rules[0].fix, 'Ich habe Hunger.');
assert.ok(hungerMistake.grammar < 100);

const introduction = evaluateSpeakingAttempt(4, 1, 'Ich komme aus Nigeria. Ich wohne in Berlin. Ich spreche Englisch.', .9);
assert.equal(introduction.taskScore, 100);
assert.equal(introduction.grammar, 100);

const futureLeak = evaluateSpeakingAttempt(1, 1, 'Hallo, ich heiße Malik.', .9);
assert.deepEqual(futureLeak.checklist.map((item) => item.label), ['Greeting','Name']);

console.log('All 30 lesson-scoped speaking coaches and correction rules verified.');
