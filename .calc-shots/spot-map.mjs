import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	page.on('dialog', (d) => d.accept());
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	await page.locator('[data-preset="avg-rating-grade"]').click();
	await page.screenshot({ path: `${DIR}spot-map-preset.png` });
	await page.locator('[data-remove="root"]').click();
	await page.locator('[data-op-id="map"]').click();
	await page.locator('[data-field-id="instrument.creditRatings"]').click();
	await page.screenshot({ path: `${DIR}spot-map-scope.png` });
	await browser.close();
};
run();
