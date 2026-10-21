import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');
const dsl = page.getByLabel('Calculation expression');
await dsl.fill('@consensus-grade > 10');
await dsl.press('Enter');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.locator('.palette').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const clip = await page.locator('.palette').boundingBox();
await page.screenshot({
	path: '.calc-shots/palette-complete.png',
	clip: { x: clip.x - 6, y: Math.max(0, clip.y - 6), width: clip.width + 12, height: Math.min(1050, clip.height + 12) }
});
await browser.close();
console.log('done');
