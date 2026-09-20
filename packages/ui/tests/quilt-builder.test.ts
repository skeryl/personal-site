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

/* Rotation moves geometry, not fill order, so it shows up in the points. */
const cellPoints = (page: Page, index: number) =>
	page.$$eval(`[data-cell-index="${index}"] polygon:not(.piece-outline)`, (nodes) =>
		nodes.map((node) => node.getAttribute('points'))
	);

/* Selection outlines are polygons too; they are decoration, not fabric. */
const cellFills = (page: Page, index: number) =>
	page.$$eval(`[data-cell-index="${index}"] polygon:not(.piece-outline)`, (nodes) =>
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

/** The palette has no tabs: cuts and block types sit in one Block type list. */
const pickShape = (page: Page, name: string) =>
	page.getByRole('button', { name, exact: true }).click();

/** Hover previews pollute fill reads; park the pointer off the quilt. */
const parkMouse = (page: Page) => page.mouse.move(10, 10);

/*
 * Colour lives in the Attributes palette now: adding one through the "+"
 * swatch makes it the active fabric, and naming it is optional.
 */
const addFabric = async (page: Page, name: string, hex: string) => {
	await page.locator('.palette .add input[type="color"]').fill(`#${hex}`);
	await page.locator('.active .name').fill(name);
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

test('nothing can be placed until a colour exists, and naming is optional', async ({ page }) => {
	// Mouse is the resting tool, so the wall talks about selecting until you
	// arm a shape.
	await expect(page.locator('.banner')).toContainText(/select filled squares/i);

	await pickShape(page, 'Square');
	await expect(page.locator('.banner')).toContainText(/add a color/i);
	await cell(page, 0).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#ffffff']);

	// Adding a colour is enough: it becomes active and placing works unnamed.
	await page.locator('.palette .add input[type="color"]').fill('#4f7fe8');
	await expect(page.locator('.banner')).toHaveCount(0);
	await cell(page, 0).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#4f7fe8']);
});

test('a paint drag is one undo step and redo restores it', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await pickShape(page, 'Square');

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
	await pickShape(page, 'Square');
	await cell(page, 5).click();

	await addFabric(page, 'Green', '38511f');
	await page.getByRole('button', { name: 'Square in a square' }).click();
	await cell(page, 5).click();
	await parkMouse(page);

	expect(await cellFills(page, 5)).toEqual(['#38511f', '#4f7fe8', '#4f7fe8', '#4f7fe8', '#4f7fe8']);
	await page.locator('.cut-list summary').click();
	await expect(page.locator('.cut-group').first()).toContainText('4½” squares: (2)');
	await expect(page.locator('.cut-group').last()).toContainText('6⅛” squares: (1)');
});

test('the design, fabrics, and size survive a reload', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await pickShape(page, 'Square');
	await cell(page, 3).click();
	await page.getByLabel('Quilt name').fill('Stars');
	await page.getByLabel('Quilt size').selectOption('throw');
	await parkMouse(page);
	await page.waitForTimeout(AUTOSAVE_MS);

	await page.reload();
	await page.waitForSelector('[data-cell-index="0"]');
	await expect(page.getByLabel('Quilt name')).toHaveValue('Stars');
	await expect(page.getByLabel('Quilt size')).toHaveValue('throw');
	await expect(page.locator('.palette .swatch:not(.add)')).toHaveCount(1);
	expect(await cellFills(page, 3)).toEqual(['#4f7fe8']);
});

test('composition subdivides a block without changing how it looks', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await pickShape(page, 'Square');
	await cell(page, 0).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#4f7fe8']);
	await page.locator('.cut-list summary').click();
	await expect(page.locator('.cut-group').first()).toContainText('8½” squares: (1)');

	await selectCell(page, 0);

	// Going finer replicates: four quarters of the same blue, so the picture
	// is unchanged but the cut list now wants four smaller squares.
	await composition(page, /^2 by 2$/).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(Array(4).fill('#4f7fe8'));
	await expect(page.locator('.cut-group').first()).toContainText('4½” squares: (4)');

	await composition(page, /^4 by 4$/).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(Array(16).fill('#4f7fe8'));
	await expect(page.locator('.cut-group').first()).toContainText('2½” squares: (16)');

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
	await pickShape(page, 'Square');
	await cell(page, 0).click();

	await selectCell(page, 0);
	await composition(page, /^2 by 2$/).click();

	await addFabric(page, 'Green', '38511f');
	await tool(page, /^Place/).click();
	await pickShape(page, 'Square');

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
	await pickShape(page, 'Square');
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
	await expect(page.locator('[data-panel="grid"] .hint')).toContainText('2 blocks selected');

	answerPrompt(page, 'Domino');
	await page.getByRole('button', { name: '+ Add selection as pattern' }).click();
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
	await pickShape(page, 'Square');
	for (const i of ell) await cell(page, i).click();
	await parkMouse(page);

	// Shift-click three blocks in an L, which no rectangle covers.
	await tool(page, /^Mouse/).click();
	await cell(page, ell[0]).click();
	await cell(page, ell[1]).click({ modifiers: ['Shift'] });
	await cell(page, ell[2]).click({ modifiers: ['Shift'] });
	await expect(page.locator('[data-panel="grid"] .hint')).toContainText('3 blocks selected');

	answerPrompt(page, 'Ell');
	await page.getByRole('button', { name: '+ Add selection as pattern' }).click();

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
	await pickShape(page, 'Square');
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
	await pickShape(page, 'Square');
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

test('the palette chooses which colour gets painted', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await addFabric(page, 'Green', '38511f');
	await expect(page.locator('.palette .swatch:not(.add)')).toHaveCount(2);

	// The colour just added is the active one.
	await pickShape(page, 'Square');
	await cell(page, 0).click();
	await parkMouse(page);
	expect(await cellFills(page, 0)).toEqual(['#38511f']);

	await page.getByRole('button', { name: 'Paint with Blue' }).click();
	await cell(page, 1).click();
	await parkMouse(page);
	expect(await cellFills(page, 1)).toEqual(['#4f7fe8']);
});

