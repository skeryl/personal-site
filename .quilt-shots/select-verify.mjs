/* Multi-select, keyboard nav, group rotate/move, alt-drag duplicate. */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

const center = async (page, i) => {
	const b = await page.locator(`[data-cell-index="${i}"]`).boundingBox();
	return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const selectedIndices = (page) =>
	page.$$eval('[data-cell-index].selected', (ns) =>
		ns.map((n) => Number(n.dataset.cellIndex)).sort((a, b) => a - b)
	);
const cellState = (page, i) =>
	page.$$eval(`[data-cell-index="${i}"] polygon`, (ns) => ns.map((n) => n.getAttribute('fill')));
const points = (page, i) =>
	page.$$eval(`[data-cell-index="${i}"] polygon`, (ns) => ns.map((n) => n.getAttribute('points')));
const parkMouse = (page) => page.mouse.move(60, 300);

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');
	const results = {};

	// Paint a diagonal (teal/mint) into cells 0 and 1, teal squares into 7 and 8.
	await page.locator('.piece', { hasText: 'Triangle' }).first().click();
	for (const i of [0, 1]) {
		const c = await center(page, i);
		await page.mouse.click(c.x + 10, c.y - 10);
	}
	await page.locator('.piece', { hasText: 'Square' }).click();
	for (const i of [7, 8]) {
		const c = await center(page, i);
		await page.mouse.click(c.x, c.y);
	}

	// 1) Shift-click multi-select all four with the mouse tool.
	await page.locator('.tool-btn', { hasText: 'Mouse' }).click();
	const c0 = await center(page, 0);
	await page.mouse.click(c0.x, c0.y);
	for (const i of [1, 7, 8]) {
		const c = await center(page, i);
		await page.keyboard.down('Shift');
		await page.mouse.click(c.x, c.y);
		await page.keyboard.up('Shift');
	}
	results.multiSelected = await selectedIndices(page);
	await page.screenshot({ path: `${DIR}s1-multiselect.png` });

	// 2) R rotates the whole group in one undo step.
	const beforeRot = await points(page, 0);
	await page.keyboard.press('r');
	results.groupRotateChanged = JSON.stringify(await points(page, 0)) !== JSON.stringify(beforeRot);
	await page.keyboard.press('Meta+z');
	await parkMouse(page);
	results.groupRotateUndone =
		JSON.stringify(await points(page, 0)) === JSON.stringify(beforeRot);

	// 3) Keyboard nav: plain click cell 0, arrows move selection.
	await page.mouse.click(c0.x, c0.y);
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowDown');
	results.afterArrows = await selectedIndices(page); // expect [8]
	await page.keyboard.down('Shift');
	await page.keyboard.press('ArrowLeft');
	await page.keyboard.up('Shift');
	results.afterShiftArrow = await selectedIndices(page); // expect [7, 8]

	// 4) Group drag: select 7+8, drag from 7 to 21 (down 2 rows).
	{
		const c7 = await center(page, 7);
		const c21 = await center(page, 21);
		await page.mouse.move(c7.x, c7.y);
		await page.mouse.down();
		await page.mouse.move(c7.x + 12, c7.y + 12, { steps: 4 });
		await page.mouse.move(c21.x, c21.y, { steps: 12 });
		await page.mouse.up();
		await parkMouse(page);
		results.groupMoveSource = await cellState(page, 7); // expect white
		results.groupMoveDest = [await cellState(page, 21), await cellState(page, 22)]; // teal squares
		results.groupMoveSelection = await selectedIndices(page); // [21, 22]
	}

	// 5) Alt-drag the group: duplicate 21+22 down two rows to 35+36.
	{
		const c21 = await center(page, 21);
		const c35 = await center(page, 35);
		await page.mouse.move(c21.x, c21.y);
		await page.keyboard.down('Alt');
		await page.mouse.down();
		await page.mouse.move(c21.x + 12, c21.y + 12, { steps: 4 });
		await page.mouse.move(c35.x, c35.y, { steps: 12 });
		await page.mouse.up();
		await page.keyboard.up('Alt');
		await parkMouse(page);
		results.dupSource = await cellState(page, 21); // still teal
		results.dupDest = [await cellState(page, 35), await cellState(page, 36)]; // teal copies
	}

	// 6) Alt-drag a single piece (cell 0's upper triangle) to cell 3.
	{
		const c0b = await center(page, 0);
		const c3 = await center(page, 3);
		await page.mouse.click(c0b.x + 10, c0b.y - 10); // select single
		await page.mouse.move(c0b.x + 10, c0b.y - 10);
		await page.keyboard.down('Alt');
		await page.mouse.down();
		await page.mouse.move(c0b.x + 22, c0b.y - 2, { steps: 4 });
		await page.mouse.move(c3.x + 10, c3.y - 10, { steps: 12 });
		await page.mouse.up();
		await page.keyboard.up('Alt');
		await parkMouse(page);
		results.singleDupSource = await cellState(page, 0); // unchanged
		results.singleDupDest = await cellState(page, 3); // teal placed
	}

	await page.screenshot({ path: `${DIR}s2-final.png`, fullPage: true });
	// Reset for Shane.
	await page.locator('.tool-btn', { hasText: 'Clear' }).click();

	console.log(JSON.stringify(results, null, 2));
	console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
