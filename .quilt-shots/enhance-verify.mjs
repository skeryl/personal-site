/* DOM-level checks for the tools/undo/ghost rework. */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

const box = async (page, i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();
const center = async (page, i) => {
	const b = await box(page, i);
	return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const fills = (page, i) =>
	page.$$eval(`[data-cell-index="${i}"] polygon`, (ns) => ns.map((n) => n.getAttribute('fill')));
const filledCount = (page) =>
	page.$$eval('[data-cell-index] polygon', (ns) =>
		ns.filter((n) => n.getAttribute('fill') !== '#ffffff').length
	);

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
	const errors = [];
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');
	const results = {};

	// 1) Ghost preview: hover an empty cell in place mode; expect a .ghost polygon.
	{
		const c = await center(page, 10);
		await page.mouse.move(c.x, c.y);
		results.ghostOnHover = await page
			.locator('[data-cell-index="10"] polygon.ghost')
			.count();
		// hovered ring present?
		results.hoverClass = await page
			.locator('[data-cell-index="10"].hovered')
			.count();
		await page.screenshot({ path: `${DIR}e1-ghost.png` });
		// move away: ghost gone, cell still empty
		await page.mouse.move(60, 300);
		results.ghostGoneAfterLeave = await page.locator('polygon.ghost').count();
		results.cell10StillEmpty = (await fills(page, 10)).every((f) => f === '#ffffff');
	}

	// 2) Click-drag painting: one gesture across cells 0,1,2,3.
	{
		const a = await center(page, 0);
		const d = await center(page, 3);
		await page.mouse.move(a.x, a.y);
		await page.mouse.down();
		await page.mouse.move(d.x, a.y, { steps: 20 });
		await page.mouse.up();
		results.paintedAfterDrag = await filledCount(page);
	}

	// 3) Undo: the whole paint-drag is one step.
	{
		await page.locator('.tool-btn', { hasText: 'Undo' }).click();
		results.filledAfterUndo = await filledCount(page);
	}

	// 4) Vertical rectangle palette entry: click left half of cell 5.
	{
		await page.locator('.piece', { hasText: 'Vertical' }).click();
		const b = await box(page, 5);
		await page.mouse.click(b.x + b.width * 0.25, b.y + b.height * 0.5);
		const f = await fills(page, 5);
		results.verticalRect = f; // expect one colored, one white, 2 slots
		// The two polygons should be side-by-side: compare first points of each.
		results.verticalRectPoints = await page.$$eval(
			'[data-cell-index="5"] polygon',
			(ns) => ns.map((n) => n.getAttribute('points'))
		);
	}

	// 5) Mouse tool select + R rotate.
	{
		// Paint a triangle in cell 20 first.
		await page.locator('.piece', { hasText: 'Triangle' }).first().click();
		const b = await box(page, 20);
		await page.mouse.click(b.x + b.width * 0.7, b.y + b.height * 0.3);
		const before = await page.$$eval('[data-cell-index="20"] polygon', (ns) =>
			ns.map((n) => n.getAttribute('points'))
		);
		// Switch to mouse tool, click the triangle to select, press R.
		await page.locator('.tool-btn', { hasText: 'Mouse' }).click();
		await page.mouse.click(b.x + b.width * 0.7, b.y + b.height * 0.3);
		results.selectedRing = await page.locator('[data-cell-index="20"].selected').count();
		await page.keyboard.press('r');
		const after = await page.$$eval('[data-cell-index="20"] polygon', (ns) =>
			ns.map((n) => n.getAttribute('points'))
		);
		results.rotateChangedGeometry = JSON.stringify(before) !== JSON.stringify(after);
		await page.screenshot({ path: `${DIR}e2-selected.png` });
		// Delete removes the selected cell's contents.
		await page.keyboard.press('Backspace');
		results.deletedSelected = (await fills(page, 20)).every((f) => f === '#ffffff');
	}

	// 6) Erase drag: paint 3 cells, then erase-drag across them in one gesture.
	{
		await page.locator('.piece', { hasText: 'Square' }).click();
		for (const i of [30, 31, 32]) {
			const c = await center(page, i);
			await page.mouse.click(c.x, c.y);
		}
		await page.locator('.tool-btn', { hasText: 'Eraser' }).click();
		const a = await center(page, 30);
		const d = await center(page, 32);
		await page.mouse.move(a.x, a.y);
		await page.mouse.down();
		await page.mouse.move(d.x, d.y, { steps: 15 });
		await page.mouse.up();
		results.filledAfterEraseDrag = await filledCount(page);
		// One undo restores all three.
		await page.keyboard.press('Meta+z');
		results.filledAfterUndoErase = await filledCount(page);
	}

	console.log(JSON.stringify(results, null, 2));
	console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
