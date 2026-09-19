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

/** Toolbar buttons, scoped so "Select" cannot match a fabric's "Selected". */
const tool = (page: Page, name: RegExp) => page.locator('.actions').getByRole('button', { name });

/** The composition control lives in the left palette, not the wall toolbar. */
const composition = (page: Page, name: RegExp) =>
	page.locator('.composition').getByRole('button', { name });

/** Select tool click: selects, or toggles when shift is held. */
const selectCell = async (page: Page, index: number) => {
	await tool(page, /^Select/).click();
	await cell(page, index).click();
};

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
	await page.evaluate(() => {
		localStorage.removeItem('quilt-builder:v3');
		localStorage.removeItem('quilt-builder:v2');
	});
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

test('composition subdivides a block without changing how it looks', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	await cell(page, 0).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#4f7fe8']);
	await expect(page.locator('.material').first()).toContainText('8½” squares: (1)');

	await selectCell(page, 0);

	// Going finer replicates: four quarters of the same blue, so the picture
	// is unchanged but the cut list now wants four smaller squares.
	await composition(page, /^2 by 2$/).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(Array(4).fill('#4f7fe8'));
	await expect(page.locator('.material').first()).toContainText('4½” squares: (4)');

	await composition(page, /^4 by 4$/).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(Array(16).fill('#4f7fe8'));
	await expect(page.locator('.material').first()).toContainText('2½” squares: (16)');

	// Coarsening keeps each group's top-left piece, and undo restores the 4x4.
	await composition(page, /^One piece$/).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#4f7fe8']);
	await page.keyboard.press('ControlOrMeta+z');
	await parkMouse(page);
	expect(await cellFills(page, 0)).toHaveLength(16);
});

test('a composed block can be painted one child at a time', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	await cell(page, 0).click();

	await selectCell(page, 0);
	await composition(page, /^2 by 2$/).click();

	await addFabric(page, 'Green', '38511f');
	await tool(page, /^Place/).click();
	await page.getByRole('tab', { name: 'Piece' }).click();

	// Click inside the top-left quarter only.
	const box = await cell(page, 0).boundingBox();
	if (!box) throw new Error('cell not found');
	await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#38511f', '#4f7fe8', '#4f7fe8', '#4f7fe8']);
});

/** prompt() is how a pattern gets named; answer it with `name`. */
const answerPrompt = (page: Page, name: string) =>
	page.once('dialog', (dialog) => dialog.accept(name));

test('a multi-block selection saves as one pattern and stamps as one', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	await cell(page, 0).click();
	await addFabric(page, 'Green', '38511f');
	await cell(page, 1).click();
	await parkMouse(page);

	// Drag a box across both blocks, then save the selection.
	await tool(page, /^Select/).click();
	const a = await cell(page, 0).boundingBox();
	const b = await cell(page, 1).boundingBox();
	if (!a || !b) throw new Error('cells not found');
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
	await page.mouse.up();
	await expect(page.locator('.selection .hint')).toContainText('2 blocks selected');

	answerPrompt(page, 'Domino');
	await page.getByRole('button', { name: '+ Save selection' }).click();
	await expect(page.getByRole('button', { name: 'Domino', exact: true })).toBeVisible();

	// Stamping it lays both blocks down at once, in order.
	await tool(page, /^Place/).click();
	await cell(page, 30).click();
	await parkMouse(page);
	expect(await cellFills(page, 30)).toEqual(['#4f7fe8']);
	expect(await cellFills(page, 31)).toEqual(['#38511f']);
});

test('a pattern can be a non-rectangular shape', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	for (const i of [0, 14, 15]) await cell(page, i).click();
	await parkMouse(page);

	// Shift-click three blocks in an L, which no rectangle covers.
	await tool(page, /^Select/).click();
	await cell(page, 0).click();
	await cell(page, 14).click({ modifiers: ['Shift'] });
	await cell(page, 15).click({ modifiers: ['Shift'] });
	await expect(page.locator('.selection .hint')).toContainText('3 blocks selected');

	answerPrompt(page, 'Ell');
	await page.getByRole('button', { name: '+ Save selection' }).click();

	await tool(page, /^Place/).click();
	await cell(page, 60).click();
	await parkMouse(page);
	// The L lands as an L: two down the left, one to the right of the bottom.
	expect(await cellFills(page, 60)).toEqual(['#4f7fe8']);
	expect(await cellFills(page, 74)).toEqual(['#4f7fe8']);
	expect(await cellFills(page, 75)).toEqual(['#4f7fe8']);
	// The cell right of the top is NOT part of the pattern.
	expect(await cellFills(page, 61)).toEqual(['#ffffff']);
});
