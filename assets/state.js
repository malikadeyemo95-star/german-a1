export const STATE_KEY = 'ga1:v2';

export function shiftedDateKey(value = new Date(), rolloverHour = 4) {
  const date = new Date(value);
  date.setHours(date.getHours() - rolloverHour);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function calculateStreak(activityDays, now = new Date()) {
  const days = [...new Set(activityDays || [])].sort().reverse();
  if (!days.length) return 0;
  const today = shiftedDateKey(now);
  const yesterday = shiftedDateKey(new Date(now.getTime() - 86_400_000));
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const newer = new Date(`${days[index - 1]}T12:00:00`);
    const older = new Date(`${days[index]}T12:00:00`);
    if (Math.round((newer - older) / 86_400_000) !== 1) break;
    streak += 1;
  }
  return streak;
}

export function validateImportedState(value) {
  if (!value || value.schemaVersion !== 2) return false;
  if (!Array.isArray(value.completedDays) || !Array.isArray(value.activityDays)) return false;
  if (!value.sectionProgress || typeof value.sectionProgress !== 'object') return false;
  return value.completedDays.every((day) => Number.isInteger(day) && day >= 1 && day <= 30);
}

export function migrateLegacyState(storage, now = new Date()) {
  let current;
  try { current = JSON.parse(storage.getItem(STATE_KEY) || 'null'); } catch {}
  if (current?.schemaVersion === 2) return current;

  let legacyDone = {};
  let legacyX = {};
  try { legacyDone = JSON.parse(storage.getItem('ga1done') || '{}'); } catch {}
  try { legacyX = JSON.parse(storage.getItem('ga1x') || '{}'); } catch {}

  const completedDays = Object.keys(legacyDone)
    .filter((day) => legacyDone[day])
    .map(Number)
    .filter((day) => day >= 1 && day <= 30);
  const lastDay = Number(String(legacyX.lastDay || '').replace('d', '')) || null;
  const state = {
    schemaVersion: 2,
    completedDays,
    sectionProgress: {},
    lastDay,
    theme: legacyX.settings?.light ? 'light' : 'dark',
    activityDays: legacyX.lastStudy ? [legacyX.lastStudy] : [],
    migratedAt: now.toISOString(),
    legacySnapshot: {
      doneKeyFound: Object.keys(legacyDone).length > 0,
      xKeyFound: Boolean(legacyX.v),
    },
  };
  storage.setItem(STATE_KEY, JSON.stringify(state));
  return state;
}
