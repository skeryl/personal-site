import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1250 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-present]');
await page.locator('[data-present]').click();
await page.waitForSelector('[data-slide-deck]');
for (const target of [1, 2, 7, 9]) {
	await page.keyboard.press('Home');
	for (let i = 0; i < target; i++) await page.keyboard.press('ArrowRight');
	await page.waitForTimeout(650);
	await page.screenshot({ path: `.calc-shots/tall-${target}.png` });
}
await browser.close();
console.log('done');
