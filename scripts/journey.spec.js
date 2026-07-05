const { test, expect } = require('@playwright/test');
const testData = require('../content/tests.json');

test('speaking gates day completion and saved mistakes become actionable review', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { configurable:true, value:undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable:true, value:undefined });
    localStorage.setItem('ga1:v2', JSON.stringify({
      schemaVersion:2,
      completedDays:[],
      sectionProgress:{},
      lastDay:3,
      theme:'dark',
      activityDays:[],
      assessmentComplete:{ 3:true },
    }));
  });
  await page.goto('http://127.0.0.1:8765/?journey-test=1#day/3');

  await page.locator('.complete-day').click();
  await expect(page.locator('.section-card[data-type="speaking"]')).toHaveAttribute('open', '');
  await expect(page.locator('.speaking-status')).toContainText('Make one speaking attempt');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ga1:v2')).completedDays)).toEqual([]);

  await page.locator('.speaking-tasks [data-task="1"]').click();
  await page.locator('.microphone-button').click();
  await expect(page.locator('.speaking-manual')).toBeVisible();
  await page.locator('.speaking-manual textarea').fill('Ich bin dreißig Jahre alt. Ich bin Hunger und ich habe Durst.');
  await page.locator('[data-manual-check]').click();
  await expect(page.locator('.feedback-warning')).toContainText('Ich habe Hunger');
  await page.locator('.speaking-results [data-weak]').click();
  await page.locator('.speaking-results [data-save]').click();

  await expect(page.locator('#lessonSpeakingCopy')).toContainText('Speaking complete');
  await expect(page.locator('.complete-day')).toContainText('Finish this day');
  await page.locator('.complete-day').click();
  await expect(page.locator('#celebration')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ga1:v2')).completedDays)).toContain(3);

  await page.locator('#celebrationHome').click();
  await page.locator('[data-route="stats"]').click();
  await expect(page.locator('#statsView')).toBeVisible();
  await expect(page.locator('#speakingMistakeCount')).toContainText('active');
  const activeBefore = await page.locator('.speaking-mistake:not(.resolved)').count();
  expect(activeBefore).toBeGreaterThan(0);
  const hungerCard = page.locator('.speaking-mistake:not(.resolved)').filter({ hasText:'Ich habe Hunger' }).first();
  await hungerCard.locator('[data-reveal]').click();
  await expect(hungerCard.locator('.mistake-correction')).toContainText('Ich habe Hunger');
  await hungerCard.locator('[data-resolve]').click();
  await expect(page.locator('.speaking-mistake:not(.resolved)')).toHaveCount(activeBefore - 1);
  await expect(page.locator('.resolved-mistakes')).toContainText('1 resolved');
});

test('the lesson assessment opens the exact quiz and a pass returns to the day', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ga1:v2', JSON.stringify({
      schemaVersion:2,
      completedDays:[],
      sectionProgress:{},
      lastDay:1,
      theme:'dark',
      activityDays:[],
      speakingLessons:{ 1:{ complete:true,tasks:{ 0:{ score:90,text:'Hallo, ich heiße Malik.' } } } },
    }));
  });
  await page.goto('http://127.0.0.1:8765/?assessment-test=1#day/1');

  await expect(page.locator('#lessonSpeakingCopy')).toContainText('Speaking complete');
  await expect(page.locator('#lessonAssessmentCopy')).toContainText('Quiz still to do');
  await page.locator('.complete-day').click();
  await expect(page.locator('.lesson-assessment-card')).toBeVisible();
  await page.locator('[data-open-assessment]').click();

  await expect(page.locator('#quizView')).toBeVisible();
  await expect(page.locator('#quizPicker')).toHaveValue('day-1-mini');

  const q1 = page.locator('[data-question="d1-q1"]');
  await q1.locator('input').fill('Auf');
  await q1.locator('[data-check]').click();
  await expect(q1.locator('.quiz-feedback')).toHaveClass(/bad/);
  await q1.locator('input').fill('Auf Wiedersehen');
  await q1.locator('[data-check]').click();
  const q2 = page.locator('[data-question="d1-q2"]');
  await q2.getByRole('button', { name:'"vine"' }).click();
  await expect(q2.getByRole('button', { name:'"vine"' })).toHaveAttribute('aria-pressed','true');
  await q2.locator('[data-check]').click();
  const q3 = page.locator('[data-question="d1-q3"]');
  await q3.getByRole('button', { name:'Guten Abend' }).click();
  await q3.locator('[data-check]').click();
  const q4 = page.locator('[data-question="d1-q4"]');
  await q4.locator('input').fill('Bitte!');
  await q4.locator('[data-check]').click();
  const q5 = page.locator('[data-question="d1-q5"]');
  await q5.locator('input').fill('True');
  await q5.locator('[data-check]').click();
  await page.locator('#finishQuiz').click();

  await expect(page.locator('#quizResult')).toContainText('Lesson check passed');
  await page.locator('[data-return-day="1"]').click();
  await expect(page.locator('#dayView')).toBeVisible();
  await expect(page.locator('#lessonAssessmentCopy')).toContainText('Quiz complete');
  await expect(page.locator('.complete-day')).toContainText('Finish this day');
  await page.locator('.complete-day').click();
  await expect(page.locator('#celebration')).toBeVisible();
  await expect(page.locator('#celebrationNext')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#celebration')).toBeHidden();
  await expect(page.locator('.complete-day')).toBeFocused();
});

