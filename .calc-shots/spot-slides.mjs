import { chromium } from '@playwright/test';

const base = 'http://localhost:4173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + '/journal/calc-builder');
await page.waitForSelector('[data-present]');
await page.locator('[data-present]').click();
await page.waitForSelector('[data-slide-deck]');
for (let i = 0; i < 16; i++) {
	await page.waitForTimeout(650);
	await page.screenshot({ path: `.calc-shots/slide-${String(i).padStart(2, '0')}.png` });
	await page.keyboard.press('ArrowRight');
}
await browser.close();
console.log('done');
