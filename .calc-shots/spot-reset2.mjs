import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-reset-all]');
await page.locator('[data-reset-all]').scrollIntoViewIfNeeded();
const box = await page.locator('[data-reset-all]').boundingBox();
await page.screenshot({
	path: '.calc-shots/reset-row2.png',
	clip: { x: box.x - 40, y: box.y - 120, width: 560, height: 260 }
});
await browser.close();
console.log('done');
