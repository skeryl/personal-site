/* Deterministic DOM-level checks for the trickier cases. */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

/** Read the fill of each polygon in a cell's SVG. */
const cellFills = (page, index) =>
	page.$$eval(`[data-cell-index="${index}"] polygon`, (nodes) =>
		nodes.map((n) => n.getAttribute('fill'))
	);

const box = async (page, index) => {
	const b = await page.locator(`[data-cell-index="${index}"]`).boundingBox();
	return b;
};

const clickFrac = async (page, index, fx, fy) => {
	const b = await box(page, index);
	await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
};

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');

	const results = {};

	// ── Diagonal cell, two colors, rotation 0 ──
	await page.locator('.piece', { hasText: 'Triangle' }).first().click();
	// teal (swatch 0) into the upper-right half
	await page.locator('.swatch').nth(0).click();
	await clickFrac(page, 0, 0.8, 0.2);
	// orchid (swatch 5) into the lower-left half
	await page.locator('.swatch').nth(5).click();
	await clickFrac(page, 0, 0.2, 0.8);
	results.diagonalTwoColor = await cellFills(page, 0);

	// ── Same diagonal cell: paint the upper-right half again with mint ──
	// Should replace only that half, leaving the orchid half intact.
	await page.locator('.swatch').nth(1).click();
	await clickFrac(page, 0, 0.8, 0.2);
	results.diagonalReplaceOneHalf = await cellFills(page, 0);

	// ── Switching piece type on an occupied cell should reset it cleanly ──
	// Select Square and click the same cell: it becomes one whole square.
	await page.locator('.piece', { hasText: 'Square' }).click();
	await page.locator('.swatch').nth(2).click();
	await clickFrac(page, 0, 0.5, 0.5);
	results.squareOverDiagonal = await cellFills(page, 0);

	// ── Eraser removes just the slot under the cursor ──
	// Rebuild a diagonal two-color cell in cell 7, then erase one half.
	await page.locator('.piece', { hasText: 'Triangle' }).first().click();
	await page.locator('.swatch').nth(0).click();
	await clickFrac(page, 7, 0.8, 0.2);
	await page.locator('.swatch').nth(5).click();
	await clickFrac(page, 7, 0.2, 0.8);
	await page.locator('.tool-btn', { hasText: 'Eraser' }).click();
	await clickFrac(page, 7, 0.8, 0.2); // erase the teal half
	results.eraseOneHalf = await cellFills(page, 7);

	// ── Inventory guard: try to exhaust Sky (4) and confirm it blocks ──
	await page.locator('.tool-btn', { hasText: 'Eraser' }).click(); // toggle eraser off
	await page.locator('.piece', { hasText: 'Square' }).click();
	await page.locator('.swatch').nth(3).click(); // Sky, count 4
	for (const i of [40, 41, 42, 43, 44]) await clickFrac(page, i, 0.5, 0.5); // 5 attempts, only 4 allowed
	const skyPlaced = await page.$$eval('[data-cell-index] polygon', (nodes) =>
		nodes.filter((n) => n.getAttribute('fill') === '#a9dcea').length
	);
	results.skyPlacedShouldBe4 = skyPlaced;
	results.skyCountLabel = (await page.locator('.swatch-count').nth(3).textContent())?.trim();

	await page.screenshot({ path: `${DIR}verify-final.png`, fullPage: true });
	console.log(JSON.stringify(results, null, 2));
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
