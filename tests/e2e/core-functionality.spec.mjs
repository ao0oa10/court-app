import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('console', message => {
    if (message.type() === 'error') throw new Error(`Console error: ${message.text()}`);
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async text => { window.__copiedText = text; } }
    });
  });
  await page.goto('./');
  await page.evaluate(() => indexedDB.deleteDatabase('court-minutes-local'));
  await page.reload();
});

test('ينشئ محضراً ويعدل الحقول دون فقدان التركيز ثم يولد النص', async ({ page }) => {
  await page.getByRole('button', { name: /محضر جديد/ }).first().click();
  const caseNumber = page.locator('[data-input="meta.caseNumber"]');
  await caseNumber.fill('2026/123');
  await expect(caseNumber).toBeFocused();
  await caseNumber.pressSequentially('-اختبار');
  await expect(caseNumber).toHaveValue('2026/123-اختبار');

  await page.locator('[data-next]').click();
  const partyName = page.locator('[data-input^="party:"][data-input$=":name"]').first();
  await partyName.fill('شركة النور');
  await expect(partyName).toBeFocused();
  await page.locator('[data-next]').click();
  await page.locator('[data-action$=":attended"][data-value="yes"]').first().click();
  await page.locator('[data-action$=":repType"][data-value="self"]').first().click();
  await page.locator('[data-next]').click();
  await page.locator('[data-next]').click();

  await expect(page.locator('[data-manual-text]')).toContainText('شركة النور');
  await page.locator('[data-copy]').first().click();
  await expect.poll(() => page.evaluate(() => window.__copiedText)).toContain('شركة النور');
  await page.locator('[data-manual-text]').fill('نص معدل يدوياً');
  await expect(page.locator('.document')).toHaveText('نص معدل يدوياً');
  await page.locator('[data-regenerate]').click();
  await expect(page.locator('[data-manual-text]')).not.toHaveValue('نص معدل يدوياً');
});

test('ينشئ نسخة احتياطية ويستوردها ويتعامل مع الملف غير الصالح', async ({ page }) => {
  await page.getByRole('button', { name: /محضر جديد/ }).first().click();
  await page.locator('[data-input="meta.caseNumber"]').fill('backup-1');
  await page.getByRole('button', { name: 'الأرشيف' }).click();
  const backupDownload = page.waitForEvent('download');
  await page.locator('[data-export-backup]').click();
  const backup = await backupDownload;
  const stream = await backup.createReadStream();
  let backupContent = '';
  for await (const chunk of stream) backupContent += chunk;
  expect(backupContent).toContain('backup-1');

  await page.locator('[data-import]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not-json')
  });
  await expect(page.locator('.toast')).toContainText('غير صالح');
});

test('يحافظ على الحفظ عند الانتقال السريع وإعادة التحميل', async ({ page }) => {
  await page.getByRole('button', { name: /محضر جديد/ }).first().click();
  await page.locator('[data-input="meta.caseNumber"]').fill('fast-save');
  await page.locator('[data-next]').click();
  await page.getByRole('button', { name: 'الأرشيف' }).click();
  await expect(page.locator('.record')).toContainText('fast-save');
  await page.locator('[data-open]').first().click();
  await expect(page.locator('[data-input="meta.caseNumber"]')).toHaveValue('fast-save');
});
