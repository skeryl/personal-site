/* Copy/paste, whole-cell alt-drag, and group drag ghost. */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

const center = async (page, i) => {
	const b = await page.locator(`[data-cell-index="${i}"]`).boundingBox();
	return { x: b.x + b.width / 2, y: b.y + b.height / 2, box: b };
};
const fills = (page, i) =>
	page.$$eval(`[data-cell-index="${i}"] polygon`, (ns) => ns.map((n) => n.getAttribute('fill')));
const parkMouse = (page) => page.mouse.move(60, 300);

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');
	const results = {};

	// Build a 4-color quarters cell at 8 and a teal square at 9.
	await page.locator('.piece', { hasText: 'Half triangle' }).click();
	const quads = [
		[0.5, 0.15, 'Deep teal'],
		[0.85, 0.5, 'Mint'],
		[0.5, 0.85, 'Orchid'],
		[0.15, 0.5, 'Cream']
	];
	const c8 = await center(page, 8);
	for (const [fx, fy, name] of quads) {
		await page.locator('.swatch', { hasText: name }).click();
		await page.mouse.click(c8.box.x + c8.box.width * fx, c8.box.y + c8.box.height * fy);
	}
	await page.locator('.piece', { hasText: 'Square' }).click();
	await page.locator('.swatch', { hasText: 'Deep teal' }).click();
	const c9 = await center(page, 9);
	await page.mouse.click(c9.x, c9.y);
	const quartersFills = await fills(page, 8);

	// 1) Alt-drag the quarters cell (single selection) to 22: whole cell copies.
	await page.locator('.tool-btn', { hasText: 'Mouse' }).click();
	await page.mouse.click(c8.x, c8.y);
	{
		const c22 = await center(page, 22);
		await page.keyboard.down('Alt');
		await page.mouse.move(c8.x, c8.y);
		await page.mouse.down();
		await page.mouse.move(c8.x + 12, c8.y + 12, { steps: 4 });
		await page.mouse.move(c22.x, c22.y, { steps: 10 });
		// Mid-drag: the target should show a ghost of the full quarters cell.
		results.ghostAtTarget = await page
			.locator('[data-cell-index="22"] polygon.ghost')
			.count(); // expect 4
		results.sourceNotDimmed = await page
			.locator('[data-cell-index="8"].lifted')
			.count(); // expect 0 (copy keeps source solid)
		await page.screenshot({ path: `${DIR}c1-group-ghost.png` });
		await page.mouse.up();
		await page.keyboard.up('Alt');
		await parkMouse(page);
		results.altDragWholeCell = await fills(page, 22); // all four colors
		results.altDragSourceIntact = (await fills(page, 8)).join() === quartersFills.join();
	}

	// 2) Move-drag ghost dims the source: select 8+9, drag toward 36 and check mid-drag.
	{
		await page.mouse.click(c8.x, c8.y);
		const c9b = await center(page, 9);
		await page.keyboard.down('Shift');
		await page.mouse.click(c9b.x, c9b.y);
		await page.keyboard.up('Shift');
		const c36 = await center(page, 36);
		await page.mouse.move(c8.x, c8.y);
		await page.mouse.down();
		await page.mouse.move(c8.x + 12, c8.y + 12, { steps: 4 });
		await page.mouse.move(c36.x, c36.y, { steps: 10 });
		results.moveSourceDimmed = await page.locator('[data-cell-index="8"].lifted').count(); // 1
		results.moveGhostCells = [
			await page.locator('[data-cell-index="36"] polygon.ghost').count(),
			await page.locator('[data-cell-index="37"] polygon.ghost').count()
		]; // [4, 1]
		await page.mouse.up();
		await parkMouse(page);
		results.movedPair = [(await fills(page, 36)).length, (await fills(page, 37)).length];
	}

	// 3) Copy/paste: select the pair at 36+37, ⌘C, hover 50, ⌘V.
	{
		const c36 = await center(page, 36);
		const c37 = await center(page, 37);
		await page.mouse.click(c36.x, c36.y);
		await page.keyboard.down('Shift');
		await page.mouse.click(c37.x, c37.y);
		await page.keyboard.up('Shift');
		await page.keyboard.press('Meta+c');
		const c50 = await center(page, 50);
		await page.mouse.move(c50.x, c50.y);
		await page.keyboard.press('Meta+v');
		await parkMouse(page);
		results.pastedQuarters = await fills(page, 50); // 4-color quarters copy
		results.pastedSquare = await fills(page, 51); // teal square copy
		results.originalsIntact = [(await fills(page, 36)).length, (await fills(page, 37)).length];
		// Paste is one undo step.
		await page.keyboard.press('Meta+z');
		await parkMouse(page);
		results.pasteUndone = (await fills(page, 50)).every((f) => f === '#ffffff');
	}

	// Reset.
	await page.locator('.tool-btn', { hasText: 'Clear' }).click();
	console.log(JSON.stringify(results, null, 2));
	console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
