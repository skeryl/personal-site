/* UUID pattern keys, new/rename, legacy migration, redo. */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:5173/journal/quilt-builder';

const run = async () => {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
	const page = await ctx.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('dialog', (d) => d.accept());

	// Seed legacy (name-keyed) storage before load to test migration.
	await page.addInitScript(() => {
		if (!localStorage.getItem('__seeded')) {
			localStorage.setItem('__seeded', '1');
			localStorage.setItem(
				'quilt-builder:patterns',
				JSON.stringify({
					'legacy quilt': {
						cells: [{ layout: 'whole', rotation: 0, slots: ['teal-deep'] }],
						savedAt: 1000
					}
				})
			);
		}
	});
	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');
	const r = {};
	const names = () => page.$$eval('.pattern-name', (ns) => ns.map((n) => n.textContent.trim()));
	const btn = (t) => page.locator('.tool-btn', { hasText: t });

	// 1) Legacy save migrated: listed with its old name, loadable.
	r.migrated = await names();
	await page.locator('.pattern-load', { hasText: 'legacy quilt' }).click();
	r.legacyLoaded = await page.$$eval('[data-cell-index="0"] polygon', (ns) =>
		ns.map((n) => n.getAttribute('fill'))
	);
	r.saveLabelAfterLoad = (await page.locator('.pattern-save button').textContent()).trim();

	// 2) Rename in place: change name, Update; still ONE pattern, new name.
	await page.fill('.pattern-save input', 'renamed quilt');
	await page.locator('.pattern-save button').click();
	r.afterRename = await names();

	// 3) New button: fresh board, suggested name Pattern 1.
	await btn('New').click();
	r.newName = await page.locator('.pattern-save input').inputValue();
	r.boardCleared = await page.$$eval('[data-cell-index] polygon', (ns) =>
		ns.every((n) => n.getAttribute('fill') === '#ffffff')
	);
	r.saveLabelNew = (await page.locator('.pattern-save button').textContent()).trim();

	// 4) Save Pattern 1, then New again suggests Pattern 2.
	const b0 = await page.locator('[data-cell-index="0"]').boundingBox();
	await page.mouse.click(b0.x + b0.width / 2, b0.y + b0.height / 2);
	await page.locator('.pattern-save button').click();
	await btn('New').click();
	r.secondNewName = await page.locator('.pattern-save input').inputValue();

	// 5) Duplicate names allowed as separate patterns (distinct ids).
	await page.fill('.pattern-save input', 'renamed quilt');
	const b1 = await page.locator('[data-cell-index="1"]').boundingBox();
	await page.mouse.click(b1.x + b1.width / 2, b1.y + b1.height / 2);
	await page.locator('.pattern-save button').click();
	r.duplicateNames = (await names()).filter((n) => n === 'renamed quilt').length;

	// 6) Redo: paint, undo, redo via keyboard; also button state.
	const b2 = await page.locator('[data-cell-index="2"]').boundingBox();
	await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2);
	await page.mouse.move(60, 300);
	const filled = () =>
		page.$$eval('[data-cell-index] polygon', (ns) =>
			ns.filter((n) => n.getAttribute('fill') !== '#ffffff').length
		);
	const before = await filled();
	await page.keyboard.press('Meta+z');
	r.afterUndo = (await filled()) === before - 1;
	r.redoEnabled = !(await btn('Redo').isDisabled());
	await page.keyboard.press('Meta+Shift+z');
	r.afterRedo = (await filled()) === before;
	// New gesture clears redo.
	const b3 = await page.locator('[data-cell-index="3"]').boundingBox();
	await page.mouse.click(b3.x + b3.width / 2, b3.y + b3.height / 2);
	r.redoClearedAfterEdit = await btn('Redo').isDisabled();

	// Cleanup.
	while (await page.locator('.pattern-delete').count()) {
		await page.locator('.pattern-delete').first().click();
		await page.waitForTimeout(80);
	}
	await btn('Clear').click();
	await page.evaluate(() => localStorage.removeItem('__seeded'));

	console.log(JSON.stringify(r, null, 2));
	console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
	await browser.close();
};

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
