export const STATE_KEY = 'ga1:v2';
export const RECOVERY_KEY = 'ga1:v2:pre-import';

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
  const record = (item) => item && typeof item === 'object' && !Array.isArray(item);
  const day = (item) => Number.isInteger(item) && item >= 1 && item <= 30;
  const finite = (item) => Number.isFinite(item);
  const date = (item) => typeof item === 'string' && item.length <= 40;
  const safeKeys = (item, depth = 0) => {
    if (depth > 8 || item == null || typeof item !== 'object') return depth <= 8;
    if (Object.keys(item).some((key) => ['__proto__','prototype','constructor'].includes(key))) return false;
    return Object.values(item).every((child) => safeKeys(child, depth + 1));
  };
  if (!record(value) || value.schemaVersion !== 2 || !safeKeys(value)) return false;
  if (!Array.isArray(value.completedDays) || value.completedDays.length > 30 || !value.completedDays.every(day)) return false;
  if (!Array.isArray(value.activityDays) || value.activityDays.length > 5000 || !value.activityDays.every(date)) return false;
  if (!record(value.sectionProgress) || Object.keys(value.sectionProgress).length > 30) return false;
  if (!Object.entries(value.sectionProgress).every(([key, sections]) =>
    day(Number(key)) && record(sections) && Object.keys(sections).length <= 50 &&
    Object.entries(sections).every(([id, done]) => id.length <= 100 && done === true))) return false;
  if (value.lastDay != null && !day(value.lastDay)) return false;
  if (value.theme != null && !['dark','light'].includes(value.theme)) return false;
  for (const key of ['quizResults','testResults']) {
    if (value[key] != null && (!Array.isArray(value[key]) || value[key].length > 5000 || !value[key].every((result) =>
      record(result) && day(result.day) && finite(result.score) && finite(result.total) && finite(result.percent) &&
      result.score >= 0 && result.total > 0 && result.score <= result.total && result.percent >= 0 && result.percent <= 100))) return false;
  }
  if (value.activityLog != null && (!Array.isArray(value.activityLog) || value.activityLog.length > 10000 || !value.activityLog.every(date))) return false;
  for (const key of ['listeningMistakes','customCards','speakingWeakList']) {
    if (value[key] != null && (!Array.isArray(value[key]) || value[key].length > 10000 || !value[key].every(record))) return false;
  }
  if (value.cardsReviewed != null && (!Number.isInteger(value.cardsReviewed) || value.cardsReviewed < 0)) return false;
  if (value.srs != null && (!record(value.srs) || Object.keys(value.srs).length > 10000 ||
    !Object.values(value.srs).every((entry) => record(entry) && Object.values(entry).every((item) => typeof item !== 'number' || finite(item))))) return false;
  if (value.assessmentComplete != null && (!record(value.assessmentComplete) || Object.keys(value.assessmentComplete).length > 30 ||
    !Object.entries(value.assessmentComplete).every(([key, complete]) => day(Number(key)) && complete === true))) return false;
  if (value.speakingLessons != null && (!record(value.speakingLessons) || Object.keys(value.speakingLessons).length > 30 ||
    !Object.entries(value.speakingLessons).every(([key, lesson]) => day(Number(key)) && record(lesson)))) return false;
  return JSON.stringify(value).length <= 5_000_000;
}

export function normalizeImportedState(value) {
  if (!validateImportedState(value)) throw new Error('Invalid Deutschweg state');
  const known = [
    'lastDay','activityLog','assessmentComplete','cardsReviewed','customCards','listeningMistakes',
    'quizResults','speakingLessons','speakingWeakList','srs','testResults','migratedAt','legacySnapshot',
  ];
  const normalized = {
    schemaVersion:2,
    completedDays:[...new Set(value.completedDays)].sort((a,b) => a - b),
    activityDays:[...new Set(value.activityDays)].sort(),
    sectionProgress:value.sectionProgress,
    theme:value.theme === 'light' ? 'light' : 'dark',
  };
  known.forEach((key) => { if (value[key] != null) normalized[key] = value[key]; });
  return normalized;
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
