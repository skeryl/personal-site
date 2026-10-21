import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	page.on('dialog', (d) => d.accept());
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	await page.locator('[data-preset="moodys-grade"]').click();
	await page.locator('.hero').scrollIntoViewIfNeeded();
	await page.screenshot({ path: `${DIR}spot-preset.png` });
	await page.locator('[data-remove="root"]').click();
	await page.locator('[data-op-id="lookupString"]').click();
	await page.locator('[data-field-id="instrument.creditRatings"]').click();
	await page.locator('[data-suggestion="agency"]').click();
	await page.screenshot({ path: `${DIR}spot-suggestions.png` });
	await browser.close();
};
run();
