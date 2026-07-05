import assert from 'node:assert/strict';
import { STATE_KEY, migrateLegacyState } from '../assets/state.js';

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

console.log('Legacy ga1done/ga1x migration and existing v2 preservation verified.');
