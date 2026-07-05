import assert from 'node:assert/strict';
import { buildQueue, cardStatus, hardestCards, scheduleCard } from '../assets/srs.js';

const now = new Date('2026-07-05T12:00:00Z');
const learned = scheduleCard({}, 'good', now);
assert.equal(learned.reps, 1);
assert.equal(cardStatus(learned), 'Learning');
const lapsed = scheduleCard(learned, 'again', now);
assert.equal(lapsed.lapses, 1);
assert.ok(new Date(lapsed.due) > now);
const cards = [{id:'a',day:1},{id:'b',day:2},{id:'c',day:8}];
const queue = buildQueue(cards, { a:{reps:1,due:'2026-07-04T00:00:00Z'} }, 2, now.getTime(), 15);
assert.deepEqual(queue.map((card) => card.id), ['a','b']);
const pairedCards = [
  {id:'hello-en',sourceId:'hello',day:1},
  {id:'hello-de',sourceId:'hello',day:1},
  {id:'morning-en',sourceId:'morning',day:1},
  {id:'morning-de',sourceId:'morning',day:1},
];
const pairedQueue = buildQueue(pairedCards, {}, 1, now.getTime(), 15);
assert.notEqual(pairedQueue[0].sourceId, pairedQueue[1].sourceId, 'reverse cards must not appear back-to-back');
assert.equal(hardestCards(cards, {a:{reps:2,lapses:3,difficulty:8},b:{reps:2,lapses:1,difficulty:9}})[0].id, 'a');
console.log('FSRS-lite scheduling, unlocking, due queue and hardest-card ordering verified.');
