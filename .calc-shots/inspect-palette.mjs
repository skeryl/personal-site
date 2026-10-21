import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-palette-filter]');
await page.locator('.tool-grid').scrollIntoViewIfNeeded();
const info = await page.evaluate(() => {
	const palette = document.querySelector('.palette');
	const top = document.querySelector('.palette-top');
	const cs = getComputedStyle(palette);
	const csTop = getComputedStyle(top);
	return {
		position: cs.position,
		maxHeight: cs.maxHeight,
		overflowY: cs.overflowY,
		scrollTop: palette.scrollTop,
		paletteRect: palette.getBoundingClientRect().toJSON(),
		topRect: top.getBoundingClientRect().toJSON(),
		topPosition: csTop.position,
		pageScrollY: scrollY
	};
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
