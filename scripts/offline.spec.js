const { test, expect } = require('@playwright/test');

test('the complete shell and Day 30 remain available offline', async ({ page, context }) => {
  await page.goto('http://127.0.0.1:8765/?offline-test=1');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#homeTitle')).toContainText('One useful step');
  await page.goto('http://127.0.0.1:8765/?offline-test=1#day/30');
  await expect(page.locator('.lesson-heading h1')).toContainText('Final A1 Mock Exam');
  await expect(page.locator('.speaking-coach')).toHaveCount(1);
  await expect(page.locator('#connectionStatus')).toContainText('Offline');
  await context.setOffline(false);
});
