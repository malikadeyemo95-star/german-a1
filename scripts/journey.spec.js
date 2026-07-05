const { test, expect } = require('@playwright/test');

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
