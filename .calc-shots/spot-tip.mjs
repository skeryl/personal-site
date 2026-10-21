import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('.tooltip');
await page.locator('.tooltip').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.locator('.tooltip').hover({ position: { x: 12, y: 8 } });
await page.waitForTimeout(250);
const box = await page.locator('.tooltip').boundingBox();
await page.screenshot({
	path: '.calc-shots/tip.png',
	clip: { x: box.x - 260, y: box.y - 90, width: 640, height: 190 }
});
await browser.close();
console.log('done');
