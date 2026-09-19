import { expect, test, type Page } from '@playwright/test';

/*
 * End-to-end coverage for the quilt builder's core loops: the fabric gate,
 * painting with undo/redo, block stamping, and autosave. Pure logic is unit
 * tested next to the modules; these specs cover the wiring.
 */

const ROUTE = '/journal/quilt-builder';
/** The working state autosave is debounced; wait it out before reloads. */
const AUTOSAVE_MS = 400;

test.use({ viewport: { width: 1440, height: 1400 } });

const cell = (page: Page, index: number) => page.locator(`[data-cell-index="${index}"]`);

const cellFills = (page: Page, index: number) =>
	page.$$eval(`[data-cell-index="${index}"] polygon`, (nodes) =>
		nodes.map((node) => node.getAttribute('fill'))
	);

/** Hover previews pollute fill reads; park the pointer off the quilt. */
const parkMouse = (page: Page) => page.mouse.move(10, 10);

const addFabric = async (page: Page, name: string, hex: string) => {
	await page.getByRole('button', { name: '+Add' }).click();
	const card = page.locator('.material').last();
	await card.getByPlaceholder('Name this fabric').fill(name);
	await card.locator('.hex').fill(hex);
	await card.locator('.hex').press('Enter');
	await card.getByRole('button', { name: /Use|Selected/ }).click();
};

test.beforeEach(async ({ page }) => {
	await page.goto(ROUTE);
	await page.evaluate(() => localStorage.removeItem('quilt-builder:v2'));
	await page.reload();
	await page.waitForSelector('[data-cell-index="0"]');
});

test('nothing can be placed until a fabric is added and named', async ({ page }) => {
	await cell(page, 0).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#ffffff']);

	await page.getByRole('button', { name: '+Add' }).click();
	await expect(page.locator('.banner')).toContainText(/name the selected fabric/i);
	await cell(page, 0).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#ffffff']);

	await page.getByPlaceholder('Name this fabric').fill('Blue');
	await cell(page, 0).click();
	await parkMouse(page);
	expect((await cellFills(page, 0))[0]).not.toBe('#ffffff');
});

test('a paint drag is one undo step and redo restores it', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();

	const start = await cell(page, 0).boundingBox();
	const end = await cell(page, 2).boundingBox();
	if (!start || !end) throw new Error('cells not found');
	await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
	await page.mouse.down();
	await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 10 });
	await page.mouse.up();
	await parkMouse(page);
	for (const i of [0, 1, 2]) expect(await cellFills(page, i)).toEqual(['#4f7fe8']);

	await page.keyboard.press('ControlOrMeta+z');
	await parkMouse(page);
	for (const i of [0, 1, 2]) expect(await cellFills(page, i)).toEqual(['#ffffff']);

	await page.keyboard.press('ControlOrMeta+Shift+z');
	await parkMouse(page);
	for (const i of [0, 1, 2]) expect(await cellFills(page, i)).toEqual(['#4f7fe8']);
});

test('stamping a block keeps the fabric underneath in the background slots', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	await cell(page, 5).click();

	await addFabric(page, 'Green', '38511f');
	await page.getByRole('tab', { name: 'Block' }).click();
	await page.getByRole('button', { name: 'Square in a square' }).click();
	await cell(page, 5).click();
	await parkMouse(page);

	expect(await cellFills(page, 5)).toEqual(['#38511f', '#4f7fe8', '#4f7fe8', '#4f7fe8', '#4f7fe8']);
	await expect(page.locator('.material').first()).toContainText('4½” squares: (2)');
	await expect(page.locator('.material').last()).toContainText('6⅛” squares: (1)');
});

test('the design, fabrics, and size survive a reload', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	await cell(page, 3).click();
	await page.getByLabel('Quilt name').fill('Stars');
	await page.getByLabel('Quilt size').selectOption('throw');
	await parkMouse(page);
	await page.waitForTimeout(AUTOSAVE_MS);

	await page.reload();
	await page.waitForSelector('[data-cell-index="0"]');
	await expect(page.getByLabel('Quilt name')).toHaveValue('Stars');
	await expect(page.getByLabel('Quilt size')).toHaveValue('throw');
	await expect(page.locator('.material')).toHaveCount(1);
	expect(await cellFills(page, 3)).toEqual(['#4f7fe8']);
});
