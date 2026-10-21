/* Symmetry mode: mirrored painting/erasing, reflected geometry, axis drag, save/update. */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;
const COLS = 7;

const cellBox = async (page, i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();
const fills = (page, i) =>
	page.$$eval(`[data-cell-index="${i}"] polygon`, (ns) => ns.map((n) => n.getAttribute('fill')));
const pts = (page, i) =>
	page.$$eval(`[data-cell-index="${i}"] polygon`, (ns) => ns.map((n) => n.getAttribute('points')));
const parkMouse = (page) => page.mouse.move(60, 300);

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');
	const results = {};

	// Enable vertical symmetry (default axis center: col c mirrors to 6-c).
	await page.locator('.tool-btn', { hasText: 'Vertical' }).click(); // nth(1): piece palette also has "Vertical"
	results.axisVisible = await page.locator('.axis-v').count();

	// 1) Paint a teal square at col 0: mirror appears at col 6.
	{
		const b = await cellBox(page, 0);
		await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
		await parkMouse(page);
		results.mirroredSquare = [await fills(page, 0), await fills(page, 6)];
	}

	// 2) Paint a triangle at col 1: mirror at col 5 must be REFLECTED geometry.
	{
		await page.locator('.piece', { hasText: 'Triangle' }).first().click();
		const b = await cellBox(page, 1);
		await page.mouse.click(b.x + b.width * 0.7, b.y + b.height * 0.25); // upper-right triangle
		await parkMouse(page);
		results.triangleSource = { fills: await fills(page, 1), pts: await pts(page, 1) };
		results.triangleMirror = { fills: await fills(page, 5), pts: await pts(page, 5) };
		results.mirrorReflected =
			JSON.stringify(results.triangleSource.pts) !== JSON.stringify(results.triangleMirror.pts);
	}

	// 3) Mirrored ghost: hover col 2, expect ghost polygons in col 4 too.
	{
		const b = await cellBox(page, 2);
		await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
		results.ghostAtHover = await page.locator('[data-cell-index="2"] polygon.ghost').count();
		results.ghostAtMirror = await page.locator('[data-cell-index="4"] polygon.ghost').count();
		await page.screenshot({ path: `${DIR}sym1-ghost.png` });
		await parkMouse(page);
	}

	// 4) Drag the vertical axis left to x=1 (k=2): now col 0 mirrors to col 1.
	{
		const blanket = await page.locator('.blanket').boundingBox();
		const axis = await page.locator('.axis-v').boundingBox();
		await page.mouse.move(axis.x + axis.width / 2, axis.y + 200);
		await page.mouse.down();
		await page.mouse.move(blanket.x + blanket.width * (2 / 14), axis.y + 200, { steps: 8 });
		await page.mouse.up();
		// Paint square at col 0 row 2 → mirror at col 1 row 2 (cells 14, 15).
		await page.locator('.piece', { hasText: 'Square' }).click();
		await page.locator('.swatch', { hasText: 'Orchid' }).click();
		const b = await cellBox(page, 14);
		await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
		await parkMouse(page);
		results.movedAxisMirror = [await fills(page, 14), await fills(page, 15)];
	}

	// 5) Enable horizontal too: paint at (row 0, col 0) with axis-h at center
	// (row r mirrors to 9-r): expect 4 cells including diagonal mirror.
	{
		await page.locator('.tool-btn', { hasText: 'Horizontal' }).click();
		await page.locator('.swatch', { hasText: 'Mint' }).click();
		const b = await cellBox(page, 0);
		await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
		await parkMouse(page);
		// v-axis at k=2: col0→col1. h-axis center: row0→row9. Cells: 0, 1, 63, 64.
		results.fourWay = [
			await fills(page, 0),
			await fills(page, 1),
			await fills(page, 63),
			await fills(page, 64)
		];
	}

	// 6) Mirrored erase: erase cell 0, mirror cells clear too.
	{
		await page.locator('.tool-btn', { hasText: 'Eraser' }).click();
		const b = await cellBox(page, 0);
		await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
		await parkMouse(page);
		results.erasedFourWay = [
			(await fills(page, 0)).join(),
			(await fills(page, 1)).join(),
			(await fills(page, 63)).join(),
			(await fills(page, 64)).join()
		];
	}

	// 7) Save vs Update button.
	{
		await page.fill('.pattern-save input', 'sym-test');
		results.saveLabelNew = (await page.locator('.pattern-save button').textContent()).trim();
		await page.locator('.pattern-save button').click();
		results.saveLabelExisting = (await page.locator('.pattern-save button').textContent()).trim();
		results.currentCardHighlighted = await page.locator('.pattern-load.current').count();
		// cleanup pattern
		page.on('dialog', (d) => d.accept());
		await page.locator('.pattern-delete').first().click();
	}

	await page.locator('.tool-btn', { hasText: 'Clear' }).click();
	console.log(JSON.stringify(results, null, 2));
	console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
