import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');
await page.locator('.side-panel').scrollIntoViewIfNeeded();
const panel = await page.locator('.side-panel').boundingBox();
await page.screenshot({
	path: '.calc-shots/reset-row.png',
	clip: { x: panel.x - 10, y: Math.max(0, panel.y - 10), width: panel.width + 20, height: Math.min(1050, panel.height + 20) }
});
await browser.close();
console.log('done');