test('attributes lists the fabrics in a selection and remaps one', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await pickShape(page, 'Square');
	await cell(page, 0).click();
	await cell(page, 1).click();

	// Stamp a pinwheel over both: role 0 takes green, the rest keeps blue.
	await addFabric(page, 'Green', '38511f');
	await page.getByRole('button', { name: 'Pinwheel' }).click();
	await cell(page, 0).click();
	await cell(page, 1).click();
	await parkMouse(page);
	expect(new Set(await cellFills(page, 0))).toEqual(new Set(['#38511f', '#4f7fe8']));

	// With one block selected, Attributes names both of its fabrics.
	await tool(page, /^Mouse/).click();
	await cell(page, 0).click();
	await expect(page.locator('.colors .color')).toHaveCount(2);

	// Remapping green to blue leaves the block in one fabric.
	await page.locator('.colors .color').first().locator('.swatch').click();
	await page.locator('.picker').getByRole('button', { name: 'Blue' }).click();
	await parkMouse(page);
	expect(new Set(await cellFills(page, 0))).toEqual(new Set(['#4f7fe8']));

	// The neighbour was not selected, so it kept both fabrics.
	expect(new Set(await cellFills(page, 1))).toEqual(new Set(['#38511f', '#4f7fe8']));
});

test('attributes says so when nothing is selected', async ({ page }) => {
	await expect(page.locator('.attributes .hint').first()).toContainText('No blocks selected');
});

test('the app fits the window: only the wall and the palette scroll', async ({ page }) => {
	await page.selectOption('.size select', 'king');

	const state = await page.evaluate(() => {
		const viewport = document.querySelector('.viewport')!;
		const side = document.querySelector('.side')!;
		const body = document.querySelector('.body')!;
		return {
			pageOverflow: document.documentElement.scrollHeight - window.innerHeight,
			wallOverflowsAtFit:
				viewport.scrollHeight > viewport.clientHeight + 1 ||
				viewport.scrollWidth > viewport.clientWidth + 1,
			sideOverflowY: getComputedStyle(side).overflowY,
			sideOverflowsShell: side.clientHeight > body.clientHeight + 1
		};
	});

	// The page itself never scrolls.
	expect(state.pageOverflow).toBeLessThanOrEqual(0);
	// At 100% the whole quilt fits, so the wall has nothing to scroll.
	expect(state.wallOverflowsAtFit).toBe(false);
	// However long the palette gets, it scrolls inside the shell rather than
	// stretching it.
	expect(state.sideOverflowY).toBe('auto');
	expect(state.sideOverflowsShell).toBe(false);

	// Every header is drawn, none clipped off the top or left.
	await expect(page.locator('.col-headers .head')).toHaveCount(14);
	await expect(page.locator('.row-headers .head')).toHaveCount(14);

	// Zooming in is what makes the wall scroll.
	for (let i = 0; i < 4; i++) await page.keyboard.press('+');
	const zoomed = await page
		.locator('.viewport')
		.evaluate((el) => el.scrollHeight > el.clientHeight);
	expect(zoomed).toBe(true);
});

test('mouse is the default tool, and dragging lassos a rectangle', async ({ page }) => {
	await expect(tool(page, /^Mouse/)).toHaveClass(/active/);

	const cols = await gridCols(page);
	const a = await cell(page, at(cols, 1, 1)).boundingBox();
	const b = await cell(page, at(cols, 2, 3)).boundingBox();
	if (!a || !b) throw new Error('cells not found');

	// These squares are empty, so sweep with the modifier that takes them.
	await page.keyboard.down('ControlOrMeta');
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });

	// The lasso is drawn while the drag is in flight.
	await expect(page.locator('.lasso')).toBeVisible();
	// It must not displace the cells it covers: that would break the drag.
	const during = await cell(page, at(cols, 1, 1)).boundingBox();
	expect(during!.x).toBeCloseTo(a.x, 0);
	expect(during!.y).toBeCloseTo(a.y, 0);

	await page.mouse.up();
	await page.keyboard.up('ControlOrMeta');
	await expect(page.locator('.lasso')).toHaveCount(0);
	// Three columns by two rows.
	await expect(page.locator('.readout')).toHaveText('6 squares selected');
});

/*
 * Each cell's svg covers it exactly, and an inset box-shadow paints under
 * child content, so cell state has to be drawn with an outline. These assert
 * the state is actually VISIBLE, not merely that the class is applied.
 */
const outlineOf = (page: Page, index: number) =>
	cell(page, index).evaluate((el) => {
		const style = getComputedStyle(el);
		return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor };
	});