test('weekly test days use their original threshold and return to the review day', async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 });
  await page.addInitScript(() => {
    localStorage.setItem('ga1:v2', JSON.stringify({
      schemaVersion:2,
      completedDays:[1,2,3,4,5,6],
      sectionProgress:{},
      lastDay:7,
      theme:'dark',
      activityDays:[],
      speakingLessons:{ 7:{ complete:true,tasks:{ 0:{ score:85,text:'Hallo, ich heiße Malik.' } } } },
    }));
  });
  await page.goto('http://127.0.0.1:8765/?weekly-test=1#day/7');

  await page.locator('.complete-day').click();
  await expect(page.locator('.lesson-assessment-card')).toContainText('30/40 to pass');
  await page.locator('[data-open-assessment]').click();
  await expect(page.locator('#quizPicker')).toHaveValue('weekly-test-1');
  await expect(page.locator('.test-paper')).toContainText('Week 1 test');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const weeklyTest = testData.tests.find((item) => item.day === 7);
  for (const question of weeklyTest.objectiveSections.flatMap((section) => section.questions)) {
    await page.locator(`[data-auto-question="${question.id}"] input`).fill(question.answers[0]);
  }
  await page.locator('[data-grade-objective]').click();
  await expect(page.locator('.objective-result')).toContainText('30/30');
  await page.locator('[data-save-test]').click();
  await expect(page.locator('.answer-panel .quiz-feedback')).toContainText('Passed — 30/40');
  await page.locator('[data-return-day="7"]').click();
  await expect(page.locator('#lessonAssessmentCopy')).toContainText('Quiz complete');
});

test('home and day grid clearly resume the first unfinished lesson section', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ga1:v2', JSON.stringify({
      schemaVersion:2,
      completedDays:[],
      sectionProgress:{ 1:{ 'd1-s1':true } },
      lastDay:1,
      theme:'dark',
      activityDays:['2026-07-05'],
    }));
  });
  await page.goto('http://127.0.0.1:8765/?resume-test=1');

  await expect(page.locator('#continueEyebrow')).toContainText('Continue · Day 1');
  await expect(page.locator('#continueProgress')).toContainText('1/12 sections');
  await expect(page.locator('#continueButton')).toContainText('Continue lesson');
  await page.locator('#continueButton').click();
  await expect(page.locator('#d1-s2')).toHaveAttribute('open', '');

  await page.locator('[data-route="days"]').click();
  await expect(page.locator('[data-day="1"]')).toHaveAttribute('aria-label', /In progress/);
});

test('progress imports are previewed, validated, and reversibly restored', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ga1:v2', JSON.stringify({
      schemaVersion:2,
      completedDays:[1],
      sectionProgress:{ 1:{ 'd1-s1':true } },
      lastDay:2,
      theme:'dark',
      activityDays:['2026-07-05'],
    }));
  });
  await page.goto('http://127.0.0.1:8765/?import-test=1#stats');
  const imported = {
    app:'Deutschweg A1',
    state:{
      schemaVersion:2,
      completedDays:[1,2,3],
      sectionProgress:{ 1:{ 'd1-s1':true },2:{ 'd2-s1':true },3:{ 'd3-s1':true } },
      lastDay:4,
      theme:'light',
      activityDays:['2026-07-03','2026-07-04','2026-07-05'],
      quizResults:[{ day:1,score:4,total:5,percent:80,passed:true }],
    },
  };
  await page.locator('#importProgress').setInputFiles({
    name:'valid-progress.json',
    mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(imported)),
  });
  await expect(page.locator('#importPreview')).toBeVisible();
  await expect(page.locator('#importSummary')).toContainText('3 days');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ga1:v2')).completedDays)).toEqual([1]);

  await page.locator('#confirmImport').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ga1:v2')).completedDays)).toEqual([1,2,3]);
  await expect(page.locator('#recoverImport')).toBeVisible();
  await page.locator('#recoverImport').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ga1:v2')).completedDays)).toEqual([1]);

  await page.locator('#importProgress').setInputFiles({
    name:'invalid-progress.json',
    mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({ schemaVersion:2,completedDays:[99],sectionProgress:{},activityDays:[] })),
  });
  await expect(page.locator('#importFeedback')).toContainText('not a valid Deutschweg progress file');
  await expect(page.locator('#importPreview')).toBeHidden();
});

test('search modal traps focus, closes with Escape, and returns focus to its trigger', async ({ page }) => {
  await page.goto('http://127.0.0.1:8765/?keyboard-test=1');
  await page.locator('#searchButton').click();
  await expect(page.locator('#searchOverlay')).toBeVisible();
  await expect(page.locator('#globalSearch')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#closeSearch')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#searchOverlay')).toBeHidden();
  await expect(page.locator('#searchButton')).toBeFocused();
});

test('choosing a flashcard grade immediately advances to the next card', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ga1:v2', JSON.stringify({
      schemaVersion:2,
      completedDays:[],
      sectionProgress:{},
      lastDay:1,
      theme:'dark',
      activityDays:[],
    }));
  });
  await page.goto('http://127.0.0.1:8765/?flashcard-auto-test=1#flashcards');
  await expect(page.locator('#reviewPrompt')).not.toHaveText('');
  const firstPrompt = await page.locator('#reviewPrompt').textContent();
  await page.locator('#reviewCard').click();
  await expect(page.locator('#reviewAnswer')).toBeVisible();
  await page.locator('#gradeButtons [data-grade="easy"]').click();
  await expect.poll(() => page.locator('#reviewPrompt').textContent()).not.toBe(firstPrompt);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ga1:v2')).cardsReviewed)).toBe(1);
});
