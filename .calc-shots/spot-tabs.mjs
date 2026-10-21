import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	page.on('dialog', (d) => d.accept('My margin check'));
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	await page.locator('[data-tab="library"]').click();
	await page.screenshot({ path: `${DIR}spot-tabs-library.png` });
	// Load one without a dialog (clean tree), then edit and save
	await page.locator('[data-calc-load="consensus-grade"]').click();
	await page.screenshot({ path: `${DIR}spot-tabs-results.png` });
	await page.locator('[data-save-calc]').isEnabled().then((v) => console.log('save enabled:', v));
	await browser.close();
};
run();
