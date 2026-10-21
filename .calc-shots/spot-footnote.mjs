import { chromium } from '@playwright/test';
const browser = await chromium.launch();
for (const [name, width] of [['wide', 1680], ['narrow', 1100]]) {
	const page = await (await browser.newContext({ viewport: { width, height: 1000 } })).newPage();
	await page.goto('http://localhost:4173/journal/calc-builder');
	await page.waitForSelector('.footnote');
	await page.locator('.footnote').first().scrollIntoViewIfNeeded();
	await page.waitForTimeout(600);
	const box = await page.locator('[data-article-section="calculations-as-data"]').boundingBox();
	await page.screenshot({
		path: `.calc-shots/footnote-${name}.png`,
		clip: { x: 0, y: Math.max(0, box.y + box.height - 900), width, height: 620 }
	});
	await page.context().close();
}
await browser.close();
console.log('done');
