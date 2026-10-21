import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-present]');
await page.locator('[data-present]').click();
for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
await page.waitForSelector('.code');
const info = await page.evaluate(() => {
	const pre = document.querySelector('.code');
	const cs = getComputedStyle(pre);
	return {
		whiteSpace: cs.whiteSpace,
		display: cs.display,
		newlines: (pre.textContent.match(/\n/g) || []).length,
		html: pre.innerHTML.slice(0, 200)
	};
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
