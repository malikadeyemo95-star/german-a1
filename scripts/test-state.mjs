import assert from 'node:assert/strict';
import { STATE_KEY, calculateStreak, migrateLegacyState, normalizeImportedState, shiftedDateKey, validateImportedState } from '../assets/state.js';

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
}

const legacy = new MemoryStorage();
legacy.setItem('ga1done', JSON.stringify({ 1: true, 2: true, 3: false, 30: true, 99: true }));
legacy.setItem('ga1x', JSON.stringify({ v: 1, lastDay: 'd4', lastStudy: '2026-07-04', settings: { light: true } }));
const migrated = migrateLegacyState(legacy, new Date('2026-07-05T00:00:00Z'));
assert.deepEqual(migrated.completedDays, [1, 2, 30]);
assert.equal(migrated.lastDay, 4);
assert.equal(migrated.theme, 'light');
assert.deepEqual(migrated.activityDays, ['2026-07-04']);
assert.equal(JSON.parse(legacy.getItem(STATE_KEY)).schemaVersion, 2);

const existing = new MemoryStorage();
existing.setItem(STATE_KEY, JSON.stringify({ schemaVersion: 2, completedDays: [7], sectionProgress: {} }));
assert.deepEqual(migrateLegacyState(existing).completedDays, [7]);
assert.equal(shiftedDateKey(new Date('2026-07-05T02:00:00+02:00')), '2026-07-04');
assert.equal(calculateStreak(['2026-07-02','2026-07-03','2026-07-04'], new Date('2026-07-05T02:00:00+02:00')), 3);
assert.equal(validateImportedState(migrated), true);
assert.equal(validateImportedState({ schemaVersion:2,completedDays:[99],activityDays:[],sectionProgress:{} }), false);
assert.equal(validateImportedState({ schemaVersion:2,completedDays:[],activityDays:[42],sectionProgress:{} }), false);
assert.equal(validateImportedState({ schemaVersion:2,completedDays:[],activityDays:[],sectionProgress:{ 99:{ x:true } } }), false);
assert.equal(validateImportedState({ schemaVersion:2,completedDays:[],activityDays:[],sectionProgress:{},quizResults:[{day:1,score:6,total:5,percent:120}] }), false);
assert.equal(validateImportedState(JSON.parse('{"schemaVersion":2,"completedDays":[],"activityDays":[],"sectionProgress":{},"__proto__":{"polluted":true}}')), false);
const normalized = normalizeImportedState({ schemaVersion:2,completedDays:[2,1,2],activityDays:['2026-07-02','2026-07-02'],activityLog:['2026-07-02T12:00:00.000Z'],sectionProgress:{ 1:{ 'd1-s1':true } },speakingLessons:{ 1:{ complete:true,tasks:{} } },theme:'light',unknown:'discard me' });
assert.deepEqual(normalized.completedDays,[1,2]);
assert.deepEqual(normalized.activityDays,['2026-07-02']);
assert.equal(normalized.theme,'light');
assert.deepEqual(normalized.activityLog,['2026-07-02T12:00:00.000Z']);
assert.equal('unknown' in normalized,false);

console.log('Legacy migration, shift-day streaks, strict import validation and normalization verified.');
