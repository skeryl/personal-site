import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('.prose .code-block');
await page.locator('.prose .code-block').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const box = await page.locator('.prose .code-block').first().boundingBox();
await page.screenshot({
	path: '.calc-shots/java-article.png',
	clip: { x: 0, y: Math.max(0, box.y - 240), width: 1680, height: 950 }
});
await browser.close();
console.log('done');
