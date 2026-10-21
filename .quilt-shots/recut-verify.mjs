/* Verify layout-preserving placement (the teal square + pink triangle case). */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';
const DIR = new URL('.', import.meta.url).pathname;

const box = async (page, i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();
const fills = (page, i) =>
	page.$$eval(`[data-cell-index="${i}"] polygon`, (ns) => ns.map((n) => n.getAttribute('fill')));

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');
	const results = {};

	// 1) Teal whole square in cell 0, then pink quarter-triangle on top.
	{
		const b = await box(page, 0);
		await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); // teal square
		await page.locator('.piece', { hasText: 'Half triangle' }).click();
		await page.locator('.swatch', { hasText: 'Orchid' }).click();
		// Hover top quarter first: preview should show teal preserved + pink ghost.
		await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.15);
		results.previewFills = await fills(page, 0);
		await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.15);
		results.afterPlace = await fills(page, 0); // expect [orchid, teal, teal, teal]
		await page.screenshot({ path: `${DIR}r1-recut.png` });
	}

	// 2) Diagonal two-color cell re-cut by a rectangle.
	{
		await page.locator('.piece', { hasText: 'Triangle' }).first().click();
		await page.locator('.swatch', { hasText: 'Deep teal' }).click();
		const b = await box(page, 2);
		await page.mouse.click(b.x + b.width * 0.7, b.y + b.height * 0.2); // upper triangle teal
		await page.locator('.swatch', { hasText: 'Mint' }).click();
		await page.mouse.click(b.x + b.width * 0.3, b.y + b.height * 0.8); // lower triangle mint
		// Horizontal rect, cream, into the top strip: bottom strip inherits from centroid (mint).
		await page.locator('.piece', { hasText: 'Horizontal' }).click();
		await page.locator('.swatch', { hasText: 'Cream' }).click();
		await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.25);
		results.rectOverDiagonal = await fills(page, 2); // expect [cream, mint]
	}

	// 3) Undo still reverts the re-cut placement in one step.
	// Move the pointer off the blanket first, else we read the ghost preview.
	{
		await page.keyboard.press('Meta+z');
		await page.mouse.move(60, 300);
		results.afterUndo = await fills(page, 2); // back to diagonal teal/mint
	}

	// Clean up for Shane's browser.
	await page.locator('.tool-btn', { hasText: 'Clear' }).click();

	console.log(JSON.stringify(results, null, 2));
	console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
