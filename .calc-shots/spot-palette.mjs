import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-palette-filter]');
const tool = page.locator('.tool-grid');
await tool.scrollIntoViewIfNeeded();
await page.screenshot({ path: '.calc-shots/palette-default.png' });
await page.locator('[data-group-toggle="compare"]').click();
await page.locator('[data-group-toggle="arithmetic"]').click();
await page.waitForTimeout(150);
const clip = await page.locator('.palette').boundingBox();
await page.screenshot({
	path: '.calc-shots/palette-collapsed.png',
	clip: { x: clip.x - 6, y: Math.max(0, clip.y - 6), width: clip.width + 12, height: Math.min(870, clip.height + 12) }
});
await page.locator('[data-palette-filter]').fill('rating');
await page.waitForTimeout(150);
const clip2 = await page.locator('.palette').boundingBox();
await page.screenshot({
	path: '.calc-shots/palette-filtered.png',
	clip: { x: clip2.x - 6, y: Math.max(0, clip2.y - 6), width: clip2.width + 12, height: Math.min(870, clip2.height + 12) }
});
await browser.close();
console.log('done');
