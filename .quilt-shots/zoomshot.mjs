/* Throwaway: check full bleed, ctrl+scroll zoom, and the minimap. */
import { chromium } from 'playwright';
const URL_ = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

const addFabric = async (page, name, hex) => {
	await page.getByRole('button', { name: '+Add' }).click();
	const card = page.locator('.material').last();
	await card.getByPlaceholder('Name this fabric').fill(name);
	await card.locator('.hex').fill(hex);
	await card.locator('.hex').press('Enter');
	await card.getByRole('button', { name: /Use|Selected/ }).click();
};

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
	const errors = [];
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

	await page.goto(URL_, { waitUntil: 'networkidle' });
	await page.evaluate(() => {
		localStorage.removeItem('quilt-builder:v3');
		localStorage.removeItem('quilt-builder:v2');
	});
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');

	await addFabric(page, 'Navy', '2f3d6b');
	await addFabric(page, 'Cream', 'efe6d2');
	await page.getByRole('tab', { name: 'Block' }).click();
	await page.getByRole('button', { name: 'Pinwheel' }).click();
	for (const i of [0, 2, 13, 15, 20, 27, 33, 40, 44, 47]) {
		const b = await page.locator(`[data-cell-index="${i}"]`).boundingBox();
		if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
	}
	await page.mouse.move(10, 10);
	await page.screenshot({ path: `${DIR}zoom-fit.png` });

	// Ctrl+wheel over the middle of the wall.
	const vp = await page.locator('.viewport').boundingBox();
	await page.mouse.move(vp.x + vp.width * 0.3, vp.y + vp.height * 0.3);
	for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -120, { });
	await page.keyboard.down('Control');
	for (let i = 0; i < 14; i++) {
		await page.mouse.wheel(0, -120);
	}
	await page.keyboard.up('Control');
	await page.waitForTimeout(250);
	await page.mouse.move(10, 10);
	await page.screenshot({ path: `${DIR}zoom-in.png` });
	console.log('zoom now:', await page.locator('.zoom-level').innerText());
	console.log('minimap present:', await page.locator('.minimap').count());
	console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
	await browser.close();
};
run();
