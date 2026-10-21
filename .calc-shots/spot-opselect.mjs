import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	page.on('dialog', (d) => d.accept());
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	await page.locator('[data-preset="avg-credit-score"]').click();
	await page.locator('[data-op-select="root"]').hover();
	await page.screenshot({ path: `${DIR}spot-opselect.png`, clip: { x: 340, y: 300, width: 700, height: 320 } });
	const options = await page.locator('[data-op-select="root"] option').allTextContents();
	console.log('root options:', options.join(' | '));
	await page.locator('[data-op-select="root"]').selectOption('min');
	console.log('after swap:', await page.getByLabel('Calculation expression').inputValue());
	console.log('results:', await page.locator('.result-value').allTextContents());
	await browser.close();
};
run();
