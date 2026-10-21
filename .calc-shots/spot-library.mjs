import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	page.on('dialog', (d) => d.accept('My saved calc'));
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	await page.locator('[data-calc-load="consensus-grade"]').click();
	await page.screenshot({ path: `${DIR}spot-library-consensus.png` });
	console.log('bar:', await page.getByLabel('Calculation expression').inputValue());
	console.log('results:', await page.locator('.result-value').allTextContents());
	// Popover with the Library section
	await page.locator('[data-node-path="input.0/input.0"] .leaf-btn').click();
	await page.waitForSelector('[data-menu-calc]');
	await page.screenshot({ path: `${DIR}spot-library-menu.png` });
	await browser.close();
};
run();
