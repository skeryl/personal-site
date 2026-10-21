import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	page.on('dialog', (d) => d.accept());
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	await page.waitForTimeout(600); // let iconify fetch glyphs
	const head = page.locator('.editor-head');
	await head.screenshot({ path: `${DIR}spot-icons-head.png` });
	// +input popover autofocus
	await page.locator('[data-op-id="add"]').click();
	await page.locator('[data-add-input="root"]').click();
	await page.waitForSelector('[data-slot-menu]');
	await page.screenshot({ path: `${DIR}spot-icons-addinput.png` });
	await browser.close();
};
run();
