import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	page.on('dialog', (d) => d.accept());
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	await page.locator('[data-tab="library"]').click();
	await page.locator('[data-lib-row="avg-credit-score"]').hover();
	await page.screenshot({ path: `${DIR}spot-polish-library.png` });
	await page.locator('[data-calc-load="moodys-grade"]').click();
	await page.locator('[data-op-select="on/input.0"]').isVisible().catch(() => {});
	await page.screenshot({ path: `${DIR}spot-polish-loaded.png` });
	console.log('title:', await page.getByLabel('Calculation name').inputValue());
	await browser.close();
};
run();