test('the mouse tool outlines the block under the cursor', async ({ page }) => {
	const cols = await gridCols(page);
	const target = at(cols, 2, 2);

	await cell(page, target).hover();
	await expect(cell(page, target)).toHaveClass(/hovered/);
	const hovered = await outlineOf(page, target);
	expect(hovered.style).toBe('solid');
	expect(parseFloat(hovered.width)).toBeGreaterThan(0);

	// A different tool hovers in a neutral colour, not the accent.
	await pickShape(page, 'Square');
	await cell(page, target).hover();
	const placing = await outlineOf(page, target);
	expect(placing.color).not.toBe(hovered.color);
});

test('selected blocks are outlined, not just labelled', async ({ page }) => {
	const cols = await gridCols(page);
	const target = at(cols, 2, 2);

	await cell(page, target).click();
	await parkMouse(page);
	await expect(page.locator('.readout')).toHaveText('C3 square selected');

	const outline = await outlineOf(page, target);
	expect(outline.style).toBe('solid');
	expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(3);

	// An unselected neighbour has no outline at all.
	const other = await outlineOf(page, at(cols, 2, 3));
	expect(parseFloat(other.width) || 0).toBe(0);
});

test('a block type lands in the sub-block under the cursor, like a cut does', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const plain = at(cols, 1, 1);
	const quartered = at(cols, 1, 2);

	// Give the second block a 2x2 grid.
	await cell(page, quartered).click();
	await page.getByRole('button', { name: '2 by 2', exact: true }).click();

	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	const box = await cell(page, plain).boundingBox();
	const other = await cell(page, quartered).boundingBox();
	if (!box || !other) throw new Error('cells not found');

	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.click(other.x + other.width * 0.15, other.y + other.height * 0.15);
	await parkMouse(page);

	// Whole block: four half square triangles, two pieces each.
	expect(await cellFills(page, plain)).toHaveLength(8);
	// One quarter: the same pinwheel plus the three squares left around it.
	expect(await cellFills(page, quartered)).toHaveLength(11);

	// And it is cut smaller, because it finished at a quarter of the block.
	await page.locator('.cut-list summary').click();
	await expect(page.locator('.cut-group').first()).toContainText('4½” squares');
	await expect(page.locator('.cut-group').first()).toContainText('2½” squares');
});

/** Alt-drag from one cell to another, which duplicates rather than moves. */
const altDrag = async (page: Page, from: number, to: number) => {
	const a = await cell(page, from).boundingBox();
	const b = await cell(page, to).boundingBox();
	if (!a || !b) throw new Error('cells not found');
	await page.keyboard.down('Alt');
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
	await page.mouse.up();
	await page.keyboard.up('Alt');
	await parkMouse(page);
};

test('alt-drag duplicates a block, leaving the original in place', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const from = at(cols, 1, 1);
	const to = at(cols, 3, 3);

	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	await cell(page, from).click();
	await parkMouse(page);
	const original = await cellFills(page, from);
	expect(original).toHaveLength(8);

	await tool(page, /^Mouse/).click();
	await altDrag(page, from, to);

	// A whole pieced square duplicates complete, and the source survives.
	expect(await cellFills(page, to)).toEqual(original);
	expect(await cellFills(page, from)).toEqual(original);
	// The copy is selected, so it can be recoloured straight away.
	await expect(page.locator('.readout')).toHaveText('D4 square selected');

	// One undo takes the whole duplication back.
	await page.keyboard.press('ControlOrMeta+z');
	await parkMouse(page);
	expect(await cellFills(page, to)).toEqual(['#ffffff']);
});

test('alt-drag carries a whole multi-selection', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	await pickShape(page, 'Square');
	await cell(page, at(cols, 0, 0)).click();
	await cell(page, at(cols, 0, 1)).click();
	await parkMouse(page);

	await tool(page, /^Mouse/).click();
	await cell(page, at(cols, 0, 0)).click();
	await cell(page, at(cols, 0, 1)).click({ modifiers: ['Shift'] });
	await expect(page.locator('.readout')).toHaveText('A1, B1 squares selected');

	await altDrag(page, at(cols, 0, 0), at(cols, 4, 0));
	expect(await cellFills(page, at(cols, 4, 0))).toEqual(['#4f7fe8']);
	expect(await cellFills(page, at(cols, 4, 1))).toEqual(['#4f7fe8']);
});

test('alt-drag refuses rather than clipping at the quilt edge', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	await pickShape(page, 'Square');
	await cell(page, at(cols, 0, 0)).click();
	await cell(page, at(cols, 0, 1)).click();
	await parkMouse(page);

	await tool(page, /^Mouse/).click();
	await cell(page, at(cols, 0, 0)).click();
	await cell(page, at(cols, 0, 1)).click({ modifiers: ['Shift'] });

	// Dropping the pair on the last column would put its partner off the edge.
	await altDrag(page, at(cols, 0, 0), at(cols, 2, cols - 1));
	expect(await cellFills(page, at(cols, 2, cols - 1))).toEqual(['#ffffff']);
});

/** Alt-click without moving, which drills to the piece under the cursor. */
const altClick = async (page: Page, index: number, fx: number, fy: number) => {
	const box = await cell(page, index).boundingBox();
	if (!box) throw new Error('cell not found');
	await page.keyboard.down('Alt');
	await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
	await page.mouse.down();
	await page.mouse.up();
	await page.keyboard.up('Alt');
	await parkMouse(page);
};

