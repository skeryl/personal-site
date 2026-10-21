import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');
await page.locator('.tool-grid').scrollIntoViewIfNeeded();
const info = await page.evaluate(() => {
	const palette = document.querySelector('.palette');
	palette.scrollTop = palette.scrollHeight;
	const literals = document.querySelector('[data-literal="true"]');
	const litRect = literals?.getBoundingClientRect();
	const palRect = palette.getBoundingClientRect();
	return {
		scrollTop: palette.scrollTop,
		scrollHeight: palette.scrollHeight,
		clientHeight: palette.clientHeight,
		offsetHeight: palette.offsetHeight,
		maxScroll: palette.scrollHeight - palette.clientHeight,
		palTop: palRect.top,
		palBottom: palRect.bottom,
		litTop: litRect?.top,
		litVisible: litRect ? litRect.top < innerHeight && litRect.bottom > 0 : null,
		vh: innerHeight
	};
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
