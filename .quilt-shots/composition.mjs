/* Throwaway: screenshot the new block-composition control. */
import { chromium } from 'playwright';

const URL_ = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

const cellCenter = async (page, i, fx = 0.5, fy = 0.5) => {
	const b = await page.locator(`[data-cell-index="${i}"]`).boundingBox();
	return { x: b.x + b.width * fx, y: b.y + b.height * fy };
};

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
	const page = await browser.newPage({ viewport: { width: 1280, height: 1500 }, deviceScaleFactor: 3 });
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

	// Stamp a pinwheel (now a 2x2 composition) and a four patch.
	await page.getByRole('tab', { name: 'Block' }).click();
	await page.getByRole('button', { name: 'Pinwheel' }).click();
	for (const i of [0, 2, 14, 16]) await page.mouse.click(...Object.values(await cellCenter(page, i)));
	await page.getByRole('button', { name: 'Four patch' }).click();
	for (const i of [1, 15]) await page.mouse.click(...Object.values(await cellCenter(page, i)));

	// Paint a solid block, then subdivide it to 4x4 with the new control.
	await page.getByRole('tab', { name: 'Piece' }).click();
	await page.mouse.click(...Object.values(await cellCenter(page, 8)));
	await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
	await page.mouse.click(...Object.values(await cellCenter(page, 8)));
	await page.mouse.move(10, 10);
	await page.screenshot({ path: `${DIR}comp-selected.png`, fullPage: true });

	await page.locator('.composition').getByRole('button', { name: '4 by 4' }).click();
	await page.mouse.move(10, 10);
	await page.screenshot({ path: `${DIR}comp-4x4.png`, fullPage: true });

	// Paint individual children of the 4x4.
	await page.locator('.actions').getByRole('button', { name: /^Place/ }).click();
	await page.locator('.material').first().getByRole('button', { name: /Use|Selected/ }).click();
	for (const [fx, fy] of [[0.12, 0.12], [0.37, 0.37], [0.62, 0.62], [0.87, 0.87]]) {
		await page.mouse.click(...Object.values(await cellCenter(page, 8, fx, fy)));
	}
	await page.mouse.move(10, 10);
	await page.screenshot({ path: `${DIR}comp-painted.png`, fullPage: true });

	const wall = await page.locator('.blanket').boundingBox();
	await page.screenshot({
		path: `${DIR}comp-crop.png`,
		clip: { x: wall.x, y: wall.y, width: wall.width, height: Math.min(wall.height, 700) }
	});

	const a = await page.locator('[data-cell-index="0"]').boundingBox();
	const z = await page.locator('[data-cell-index="8"]').boundingBox();
	await page.screenshot({
		path: `${DIR}comp-zoom.png`,
		clip: { x: a.x - 2, y: a.y - 2, width: z.x + z.width - a.x + 4, height: a.height * 2 + 4 }
	});

	console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
	await browser.close();
};
run();
