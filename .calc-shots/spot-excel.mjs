import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.locator('[data-figure-incident]').scrollIntoViewIfNeeded();
	await page.waitForTimeout(650);
	await page.screenshot({ path: `${DIR}excel-fig.png` });
	await browser.close();
};
run();
