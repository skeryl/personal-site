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

/** Mouse tool click: selects, or toggles when shift is held. */
const selectCell = async (page: Page, index: number) => {
	await tool(page, /^Mouse/).click();
	await cell(page, index).click();
};

/*
 * Board indices depend on the quilt size, which is a product decision that
 * moves. Read the grid width off the caption and address cells by row and
 * column so these tests survive the next size change.
 */
const gridCols = async (page: Page) => {
	const caption = await page.locator('.caption').innerText();
	const match = caption.match(/(\d+)\s*×\s*(\d+)/);
	if (!match) throw new Error(`could not read grid size from caption: ${caption}`);
	return Number(match[1]);
};

const at = (cols: number, row: number, col: number) => row * cols + col;

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
	const cols = await gridCols(page);
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	await cell(page, 0).click();
	await addFabric(page, 'Green', '38511f');
	await cell(page, 1).click();
	await parkMouse(page);

	// Drag a box across both blocks, then save the selection.
	await tool(page, /^Mouse/).click();
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
	const anchor = at(cols, 3, 0);
	await cell(page, anchor).click();
	await parkMouse(page);
	expect(await cellFills(page, anchor)).toEqual(['#4f7fe8']);
	expect(await cellFills(page, anchor + 1)).toEqual(['#38511f']);
});

test('a pattern can be a non-rectangular shape', async ({ page }) => {
	const cols = await gridCols(page);
	// An L: top-left, the cell below it, and the cell right of that.
	const ell = [at(cols, 0, 0), at(cols, 1, 0), at(cols, 1, 1)];

	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	for (const i of ell) await cell(page, i).click();
	await parkMouse(page);

	// Shift-click three blocks in an L, which no rectangle covers.
	await tool(page, /^Mouse/).click();
	await cell(page, ell[0]).click();
	await cell(page, ell[1]).click({ modifiers: ['Shift'] });
	await cell(page, ell[2]).click({ modifiers: ['Shift'] });
	await expect(page.locator('.selection .hint')).toContainText('3 blocks selected');

	answerPrompt(page, 'Ell');
	await page.getByRole('button', { name: '+ Save selection' }).click();

	await tool(page, /^Place/).click();
	const anchor = at(cols, 4, 1);
	await cell(page, anchor).click();
	await parkMouse(page);
	// The L lands as an L: two down the left, one to the right of the bottom.
	expect(await cellFills(page, anchor)).toEqual(['#4f7fe8']);
	expect(await cellFills(page, anchor + cols)).toEqual(['#4f7fe8']);
	expect(await cellFills(page, anchor + cols + 1)).toEqual(['#4f7fe8']);
	// The cell right of the top is NOT part of the pattern.
	expect(await cellFills(page, anchor + 1)).toEqual(['#ffffff']);
});

const zoomLevel = (page: Page) => page.locator('.zoom-level');

test('ctrl and wheel zooms the wall, and the minimap appears once it overflows', async ({
	page
}) => {
	await expect(zoomLevel(page)).toHaveText('100%');
	await expect(page.locator('.minimap')).toHaveCount(0);

	const viewport = await page.locator('.viewport').boundingBox();
	if (!viewport) throw new Error('viewport not found');
	await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);

	// A plain wheel scrolls; it must not zoom.
	await page.mouse.wheel(0, -240);
	await expect(zoomLevel(page)).toHaveText('100%');

	await page.keyboard.down('Control');
	for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -120);
	await page.keyboard.up('Control');

	await expect(zoomLevel(page)).not.toHaveText('100%');
	await expect(page.locator('.minimap')).toBeVisible();

	// The zoom readout doubles as a reset.
	await zoomLevel(page).click();
	await expect(zoomLevel(page)).toHaveText('100%');
	await expect(page.locator('.minimap')).toHaveCount(0);
});