test('alt-click drills past the square to a single piece', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const target = at(cols, 1, 2);

	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	await cell(page, target).click();
	await parkMouse(page);
	const before = await cellFills(page, target);
	expect(before).toHaveLength(8);

	await tool(page, /^Mouse/).click();
	await altClick(page, target, 0.25, 0.12);

	await expect(page.locator('.readout')).toHaveText('C2 piece selected');
	// Exactly one piece is outlined, and only in that square.
	await expect(page.locator('polygon.piece-outline')).toHaveCount(1);
	// Attributes drops to a single colour, the piece's own.
	await expect(page.locator('.colors .color')).toHaveCount(1);

	// Recolouring touches exactly one piece of the eight.
	await addFabric(page, 'Green', '38511f');
	await page.locator('.colors .color').first().locator('.swatch').click();
	await page.locator('.picker').getByRole('button', { name: 'Green' }).click();
	await parkMouse(page);
	const after = await cellFills(page, target);
	expect(after.filter((f) => f === '#38511f')).toHaveLength(1);
	expect(after.filter((f, i) => f !== before[i])).toHaveLength(1);
});

test('a selected piece links up to the square that contains it', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const target = at(cols, 1, 2);
	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	await cell(page, target).click();
	await parkMouse(page);

	await tool(page, /^Mouse/).click();
	await altClick(page, target, 0.25, 0.12);
	await expect(page.locator('.readout')).toHaveText('C2 piece selected');

	// A pinwheel is a 2x2 of triangles, so the ladder has three rungs:
	// piece, the block holding it, then the square.
	await page.getByRole('button', { name: 'the block' }).click();
	await expect(page.locator('.readout')).toHaveText('C2 block selected');
	await expect(page.locator('polygon.piece-outline')).toHaveCount(0);
	await expect(page.locator('rect.node-outline')).toHaveCount(1);

	await page.getByRole('button', { name: 'the square' }).click();
	await expect(page.locator('.readout')).toHaveText('C2 square selected');
	await expect(page.locator('rect.node-outline')).toHaveCount(0);

	// Escape climbs the same ladder, one rung per press.
	await altClick(page, target, 0.25, 0.12);
	await expect(page.locator('.readout')).toHaveText('C2 piece selected');
	await page.keyboard.press('Escape');
	await expect(page.locator('.readout')).toHaveText('C2 block selected');
	await page.keyboard.press('Escape');
	await expect(page.locator('.readout')).toHaveText('C2 square selected');
});

test('alt still duplicates when the pointer moves', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const from = at(cols, 1, 1);
	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	await cell(page, from).click();
	await parkMouse(page);

	await tool(page, /^Mouse/).click();
	await altDrag(page, from, at(cols, 3, 3));

	// A drag duplicates; it must not have drilled into a piece instead.
	expect(await cellFills(page, at(cols, 3, 3))).toHaveLength(8);
	await expect(page.locator('.readout')).toHaveText('D4 square selected');
});

test('the grid applies to a selected block, not the whole square', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const target = at(cols, 1, 2);

	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	await cell(page, target).click();
	await parkMouse(page);
	expect(await cellFills(page, target)).toHaveLength(8);

	// Climb to one quarter of the pinwheel and subdivide just that quarter.
	await tool(page, /^Mouse/).click();
	await altClick(page, target, 0.25, 0.12);
	await page.getByRole('button', { name: 'the block' }).click();
	await page.getByRole('button', { name: '2 by 2', exact: true }).click();
	await parkMouse(page);

	/*
	 * Going finer replicates, so that quarter became four copies of its own
	 * triangle: eight pieces where there were two. The other three quarters
	 * are untouched, at two pieces each.
	 */
	expect(await cellFills(page, target)).toHaveLength(8 + 6);
});

test('rotate turns the selected squares, not just the palette', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const target = at(cols, 1, 1);

	await pickShape(page, 'Half square triangle');
	await cell(page, target).click();
	await parkMouse(page);
	const before = await cellPoints(page, target);

	// With nothing selected, R turns the pending block type only.
	await tool(page, /^Mouse/).click();
	await page.keyboard.press('r');
	await parkMouse(page);
	expect(await cellPoints(page, target)).toEqual(before);

	// With the square selected, R turns the square.
	await cell(page, target).click();
	await page.keyboard.press('r');
	await parkMouse(page);
	expect(await cellPoints(page, target)).not.toEqual(before);

	// Four turns come back to where it started.
	for (let i = 0; i < 3; i++) await page.keyboard.press('r');
	await parkMouse(page);
	expect(await cellPoints(page, target)).toEqual(before);

	// Each turn is its own undo step, not a lost edit.
	await expect(tool(page, /^Undo/)).toBeEnabled();
});

