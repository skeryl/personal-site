import { expect, test, type Page } from '@playwright/test';

/*
 * End-to-end coverage for the quilt builder's core loops: painting with
 * undo/redo, inventory enforcement, symmetry, keyboard access, and pattern
 * persistence (including migration of legacy saves). Pure logic is unit
 * tested next to the modules; these specs cover the wiring.
 */

const ROUTE = '/journal/quilt-builder';
/** The working state autosave is debounced; wait it out before reloads. */
const AUTOSAVE_MS = 400;

/*
 * A desktop-sized viewport keeps the whole tool on screen: palette clicks
 * must not scroll the page out from under raw mouse coordinates.
 */
test.use({ viewport: { width: 1440, height: 1400 } });

const cellCenter = async (page: Page, index: number) => {
	const cell = page.locator(`[data-cell-index="${index}"]`);
	await cell.scrollIntoViewIfNeeded();
	const box = await cell.boundingBox();
	if (!box) throw new Error(`cell ${index} not found`);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
};

/** locator.click scrolls into view and positions relative to the cell. */
const clickCell = async (page: Page, index: number, fx = 0.5, fy = 0.5) => {
	const cell = page.locator(`[data-cell-index="${index}"]`);
	const box = await cell.boundingBox();
	if (!box) throw new Error(`cell ${index} not found`);
	await cell.click({ position: { x: box.width * fx, y: box.height * fy } });
};

const cellFills = (page: Page, index: number) =>
	page.$$eval(`[data-cell-index="${index}"] polygon`, (nodes) =>
		nodes.map((node) => node.getAttribute('fill'))
	);

const filledCellCount = (page: Page) =>
	page.$$eval(
		'[data-cell-index] polygon',
		(nodes) => nodes.filter((node) => node.getAttribute('fill') !== '#ffffff').length
	);

/** Hover previews pollute fill reads; park the pointer off the blanket. */
const parkMouse = (page: Page) => page.mouse.move(10, 10);

const toolButton = (page: Page, label: string | RegExp) =>
	page.locator('.palette-actions .tool-btn', { hasText: label });

test.beforeEach(async ({ page }) => {
	await page.goto(ROUTE);
	await page.waitForSelector('[data-cell-index="0"]');
});

test('paint drag is one undo step and redo restores it', async ({ page }) => {
	const start = await cellCenter(page, 0);
	const end = await cellCenter(page, 2);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.move(end.x, end.y, { steps: 10 });
	await page.mouse.up();
	await parkMouse(page);
	expect(await filledCellCount(page)).toBe(3);

	await page.keyboard.press('ControlOrMeta+z');
	await parkMouse(page);
	expect(await filledCellCount(page)).toBe(0);

	await page.keyboard.press('ControlOrMeta+Shift+z');
	await parkMouse(page);
	expect(await filledCellCount(page)).toBe(3);
});

test('a no-op gesture does not wipe the redo stack', async ({ page }) => {
	await clickCell(page, 0);
	await page.keyboard.press('ControlOrMeta+z');
	await expect(toolButton(page, 'Redo')).toBeEnabled();

	// Erasing an empty cell changes nothing and must leave redo intact.
	await toolButton(page, 'Eraser').click();
	await clickCell(page, 10);
	await expect(toolButton(page, 'Redo')).toBeEnabled();

	await toolButton(page, 'Redo').click();
	await parkMouse(page);
	expect(await filledCellCount(page)).toBe(1);
});

