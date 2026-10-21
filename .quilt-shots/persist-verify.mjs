/* Save/load + autosave persistence checks. */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

const center = async (page, i) => {
	const b = await page.locator(`[data-cell-index="${i}"]`).boundingBox();
	return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const filledCount = (page) =>
	page.$$eval('[data-cell-index] polygon', (ns) =>
		ns.filter((n) => n.getAttribute('fill') !== '#ffffff').length
	);

const run = async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({ viewport: { width: 1180, height: 1500 } });
	const page = await ctx.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');
	const results = {};

	// Paint 3 squares, save as "test-pattern".
	for (const i of [0, 8, 16]) {
		const c = await center(page, i);
		await page.mouse.click(c.x, c.y);
	}
	await page.fill('.pattern-save input', 'test-pattern');
	await page.locator('.pattern-save button', { hasText: 'Save' }).click();
	results.patternListed = await page.locator('.pattern-load', { hasText: 'test-pattern' }).count();

	// Clear the board, then load the pattern back.
	await page.locator('.tool-btn', { hasText: 'Clear' }).click();
	results.afterClear = await filledCount(page);
	await page.locator('.pattern-load', { hasText: 'test-pattern' }).click();
	results.afterLoad = await filledCount(page);

	// Undo should revert the load.
	await page.keyboard.press('Meta+z');
	results.afterUndoLoad = await filledCount(page);
	await page.locator('.pattern-load', { hasText: 'test-pattern' }).click();

	// Reload the page: autosave should restore the working state,
	// and the saved pattern should still be listed.
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');
	results.afterReloadCells = await filledCount(page);
	results.afterReloadPatternListed = await page
		.locator('.pattern-load', { hasText: 'test-pattern' })
		.count();

	await page.screenshot({ path: `${DIR}p1-patterns.png`, fullPage: true });

	// Delete the pattern (accept the confirm dialog).
	page.on('dialog', (d) => d.accept());
	await page.locator('.pattern-delete').first().click();
	results.afterDeleteListed = await page
		.locator('.pattern-load', { hasText: 'test-pattern' })
		.count();

	// Clean up state so Shane's browser starts fresh-ish.
	await page.locator('.tool-btn', { hasText: 'Clear' }).click();

	console.log(JSON.stringify(results, null, 2));
	console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
