const DAY = 86_400_000;

export function cardStatus(record) {
  if (!record?.reps) return 'New';
  if (record.reps < 3) return 'Learning';
  if ((record.stability || 0) >= 30) return 'Mastered';
  return 'Review';
}

export function isDue(record, now = Date.now()) {
  return !record?.due || new Date(record.due).getTime() <= now;
}

export function scheduleCard(previous = {}, grade, now = new Date()) {
  const record = {
    reps: previous.reps || 0,
    lapses: previous.lapses || 0,
    stability: previous.stability || 0,
    difficulty: previous.difficulty || 5,
    ...previous,
  };
  let intervalDays;
  if (grade === 'again') {
    record.lapses += 1;
    record.stability = Math.max(.2, record.stability * .45 || .2);
    record.difficulty = Math.min(10, record.difficulty + .8);
    record.due = new Date(now.getTime() + 10 * 60_000).toISOString();
  } else {
    const factor = grade === 'hard' ? 1.25 : grade === 'easy' ? 3.2 : 2.2;
    const base = record.stability || (grade === 'hard' ? .5 : grade === 'easy' ? 4 : 1);
    record.stability = Math.min(365, Math.max(.5, base * factor));
    record.difficulty = Math.max(1, Math.min(10, record.difficulty + (grade === 'hard' ? .25 : grade === 'easy' ? -.45 : -.15)));
    intervalDays = Math.max(1, Math.round(record.stability));
    record.due = new Date(now.getTime() + intervalDays * DAY).toISOString();
  }
  record.reps += 1;
  record.lastReview = now.toISOString();
  record.lastGrade = grade;
  return record;
}

export function buildQueue(cards, records, unlockedDay, now = Date.now(), newLimit = 15) {
  const unlocked = cards.filter((card) => card.day <= unlockedDay);
  const due = unlocked.filter((card) => records[card.id]?.reps && isDue(records[card.id], now));
  const fresh = unlocked.filter((card) => !records[card.id]?.reps).slice(0, newLimit);
  const remaining = [...due.sort((a, b) => new Date(records[a.id].due) - new Date(records[b.id].due)), ...fresh];
  const queue = [];
  const GAP = 4; // a card and its reverse twin must sit at least this far apart
  while (remaining.length) {
    const recent = queue.slice(-GAP).map((card) => card.sourceId);
    let nextIndex = remaining.findIndex((card) => !recent.includes(card.sourceId));
    if (nextIndex < 0) {
      // no card qualifies: pick the one whose twin appeared longest ago
      let bestAge = -1;
      nextIndex = 0;
      remaining.forEach((card, index) => {
        const lastSeen = queue.map((q) => q.sourceId).lastIndexOf(card.sourceId);
        const age = lastSeen < 0 ? Infinity : queue.length - lastSeen;
        if (age > bestAge) { bestAge = age; nextIndex = index; }
      });
    }
    queue.push(remaining.splice(nextIndex, 1)[0]);
  }
  return queue;
}

export function hardestCards(cards, records, limit = 10) {
  return cards
    .filter((card) => records[card.id]?.reps)
    .sort((a, b) => (records[b.id].lapses || 0) - (records[a.id].lapses || 0) || (records[b.id].difficulty || 0) - (records[a.id].difficulty || 0))
    .slice(0, limit);
}