test('column and row headers stay frozen when the wall scrolls', async ({ page }) => {
	await page.selectOption('.size select', 'king');

	const probe = () =>
		page.evaluate(() => {
			const round = (n: number) => Math.round(n);
			const strip = document.querySelector('.col-strip')!.getBoundingClientRect();
			const rowStrip = document.querySelector('.row-strip')!.getBoundingClientRect();
			const firstCol = document.querySelector('.col-headers .head')!.getBoundingClientRect();
			const firstRow = document.querySelector('.row-headers .head')!.getBoundingClientRect();
			const cell = document.querySelector('[data-cell-index="0"]')!.getBoundingClientRect();
			return {
				stripTop: round(strip.top),
				stripLeft: round(rowStrip.left),
				colLeft: round(firstCol.left),
				rowTop: round(firstRow.top),
				cellLeft: round(cell.left),
				cellTop: round(cell.top)
			};
		});

	const fit = await probe();
	// Headers line up with the squares they label.
	expect(fit.colLeft).toBe(fit.cellLeft);
	expect(fit.rowTop).toBe(fit.cellTop);
	/*
	 * And they sit beside the quilt, not at the far edge of the wall. Zoomed
	 * out the quilt is centred, and the labels have to cross that slack with
	 * it rather than staying pinned to their gutters.
	 */
	const gap = await page.evaluate(() => {
		const rows = document.querySelector('.row-headers')!.getBoundingClientRect();
		const cols = document.querySelector('.col-headers')!.getBoundingClientRect();
		const quilt = document.querySelector('.blanket')!.getBoundingClientRect();
		return { left: quilt.left - rows.right, top: quilt.top - cols.bottom };
	});
	// Touching or nearly so; the tolerance is for sub-pixel layout, not slack.
	expect(gap.left).toBeGreaterThan(-2);
	expect(gap.left).toBeLessThan(12);
	expect(gap.top).toBeGreaterThan(-2);
	expect(gap.top).toBeLessThan(12);

	for (let i = 0; i < 7; i++) await page.keyboard.press('+');
	await page.locator('.viewport').evaluate((el) => {
		el.scrollLeft = 900;
		el.scrollTop = 700;
		el.dispatchEvent(new Event('scroll'));
	});

	const scrolled = await probe();
	// The gutters have not moved: they are pinned to the edges of the wall.
	expect(scrolled.stripTop).toBe(fit.stripTop);
	expect(scrolled.stripLeft).toBe(fit.stripLeft);
	// Their contents slid with the quilt, so labels still match their squares.
	expect(scrolled.colLeft).toBe(scrolled.cellLeft);
	expect(scrolled.rowTop).toBe(scrolled.cellTop);
	// And the quilt really did scroll away from the origin.
	expect(scrolled.cellLeft).toBeLessThan(fit.cellLeft);
});

test('palette sections collapse, and stay collapsed across a reload', async ({ page }) => {
	const typePanel = page.locator('[data-panel="type"]');
	const attributes = page.locator('[data-panel="attributes"]');

	// Everything starts open.
	await expect(typePanel).toHaveAttribute('open', '');
	await expect(page.getByRole('button', { name: 'Pinwheel', exact: true })).toBeVisible();

	// Collapsing Block type pulls the colours up the panel.
	const before = (await attributes.boundingBox())!.y;
	await typePanel.locator('summary').click();
	await expect(typePanel).not.toHaveAttribute('open', '');
	await expect(page.getByRole('button', { name: 'Pinwheel', exact: true })).toBeHidden();
	const after = (await attributes.boundingBox())!.y;
	expect(after).toBeLessThan(before);

	await page.waitForTimeout(AUTOSAVE_MS);
	await page.reload();
	await page.waitForSelector('[data-cell-index="0"]');
	await expect(page.locator('[data-panel="type"]')).not.toHaveAttribute('open', '');
	// The others were left alone.
	await expect(page.locator('[data-panel="grid"]')).toHaveAttribute('open', '');
});

test('delete empties the selected squares', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const a = at(cols, 1, 1);
	const b = at(cols, 1, 2);
	const keep = at(cols, 1, 3);

	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	for (const i of [a, b, keep]) await cell(page, i).click();
	await parkMouse(page);
	expect(await cellFills(page, a)).toHaveLength(8);

	await tool(page, /^Mouse/).click();
	await cell(page, a).click();
	await cell(page, b).click({ modifiers: ['Shift'] });
	await page.keyboard.press('Delete');
	await parkMouse(page);

	// Both reset to a blank square, grid and all.
	expect(await cellFills(page, a)).toEqual(['#ffffff']);
	expect(await cellFills(page, b)).toEqual(['#ffffff']);
	// The one that was not selected is untouched.
	expect(await cellFills(page, keep)).toHaveLength(8);

	// And it is one undo for the pair.
	await page.keyboard.press('ControlOrMeta+z');
	await parkMouse(page);
	expect(await cellFills(page, a)).toHaveLength(8);
	expect(await cellFills(page, b)).toHaveLength(8);
});

test('delete on a selected piece clears only that piece', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const target = at(cols, 1, 1);

	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	await cell(page, target).click();
	await parkMouse(page);
	const before = await cellFills(page, target);
	const filled = before.filter((f) => f === '#4f7fe8').length;

	await tool(page, /^Mouse/).click();
	await altClick(page, target, 0.25, 0.12);
	await page.keyboard.press('Delete');
	await parkMouse(page);

	const after = await cellFills(page, target);
	expect(after).toHaveLength(8);
	expect(after.filter((f) => f === '#4f7fe8')).toHaveLength(filled - 1);
});

test('delete with nothing selected arms the eraser instead', async ({ page }) => {
	await tool(page, /^Mouse/).click();
	await page.keyboard.press('Delete');
	await expect(tool(page, /^Erase/)).toHaveClass(/active/);
});

