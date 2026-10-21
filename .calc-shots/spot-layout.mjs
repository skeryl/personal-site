import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 1150 } });
await page.goto('http://localhost:4173/journal/calc-builder#slides-8');
await page.waitForSelector('[data-slide="7"] [data-tab="library"]');
await page.waitForTimeout(400);
const metrics = await page.evaluate(() => {
	const tabs = [...document.querySelectorAll('.side-tabs .tab')];
	const tops = new Set(tabs.map((tab) => tab.getBoundingClientRect().top));
	const palette = document.querySelector('.palette');
	return {
		tabRows: tops.size,
		paletteXScroll: palette.scrollWidth > palette.clientWidth + 1,
		paletteWidth: palette.clientWidth
	};
});
console.log(JSON.stringify(metrics));
await page.screenshot({ path: '.calc-shots/layout-wide.png' });
await browser.close();