test('moving a piece into a larger slot cannot overdraw the pile', async ({ page }) => {
	// Spend white's entire count of 1: two quarter triangles and one rectangle.
	await page.locator('.piece', { hasText: 'Half triangle' }).click();
	await page.locator('.swatch', { hasText: 'White' }).click();
	await clickCell(page, 0, 0.5, 0.15);
	await clickCell(page, 0, 0.85, 0.5);
	await page.locator('.piece', { hasText: 'Horizontal' }).click();
	await clickCell(page, 1, 0.5, 0.25);
	// A teal triangle pair as the swap target.
	await page.locator('.piece', { hasText: 'Triangle' }).first().click();
	await page.locator('.swatch', { hasText: 'Deep teal' }).click();
	await clickCell(page, 2, 0.7, 0.2);

	await expect(page.locator('.swatch', { hasText: 'White' })).toContainText('0/1');

	// Dragging a white quarter (0.25) onto a triangle slot (0.5) needs 0.25
	// more white than exists; the move must be rejected outright.
	await toolButton(page, 'Mouse').click();
	const from = await cellCenter(page, 0);
	const to = await cellCenter(page, 2);
	await page.mouse.move(from.box.x + from.box.width * 0.5, from.box.y + from.box.height * 0.15);
	await page.mouse.down();
	await page.mouse.move(to.box.x + to.box.width * 0.7, to.box.y + to.box.height * 0.2, {
		steps: 10
	});
	await page.mouse.up();
	await parkMouse(page);

	await expect(page.locator('.swatch', { hasText: 'White' })).toContainText('0/1');
	expect(await cellFills(page, 2)).toEqual(['#103c39', '#ffffff']);
});

test('vertical symmetry mirrors painting with reflected geometry', async ({ page }) => {
	await toolButton(page, 'Vertical').click();
	await page.locator('.piece', { hasText: 'Triangle' }).first().click();
	await clickCell(page, 0, 0.7, 0.2);
	await parkMouse(page);

	const source = await page.$$eval('[data-cell-index="0"] polygon', (nodes) =>
		nodes.map((node) => node.getAttribute('points'))
	);
	const mirror = await page.$$eval('[data-cell-index="6"] polygon', (nodes) =>
		nodes.map((node) => node.getAttribute('points'))
	);
	expect(await cellFills(page, 6)).toContain('#103c39');
	expect(mirror).not.toEqual(source);
});

test('cells are keyboard operable', async ({ page }) => {
	await page.locator('[data-cell-index="0"]').focus();
	await page.keyboard.press('Enter');
	await parkMouse(page);
	expect((await cellFills(page, 0)).some((fill) => fill !== '#ffffff')).toBe(true);

	// The mouse tool toggles selection from the keyboard too.
	await toolButton(page, 'Mouse').click();
	await page.locator('[data-cell-index="0"]').focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-cell-index="0"]')).toHaveAttribute('aria-pressed', 'true');
});

test('patterns save, reload, and legacy saves migrate with stable ids', async ({ page }) => {
	// Seed a pre-uuid, name-keyed pattern before the app boots.
	await page.evaluate(() => {
		localStorage.setItem(
			'quilt-builder:patterns',
			JSON.stringify({
				Legacy: {
					cells: [{ layout: 'whole', rotation: 0, slots: ['teal-deep'] }],
					savedAt: 1000
				}
			})
		);
		localStorage.removeItem('quilt-builder:current');
	});
	await page.reload();
	await page.waitForSelector('[data-cell-index="0"]');

	const storedId = () =>
		page.evaluate(
			() => Object.keys(JSON.parse(localStorage.getItem('quilt-builder:patterns') ?? '{}'))[0]
		);
	const migratedId = await storedId();
	await page.reload();
	await page.waitForSelector('[data-cell-index="0"]');
	expect(await storedId()).toBe(migratedId);

	// Load it, rename via the title, and survive a reload as the open pattern.
	await page.locator('.pattern-load', { hasText: 'Legacy' }).click();
	await page.locator('.wall-title').fill('Renamed');
	await page.keyboard.press('Enter');
	await expect(page.locator('.pattern-name').first()).toHaveText('Renamed');

	await page.waitForTimeout(AUTOSAVE_MS);
	await page.reload();
	await page.waitForSelector('[data-cell-index="0"]');
	await expect(page.locator('.wall-title')).toHaveValue('Renamed');
	await expect(page.locator('.pattern-load.current')).toHaveCount(1);
	await expect(page.locator('.unsaved-tag')).toHaveCount(0);
});
