export const STATE_KEY = 'ga1:v2';

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
