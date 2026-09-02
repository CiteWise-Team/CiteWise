import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Usability Testing: Full CATalyst to CiteWise User Journey', () => {
  const email = process.env.TEST_EMAIL || `testuser_${Date.now()}@example.com`;
  const password = process.env.TEST_PASSWORD || 'testpassword123';

  test('User completes the full workflow', async ({ page }) => {
    test.setTimeout(10 * 60 * 1000);

    // 1. Auth Flow: Register and Login
    await page.goto('/register');

    try {
      await page.fill('input[placeholder="John Doe"]', 'Test User');
      await page.fill('input[placeholder="john@example.com"]', email);
      await page.fill('input[placeholder="••••••••"]', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('Registration skipped or failed, proceeding to login');
    }

    await page.goto('/login');
    await page.fill('input[placeholder="john@example.com"]', email);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.click('button[type="submit"]');

    // Wait for successful login (navigates to /groups or home)
    await expect(page.locator('text=Create Group').or(page.locator('text=My Groups'))).toBeVisible({ timeout: 10000 });

    // 2. Create a Group
    await page.click('button:has-text("Create Group")');
    await page.fill('input[placeholder*="name"]', 'Usability Test Group');
    await page.fill('textarea', 'A group for testing the CiteWise flow');
    await page.click('button:has-text("Create")');

    // Wait for group to appear and click into it
    await page.locator('text=Usability Test Group').first().click();

    // 3. CATalyst Workspace (Extractor -> Summarizer -> Gap -> Topic)
    // Upload initial PDF for Extractor
    const samplePdfPath = path.resolve(__dirname, '../test-data/pdfs/paper_01.pdf');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload")');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(samplePdfPath);

    await page.click('button:has-text("Extract")');
    await expect(page.locator('text=Extraction Complete').or(page.locator('text=Complete'))).toBeVisible({ timeout: 30000 });

    await page.click('button:has-text("Summarize")');
    await expect(page.locator('text=Summary Complete').or(page.locator('text=Complete'))).toBeVisible({ timeout: 30000 });

    await page.locator('button:has-text("Find Gaps")').or(page.locator('button:has-text("Extract Gaps")')).click();
    await expect(page.locator('text=Gaps Identified').or(page.locator('text=Complete'))).toBeVisible({ timeout: 30000 });

    await page.click('button:has-text("Suggest Topic")');
    await expect(page.locator('text=Topic Suggested').or(page.locator('text=Complete'))).toBeVisible({ timeout: 30000 });

    // 4. Transition to CiteWise
    await page.goto('/groups');
    await page.locator('.group-card:has-text("Usability Test Group")').locator('button:has-text("CiteWise")').click();

    await expect(page.locator('text=Data Import')).toBeVisible();

    // 5. CiteWise Step 0: Upload 20 PDFs
    const pdfDir = path.resolve(__dirname, '../test-data/pdfs');
    const pdfFiles = fs.readdirSync(pdfDir).map(file => path.join(pdfDir, file));

    const cwFileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload RRL")');
    const cwFileChooser = await cwFileChooserPromise;
    await cwFileChooser.setFiles(pdfFiles);

    await page.click('button:has-text("Next Step")');

    // 6. CiteWise Step 1: AI Assessment
    await expect(page.locator('text=AI Assessment')).toBeVisible();

    await expect(page.locator('text=Scoring...').first()).toBeHidden({ timeout: 5 * 60 * 1000 });

    const docCards = page.locator('.document-card');
    const count = await docCards.count();

    for (let i = 0; i < count; i++) {
        const card = docCards.nth(i);
        await card.locator('button:has-text("Approve")').click();
    }

    await page.click('button:has-text("Next Step")');

    // 7. CiteWise Step 2: Generate Introduction
    await expect(page.locator('text=Generate Introduction')).toBeVisible();
    await page.click('button:has-text("Generate Draft")');

    await expect(page.locator('.draft-content')).toBeVisible({ timeout: 3 * 60 * 1000 });

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.txt');
  });
});