test('double-clicking a palette colour repaints every piece cut from it', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	await addFabric(page, 'Green', '38511f');
	const cols = await gridCols(page);
	const a = at(cols, 1, 1);
	const b = at(cols, 3, 2);

	// Two squares in blue, in different places, plus one in green.
	await page.getByRole('button', { name: 'Paint with Blue' }).click();
	await pickShape(page, 'Square');
	await cell(page, a).click();
	await cell(page, b).click();
	await page.getByRole('button', { name: 'Paint with Green' }).click();
	await cell(page, at(cols, 5, 4)).click();
	await parkMouse(page);
	expect(await cellFills(page, a)).toEqual(['#4f7fe8']);

	// Double-click aims the picker at Blue, and editing it repaints both.
	await page.getByRole('button', { name: /^Paint with Blue/ }).dblclick();
	await page.locator('.recolor-picker').fill('#ff0000');
	await parkMouse(page);

	expect(await cellFills(page, a)).toEqual(['#ff0000']);
	expect(await cellFills(page, b)).toEqual(['#ff0000']);
	// Green is untouched: only the fabric that was edited changed.
	expect(await cellFills(page, at(cols, 5, 4))).toEqual(['#38511f']);

	// The palette entry itself moved too, name intact.
	await page.getByRole('button', { name: /^Paint with Blue/ }).click();
	await expect(page.locator('.active .name')).toHaveValue('Blue');
	await expect(page.locator('.active .hex')).toHaveValue('FF0000');
});

test('a plain square is what is armed on load', async ({ page }) => {
	await expect(page.getByRole('button', { name: 'Square', exact: true })).toHaveClass(/active/);
	await expect(page.getByRole('button', { name: 'Pinwheel', exact: true })).not.toHaveClass(
		/active/
	);

	await addFabric(page, 'Blue', '4f7fe8');
	await tool(page, /^Place/).click();
	await cell(page, 0).click();
	await parkMouse(page);
	// One piece, not the eight a pinwheel would leave behind.
	expect(await cellFills(page, 0)).toEqual(['#4f7fe8']);
});

test('seam detail follows how much room a sub-cell has on screen', async ({ page }) => {
	await page.selectOption('.size select', 'king');
	const cols = await gridCols(page);
	const target = at(cols, 2, 2);

	// A 4x4 grid: sixteen sub-cells inside one square.
	await cell(page, target).click();
	await page.getByRole('button', { name: '4 by 4', exact: true }).click();
	await parkMouse(page);

	const seams = (index: number) =>
		page.evaluate((i) => {
			const found = document.querySelectorAll(`[data-cell-index="${i}"] rect.seam`);
			const first = found[0];
			return {
				count: found.length,
				width: first ? parseFloat(first.getAttribute('stroke-width') ?? '0') : 0
			};
		}, index);

	const out = await seams(target);
	for (let i = 0; i < 6; i++) await page.keyboard.press('+');
	const zoomedIn = await seams(target);

	// Zoomed in there is room for the seams; zoomed out they thin or vanish
	// rather than swamping the pieces they divide.
	expect(zoomedIn.count).toBeGreaterThan(0);
	expect(zoomedIn.width).toBeGreaterThan(out.width);

	// A plain square keeps its outline at every zoom: it has room either way.
	const plain = at(cols, 2, 4);
	await expect(page.locator(`[data-cell-index="${plain}"] polygon`)).toHaveCount(1);
});

test('a sweep takes filled squares, and a click takes whatever it names', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const filled = [at(cols, 1, 1), at(cols, 2, 2)];
	await pickShape(page, 'Square');
	for (const i of filled) await cell(page, i).click();
	await parkMouse(page);

	const sweep = async (from: number, to: number, modifier?: 'ControlOrMeta') => {
		const a = await cell(page, from).boundingBox();
		const b = await cell(page, to).boundingBox();
		if (!a || !b) throw new Error('cells not found');
		if (modifier) await page.keyboard.down(modifier);
		await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
		await page.mouse.down();
		await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
		await page.mouse.up();
		if (modifier) await page.keyboard.up(modifier);
		await parkMouse(page);
	};

	await tool(page, /^Mouse/).click();

	// A box over nine squares, only two of which hold anything.
	await sweep(at(cols, 1, 1), at(cols, 3, 3));
	await expect(page.locator('.readout')).toHaveText('B2, C3 squares selected');

	/*
	 * The same box with the modifier takes the empty ones too. Clear first:
	 * cmd on a square that is already selected picks the selection up and
	 * moves it instead, which is the other job that modifier does.
	 */
	await page.keyboard.press('Escape');
	await sweep(at(cols, 1, 1), at(cols, 3, 3), 'ControlOrMeta');
	await expect(page.locator('.readout')).toHaveText('9 squares selected');

	// Sweeping a region with nothing in it selects nothing, rather than
	// quietly falling back to taking everything.
	await sweep(at(cols, 5, 1), at(cols, 6, 3));
	await expect(page.locator('.readout')).toHaveText('no squares selected');

	// A click names one square and means it, empty or not.
	await cell(page, at(cols, 5, 1)).click();
	await expect(page.locator('.readout')).toHaveText('B6 square selected');
});

const centerToggle = (page: Page) =>
	page.locator('.actions').getByRole('button', { name: 'Center' });

/** Where a guide sits, against the squares it is supposed to bracket. */
const guideBounds = (page: Page, axis: 'vertical' | 'horizontal') =>
	page.locator(`.center-guide.${axis}`).boundingBox();

test('centre guides are off until asked for, and remembered after that', async ({ page }) => {
	await expect(page.locator('.center-guide')).toHaveCount(0);
	await expect(centerToggle(page)).not.toHaveClass(/active/);

	await centerToggle(page).click();
	await expect(centerToggle(page)).toHaveClass(/active/);
	await expect(page.locator('.center-guide')).toHaveCount(2);

	await page.waitForTimeout(AUTOSAVE_MS);
	await page.reload();
	await page.waitForSelector('[data-cell-index="0"]');
	await expect(page.locator('.center-guide')).toHaveCount(2);
});

