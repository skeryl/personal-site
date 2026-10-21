/*
 * Throwaway harness: drive the quilt-builder exploration in headless chromium
 * and screenshot it. Not committed — lives under .quilt-shots.
 */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

const shot = async (page, name) => {
	await page.screenshot({ path: `${DIR}${name}.png`, fullPage: true });
	console.log(`shot: ${name}`);
};

/** Center of a blanket cell by index. */
const cellBox = async (page, index) => {
	const el = page.locator(`[data-cell-index="${index}"]`);
	const b = await el.boundingBox();
	return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b };
};

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
	const errors = [];
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]', { timeout: 10000 });
	await shot(page, '01-initial');

	// Report what the palette exposes.
	const pieceLabels = await page.locator('.piece span').allTextContents();
	const swatchNames = await page.locator('.swatch-name').allTextContents();
	console.log('pieces:', pieceLabels.join(', '));
	console.log('swatches:', swatchNames.join(', '));

	// 1) Select first fabric (default) and click a few cells to paint whole squares.
	for (const i of [0, 1, 2, 7, 8, 9]) {
		const c = await cellBox(page, i);
		await page.mouse.click(c.x, c.y);
	}
	await shot(page, '02-painted-squares');

	// 2) Select the "Rectangle" piece, then paint two cells.
	await page.locator('.piece', { hasText: 'Rectangle' }).click();
	for (const i of [3, 4]) {
		const c = await cellBox(page, i);
		await page.mouse.click(c.x, c.y);
	}
	await shot(page, '03-rectangles');

	// 3) Rotate the pending piece, paint a cell (vertical rectangle).
	await page.locator('.tool-btn', { hasText: 'Rotate' }).click();
	{
		const c = await cellBox(page, 5);
		await page.mouse.click(c.x, c.y);
	}
	await shot(page, '04-rotated-rect');

	// 4) Triangle piece: paint each half of a cell with different fabrics.
	await page.locator('.piece', { hasText: 'Triangle' }).first().click();
	// upper-left triangle
	{
		const c = await cellBox(page, 14);
		await page.mouse.click(c.box.x + c.box.width * 0.3, c.box.y + c.box.height * 0.2);
	}
	// switch fabric, lower-right triangle
	await page.locator('.swatch').nth(5).click();
	{
		const c = await cellBox(page, 14);
		await page.mouse.click(c.box.x + c.box.width * 0.7, c.box.y + c.box.height * 0.8);
	}
	await shot(page, '05-two-triangles-one-cell');

	// 5) Quarter-triangles: fill all four quadrants of a cell with distinct fabrics.
	await page.locator('.piece', { hasText: 'Half triangle' }).click();
	const quadrants = [
		[0.5, 0.15],
		[0.85, 0.5],
		[0.5, 0.85],
		[0.15, 0.5]
	];
	for (let q = 0; q < 4; q++) {
		await page.locator('.swatch').nth(q).click();
		const c = await cellBox(page, 21);
		await page.mouse.click(c.box.x + c.box.width * quadrants[q][0], c.box.y + c.box.height * quadrants[q][1]);
	}
	await shot(page, '06-four-quarters');

	// 6) Drag a placed square from cell 0 to empty cell 30.
	{
		const from = await cellBox(page, 0);
		const to = await cellBox(page, 30);
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move(from.x + 12, from.y + 12, { steps: 4 });
		await page.mouse.move(to.x, to.y, { steps: 12 });
		await page.mouse.up();
	}
	await shot(page, '07-after-drag-move');

	// 7) Drag a placed square off the blanket entirely (should remove it).
	{
		const from = await cellBox(page, 1);
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move(from.x + 12, from.y + 12, { steps: 4 });
		await page.mouse.move(60, 400, { steps: 12 });
		await page.mouse.up();
	}
	await shot(page, '08-after-drag-off');

	// Capture inventory counts as displayed.
	const counts = await page.locator('.swatch-count').allTextContents();
	console.log('counts after edits:', counts.join(' | '));

	console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
