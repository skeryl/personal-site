import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	page.on('dialog', (d) => d.accept());
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	// Popover on the root slot
	await page.locator('[data-slot-path="root"]').click();
	await page.waitForSelector('[data-slot-menu]');
	await page.screenshot({ path: `${DIR}spot-popover-root.png` });
	// Popover with suggestions inside a lookup
	await page.locator('[data-menu-op="avg"]').click();
	await page.locator('[data-slot-path="input.0"]').click();
	await page.locator('[data-menu-op="pluck"]').click();
	await page.locator('[data-slot-path="input.0/input.0"]').click();
	await page.locator('[data-menu-field="instrument.creditRatings"]').click();
	await page.locator('[data-slot-path="input.0/input.1"]').click();
	await page.waitForSelector('[data-menu-suggestion="score"]');
	await page.screenshot({ path: `${DIR}spot-popover-suggest.png` });
	console.log('done');
	await browser.close();
};
run();