test('the guides run the whole width and height of the quilt', async ({ page }) => {
	await page.selectOption('.size select', 'king');
	await centerToggle(page).click();

	const blanket = (await page.locator('.blanket').boundingBox())!;
	const vertical = (await guideBounds(page, 'vertical'))!;
	const horizontal = (await guideBounds(page, 'horizontal'))!;

	// Not a box around the middle squares: lines across the whole quilt.
	expect(vertical.height).toBeGreaterThan(blanket.height - 8);
	expect(horizontal.width).toBeGreaterThan(blanket.width - 8);
});

test('an even grid brackets the two columns and rows either side of centre', async ({ page }) => {
	await page.selectOption('.size select', 'king');
	await centerToggle(page).click();

	const cols = await gridCols(page);
	expect(cols).toBe(14);
	// Columns G and H, rows 7 and 8: no middle square on an even grid.
	const left = (await cell(page, at(cols, 0, 6)).boundingBox())!;
	const right = (await cell(page, at(cols, 0, 7)).boundingBox())!;
	const top = (await cell(page, at(cols, 6, 0)).boundingBox())!;
	const bottom = (await cell(page, at(cols, 7, 0)).boundingBox())!;

	const vertical = (await guideBounds(page, 'vertical'))!;
	const horizontal = (await guideBounds(page, 'horizontal'))!;
	expect(vertical.x).toBeCloseTo(left.x, 0);
	expect(vertical.x + vertical.width).toBeCloseTo(right.x + right.width, 0);
	expect(horizontal.y).toBeCloseTo(top.y, 0);
	expect(horizontal.y + horizontal.height).toBeCloseTo(bottom.y + bottom.height, 0);
});

test('an odd grid brackets its one real middle square', async ({ page }) => {
	// 40 inches of 8" blocks is five across and five down.
	await page.selectOption('.size select', 'custom');
	for (const box of [page.locator('.inches').first(), page.locator('.inches').last()]) {
		await box.fill('40');
		await box.blur();
	}
	await centerToggle(page).click();

	const cols = await gridCols(page);
	expect(cols).toBe(5);
	const middle = (await cell(page, at(cols, 2, 2)).boundingBox())!;
	const vertical = (await guideBounds(page, 'vertical'))!;
	expect(vertical.x).toBeCloseTo(middle.x, 0);
	expect(vertical.width).toBeCloseTo(middle.width, 0);
});

test('the quilt name and size head the canvas, and nothing is left over below', async ({
	page
}) => {
	// The title row sits above the quilt, inside the canvas column, not above
	// the whole builder: name to the left, size to the right.
	const side = (await page.locator('.side').boundingBox())!;
	const name = (await page.getByLabel('Quilt name').boundingBox())!;
	const size = (await page.locator('.size').boundingBox())!;
	const wall = (await page.locator('.wall-frame').boundingBox())!;

	expect(name.x).toBeGreaterThan(side.x + side.width - 2);
	expect(size.x).toBeGreaterThan(name.x + name.width - 2);
	expect(name.y).toBeLessThan(wall.y);

	// The page has no second heading of its own any more, and the builder
	// runs to the bottom edge rather than stopping short of it.
	await expect(page.locator('.qb h1')).toHaveCount(0);
	const fit = await page.evaluate(() => ({
		overflow: document.documentElement.scrollHeight - window.innerHeight,
		below: Math.round(
			window.innerHeight - document.querySelector('.wall-frame')!.getBoundingClientRect().bottom
		)
	}));
	expect(fit.overflow).toBeLessThanOrEqual(0);
	expect(fit.below).toBeLessThanOrEqual(1);
});

test('the block grid tiles are squares labelled by division', async ({ page }) => {
	const labels = await page.locator('.composition .chip-label').allInnerTexts();
	expect(labels.map((t) => t.trim())).toEqual(['(1)', '(2X2)', '(4X4)']);

	/*
	 * Each tile is the block itself, at the design's own 102 x 103.378, so the
	 * svg's units are literal pixels and its stroke values can be taken
	 * verbatim.
	 */
	const tile = (await page.locator('.composition .chip-grid').first().boundingBox())!;
	expect(tile.width).toBeCloseTo(102, -0.5);
	expect(tile.width / tile.height).toBeCloseTo(102 / 103.378, 2);

	// One piece has no seams; 2x2 has one each way; 4x4 has three.
	const seams = await page.$$eval('.composition .chip-grid', (grids) =>
		grids.map((g) => g.querySelectorAll('line').length)
	);
	expect(seams).toEqual([0, 2, 6]);

	// Seams are hairlines that run edge to edge, and the chosen tile is ruled
	// heavier: 1px and 1.5px, dashed 5 and 5, straight from the design.
	const drawn = await page.$$eval('.composition .chip', (chips) =>
		chips.map((chip) => {
			const svg = chip.querySelector('svg')!;
			const line = svg.querySelector('line');
			return {
				active: chip.classList.contains('active'),
				frame: svg.querySelector('rect')!.getAttribute('stroke-width'),
				stroke: line?.getAttribute('stroke-width') ?? null,
				dash: line ? getComputedStyle(line).strokeDasharray : null,
				spans: line ? [line.getAttribute('y1'), line.getAttribute('y2')].join('..') : null
			};
		})
	);
	for (const tileState of drawn) {
		const weight = tileState.active ? '1.5' : '1';
		expect(tileState.frame).toBe(weight);
		if (tileState.stroke === null) continue;
		expect(tileState.stroke).toBe(weight);
		expect(tileState.dash).toBe('5px, 5px');
		// Top edge to bottom edge, with no inset.
		expect(tileState.spans).toBe('0..103.378');
	}
});

