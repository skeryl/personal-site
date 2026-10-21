import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('.tooltip');
await page.locator('.tooltip').scrollIntoViewIfNeeded();
await page.locator('.tooltip').hover();
await page.waitForTimeout(300);
const info = await page.evaluate(() => {
	const el = document.querySelector('.tooltip');
	const after = getComputedStyle(el, '::after');
	return {
		dataTip: el.getAttribute('data-tip'),
		content: after.content,
		opacity: after.opacity,
		hoverMatches: el.matches(':hover'),
		position: getComputedStyle(el).position
	};
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