test('the zoom buttons step and clamp', async ({ page }) => {
	await page.getByRole('button', { name: 'Zoom in' }).click();
	await expect(zoomLevel(page)).toHaveText('125%');
	await page.getByRole('button', { name: 'Zoom out' }).click();
	await expect(zoomLevel(page)).toHaveText('100%');
	// 100% fits the whole quilt, so zooming out further is not offered.
	await expect(page.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
});

test('the minimap moves the visible region', async ({ page }) => {
	await page.keyboard.press('+');
	await page.keyboard.press('+');
	await page.keyboard.press('+');
	await page.keyboard.press('+');
	await page.keyboard.press('+');
	await page.keyboard.press('+');
	const minimap = page.locator('.minimap');
	await expect(minimap).toBeVisible();

	const before = await page.locator('.viewport').evaluate((el) => el.scrollLeft);
	const box = await minimap.boundingBox();
	if (!box) throw new Error('minimap not found');
	// Click near the right edge of the overview to jump the viewport right.
	await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.5);
	const after = await page.locator('.viewport').evaluate((el) => el.scrollLeft);
	expect(after).toBeGreaterThan(before);
});

test('the Grid tool paints a grid onto blocks without selecting them', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	await cell(page, 0).click();
	await cell(page, 1).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#4f7fe8']);

	// Choosing a grid with nothing selected arms the Grid tool.
	await composition(page, /^2 by 2$/).click();
	await expect(tool(page, /^Grid/)).toHaveClass(/active/);

	await cell(page, 0).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(Array(4).fill('#4f7fe8'));
	// The neighbour is untouched: painting does not need a selection.
	expect(await cellFills(page, 1)).toEqual(['#4f7fe8']);
});

test('G cycles the grid, and applies to a selection when there is one', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await page.getByRole('tab', { name: 'Piece' }).click();
	await cell(page, 0).click();
	await parkMouse(page);

	await selectCell(page, 0);
	// Cycling starts from what the selected block already is, which is one piece.
	await page.keyboard.press('g');
	await parkMouse(page);
	expect(await cellFills(page, 0)).toHaveLength(4);

	await page.keyboard.press('g');
	await parkMouse(page);
	expect(await cellFills(page, 0)).toHaveLength(16);

	// And it wraps back around to a single piece.
	await page.keyboard.press('g');
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#4f7fe8']);
});

test('middle-button drag pans the zoomed wall', async ({ page }) => {
	for (let i = 0; i < 6; i++) await page.keyboard.press('+');
	const viewport = page.locator('.viewport');
	const box = await viewport.boundingBox();
	if (!box) throw new Error('viewport not found');

	await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
	const before = await viewport.evaluate((el) => el.scrollLeft);
	await page.mouse.down({ button: 'middle' });
	await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6, { steps: 8 });
	await page.mouse.up({ button: 'middle' });

	const after = await viewport.evaluate((el) => el.scrollLeft);
	// Dragging left moves the content left, so the scroll offset grows.
	expect(after).toBeGreaterThan(before);
});

test('the wall labels its columns and rows, and names the selection', async ({ page }) => {
	const cols = await gridCols(page);
	// Default Throw at 8" blocks is six columns by eight rows.
	expect(cols).toBe(6);
	await expect(page.locator('.col-headers .head').first()).toHaveText('A');
	await expect(page.locator('.col-headers .head').last()).toHaveText('F');
	await expect(page.locator('.row-headers .head').first()).toHaveText('1');
	await expect(page.locator('.row-headers .head').last()).toHaveText('8');

	await expect(page.locator('.readout')).toHaveText('no squares selected');

	await tool(page, /^Mouse/).click();
	await cell(page, at(cols, 1, 2)).click();
	await expect(page.locator('.readout')).toHaveText('C2 square selected');

	await cell(page, at(cols, 2, 3)).click({ modifiers: ['Shift'] });
	await expect(page.locator('.readout')).toHaveText('C2, D3 squares selected');

	// Past four it collapses to a count rather than naming them all.
	for (const [r, c] of [
		[4, 0],
		[4, 1],
		[4, 2]
	]) {
		await cell(page, at(cols, r, c)).click({ modifiers: ['Shift'] });
	}
	await expect(page.locator('.readout')).toHaveText('5 squares selected');
});
