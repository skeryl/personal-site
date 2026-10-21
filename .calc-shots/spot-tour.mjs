import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-start-tour]');
await page.locator('[data-start-tour]').scrollIntoViewIfNeeded();
await page.locator('[data-start-tour]').click();
await page.waitForSelector('.driver-popover');
await page.waitForTimeout(500);
await page.screenshot({ path: '.calc-shots/tour-step1.png' });
for (let i = 0; i < 6; i++) {
	await page.locator('.driver-popover-next-btn').click();
	await page.waitForTimeout(300);
}
await page.screenshot({ path: '.calc-shots/tour-debugger.png' });
await browser.close();
console.log('done');
