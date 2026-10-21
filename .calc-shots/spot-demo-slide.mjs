import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 1150 } });
await page.goto('http://localhost:4173/journal/calc-builder#slides-8');
await page.waitForSelector('[data-slide="7"] [data-slot-path="root"], [data-slide="7"] [data-node-path="root"]');
await page.waitForTimeout(400);
const metrics = await page.evaluate(() => {
	const fill = document.querySelector('.demo-fill');
	return {
		fillScrolls: fill.scrollHeight > fill.clientHeight + 1,
		fillScrollHeight: fill.scrollHeight,
		fillClientHeight: fill.clientHeight,
		explorationWidth: document.querySelector('.exploration').getBoundingClientRect().width
	};
});
console.log(JSON.stringify(metrics));
await page.screenshot({ path: '.calc-shots/demo-slide-wide.png' });
await browser.close();