test("the builder uses the design file's own colours and gutter", async ({ page }) => {
	const tokens = await page.evaluate(() => {
		const style = getComputedStyle(document.querySelector('.qb')!);
		const read = (name: string) => style.getPropertyValue(name).trim();
		return {
			accent: read('--qb-accent'),
			panel: read('--qb-panel'),
			wall: read('--qb-wall'),
			line: read('--qb-line'),
			square: read('--qb-square'),
			tile: read('--qb-tile'),
			ink: read('--qb-ink'),
			guide: read('--qb-guide')
		};
	});

	// Read out of the Figma file, not picked by eye.
	expect(tokens).toEqual({
		accent: '#763edf',
		panel: '#ffffff',
		wall: '#f3f3f3',
		line: '#cacaca',
		square: '#dfdfdf',
		tile: '#d9d9d9',
		ink: '#525252',
		guide: '#ff8585'
	});

	// A 426px panel with a 40px gutter, as the design lays it out.
	const side = (await page.locator('.side').boundingBox())!;
	expect(side.width).toBeCloseTo(426, 0);
	// Three tiles a row, square, inset 40px, with 20px between them.
	const tiles = await page.locator('[data-panel="type"] .type').all();
	const first = (await tiles[0].boundingBox())!;
	const second = (await tiles[1].boundingBox())!;
	expect(first.x - side.x).toBeCloseTo(40, 0);
	expect(first.width).toBeCloseTo(first.height, 0);
	expect(second.x - (first.x + first.width)).toBeCloseTo(20, 0);
});

test('nothing is subdivided on load, so the one-piece tile is the armed one', async ({ page }) => {
	const tiles = page.locator('.composition .chip');
	await expect(tiles.nth(0)).toHaveClass(/active/);
	await expect(tiles.nth(1)).not.toHaveClass(/active/);
	await expect(tiles.nth(2)).not.toHaveClass(/active/);

	// G cycles on from there rather than starting part way along.
	await page.keyboard.press('g');
	await expect(tiles.nth(1)).toHaveClass(/active/);
	await expect(tiles.nth(0)).not.toHaveClass(/active/);
});

/** Cmd/ctrl-drag from a selected square, which moves the selection. */
const moveDrag = async (page: Page, from: number, to: number, cancel = false) => {
	const a = await cell(page, from).boundingBox();
	const b = await cell(page, to).boundingBox();
	if (!a || !b) throw new Error('cells not found');
	await page.keyboard.down('ControlOrMeta');
	await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
	await page.mouse.down();
	await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
	if (cancel) await page.keyboard.press('Escape');
	await page.mouse.up();
	await page.keyboard.up('ControlOrMeta');
	await parkMouse(page);
};

test('cmd-drag moves the selection, leaving its old squares empty', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const from = at(cols, 1, 1);
	const to = at(cols, 4, 3);

	await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
	await cell(page, from).click();
	await parkMouse(page);
	const block = await cellFills(page, from);
	expect(block).toHaveLength(8);

	await tool(page, /^Mouse/).click();
	await cell(page, from).click();
	await moveDrag(page, from, to);

	// Moved, not copied: the source is empty and the block is at the target.
	expect(await cellFills(page, to)).toEqual(block);
	expect(await cellFills(page, from)).toEqual(['#ffffff']);
	await expect(page.locator('.readout')).toHaveText('D5 square selected');

	// One undo puts it back where it was.
	await page.keyboard.press('ControlOrMeta+z');
	await parkMouse(page);
	expect(await cellFills(page, from)).toEqual(block);
	expect(await cellFills(page, to)).toEqual(['#ffffff']);
});

test('a move that overlaps its own source keeps every block', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const a = at(cols, 1, 1);
	const b = at(cols, 1, 2);

	await pickShape(page, 'Square');
	for (const i of [a, b]) await cell(page, i).click();
	await parkMouse(page);

	await tool(page, /^Mouse/).click();
	await cell(page, a).click();
	await cell(page, b).click({ modifiers: ['Shift'] });

	// Shift the pair one square right, so the target overlaps the source.
	await moveDrag(page, a, b);
	expect(await cellFills(page, a)).toEqual(['#ffffff']);
	expect(await cellFills(page, b)).toEqual(['#4f7fe8']);
	expect(await cellFills(page, at(cols, 1, 3))).toEqual(['#4f7fe8']);
});

test('escape during a drag drops nothing', async ({ page }) => {
	await addFabric(page, 'Blue', '4f7fe8');
	const cols = await gridCols(page);
	const from = at(cols, 1, 1);
	const to = at(cols, 4, 3);

	await pickShape(page, 'Square');
	await cell(page, from).click();
	await parkMouse(page);

	await tool(page, /^Mouse/).click();
	await cell(page, from).click();
	await moveDrag(page, from, to, true);

	// Nothing moved, and nothing was left behind at the target.
	expect(await cellFills(page, from)).toEqual(['#4f7fe8']);
	expect(await cellFills(page, to)).toEqual(['#ffffff']);
});
