import { expect, test, type Page } from '@playwright/test';

/*
 * End-to-end coverage for the calc builder's core loop: select a slot, fill
 * it from the palette, watch the live results. Pure logic (AST editing,
 * evaluation, typechecking) is unit tested next to the modules; these specs
 * cover the wiring.
 */

const ROUTE = '/journal/calc-builder';

test.use({ viewport: { width: 1440, height: 1200 } });

const op = (page: Page, id: string) => page.locator(`[data-op-id="${id}"]`);
const field = (page: Page, id: string) => page.locator(`[data-field-id="${id}"]`);
const slot = (page: Page, key: string) => page.locator(`[data-slot-path="${key}"]`);
const resultValues = (page: Page) => page.locator('.result-value');
const status = (page: Page) => page.locator('.status');

const useNumber = async (page: Page, value: string) => {
	await page.getByLabel('Number literal').fill(value);
	await page.locator('[data-literal="number"]').click();
};

const useString = async (page: Page, value: string) => {
	await page.getByLabel('Text literal').fill(value);
	await page.locator('[data-literal="string"]').click();
};

/** Load a stored calc from the Library tab, then return to Results. */
const loadFromLibrary = async (page: Page, id: string) => {
	await page.locator('[data-tab="library"]').click();
	await page.locator(`[data-calc-load="${id}"]`).click();
	await page.locator('[data-tab="results"]').click();
};

test.beforeEach(async ({ page }) => {
	await page.goto(ROUTE);
	await page.waitForSelector('[data-slot-path="root"]');
	// Library is the landing tab; most assertions below read Results.
	await page.locator('[data-tab="results"]').click();
});

test('builds market value with palette clicks and shows live results', async ({ page }) => {
	// The root slot is selected on load; fills auto-advance left to right.
	await op(page, 'mul').click();
	await field(page, 'price').click();
	await field(page, 'quantity').click();

	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page)).toHaveText(['7500', '2500', '8000']);
});

test('type gating disables incompatible palette entries', async ({ page }) => {
	await op(page, 'mul').click();
	// The selected slot now expects a number.
	await expect(op(page, 'and')).toHaveAttribute('aria-disabled', 'true');
	await expect(page.locator('[data-literal="true"]')).toBeDisabled();
	await expect(field(page, 'dailyReturns')).toHaveAttribute('aria-disabled', 'true');
	await expect(field(page, 'price')).toHaveAttribute('aria-disabled', 'false');

	// Gated clicks are ignored: the tree still has both inputs empty.
	// (force: Playwright refuses normal clicks on aria-disabled elements.)
	await op(page, 'and').click({ force: true });
	await expect(status(page)).toContainText('2 empty slots');
});

test('incomplete trees report empty slots and dash results', async ({ page }) => {
	await op(page, 'mul').click();
	await field(page, 'price').click();

	await expect(status(page)).toContainText('1 empty slot');
	await expect(resultValues(page)).toHaveText(['—', '—', '—']);
});

test('switch/case matches per record with a fallback', async ({ page }) => {
	await op(page, 'switch').click();
	// Auto-advance walks on, when, then, otherwise.
	await field(page, 'symbol').click();
	await useString(page, 'AAPL');
	await useNumber(page, '1');
	await useNumber(page, '0');

	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page)).toHaveText(['1', '0', '0']);
});

test('aggregations consume array fields and flag empty arrays', async ({ page }) => {
	await op(page, 'avg').click();
	await field(page, 'dailyReturns').click();

	await expect(resultValues(page)).toHaveText(['2', '0', 'empty array']);
	await expect(resultValues(page).nth(2)).toHaveClass(/error/);
});

test('removing a node empties and reselects its slot for refilling', async ({ page }) => {
	await op(page, 'mul').click();
	await field(page, 'price').click();
	await field(page, 'quantity').click();

	await page.locator('[data-remove="input.1"]').click();
	await expect(slot(page, 'input.1')).toHaveClass(/selected/);
	await expect(resultValues(page)).toHaveText(['—', '—', '—']);

	await field(page, 'costBasis').click();
	await expect(resultValues(page)).toHaveText(['28125', '75000', '6400']);
});

test('switching models swaps palette fields and flags stale refs', async ({ page }) => {
	await op(page, 'avg').click();
	await field(page, 'dailyReturns').click();

	await page.locator('[data-model-id="order-book"]').click();
	await expect(field(page, 'bidSizes')).toBeVisible();
	await expect(page.locator('[data-issue]')).toContainText('dailyReturns');
	await expect(resultValues(page)).toHaveText(['unknown field', 'unknown field', 'unknown field']);
});

test('plucks credit scores out of nested reference data via suggestions', async ({ page }) => {
	await op(page, 'avg').click();
	await op(page, 'pluck').click();
	await field(page, 'instrument.creditRatings').click();
	// The element-field slot offers the numeric fields instead of free typing.
	await page.locator('[data-suggestion="score"]').click();

	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page)).toHaveText(['19', '12', 'empty array']);
});

test('looks up a rating by agency and switches on it', async ({ page }) => {
	await op(page, 'switch').click();
	// The scrutinee: rating where agency = "moodys", built from suggestion chips.
	await op(page, 'lookupString').click();
	await field(page, 'instrument.creditRatings').click();
	await page.locator('[data-suggestion="agency"]').click();
	await page.locator('[data-suggestion="moodys"]').click();
	await page.locator('[data-suggestion="rating"]').click();
	// when "AA" then 1, otherwise 0.
	await useString(page, 'AA');
	await useNumber(page, '1');
	await useNumber(page, '0');

	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page)).toHaveText(['1', '0', 'no match']);
});

test('clicking a leaf selects it for in-place replacement', async ({ page }) => {
	await op(page, 'mul').click();
	await field(page, 'price').click();
	await field(page, 'quantity').click();

	await page.locator('[data-node-path="input.1"] .leaf-btn').click();
	await expect(page.locator('[data-node-path="input.1"]')).toHaveClass(/selected/);
	await field(page, 'costBasis').click();
	await expect(resultValues(page)).toHaveText(['28125', '75000', '6400']);
});

test('removing a filled branch asks for confirmation', async ({ page }) => {
	await op(page, 'mul').click();
	await field(page, 'price').click();
	await field(page, 'quantity').click();

	page.once('dialog', (dialog) => dialog.dismiss());
	await page.locator('[data-remove="root"]').click();
	await expect(status(page)).toHaveAttribute('data-status', 'complete');

	page.once('dialog', (dialog) => dialog.accept());
	await page.locator('[data-remove="root"]').click();
	await expect(status(page)).toContainText('1 empty slot');
});

test('the palette explains deselected and complete states', async ({ page }) => {
	await expect(page.locator('.palette .hint').first()).toContainText('Filling a');
	await page.keyboard.press('Escape');
	await expect(page.locator('.palette .hint').first()).toContainText('Nothing selected');

	await page.locator('[data-slot-path="root"]').click();
	await op(page, 'count').click();
	await field(page, 'dailyReturns').click();
	await expect(page.locator('.palette .hint').first()).toContainText('Calculation complete');
});

test('variadic operators grow and shrink their inputs', async ({ page }) => {
	await op(page, 'add').click();
	await page.locator('[data-add-input="root"]').click();
	await expect(status(page)).toContainText('3 empty slots');
	// The new slot opens its menu with the filter ready for typing.
	await expect(slot(page, 'input.2')).toHaveClass(/selected/);
	await expect(page.getByLabel('Filter options')).toBeFocused();

	await page.locator('[data-remove-input="root:2"]').click();
	await expect(status(page)).toContainText('2 empty slots');
});

test('composes stored calcs: the consensus example references two others', async ({ page }) => {
	await loadFromLibrary(page, 'consensus-grade');
	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page)).toHaveText(['19', '12.5', 'no match']);
	await expect(page.getByLabel('Calculation expression')).toHaveValue(
		'(@moodys-grade + @sp-grade) / 2'
	);
	// The references render as labeled calc chips.
	await expect(page.locator('.leaf.calc')).toHaveCount(2);
	await expect(page.locator('.leaf.calc').first()).toContainText("Moody's rating as a number");
});

test('aggregations accept scalar numbers, including calc refs', async ({ page }) => {
	await op(page, 'avg').click();
	// The numeric slot admits number-producing library calcs directly.
	await slot(page, 'input.0').click();
	await page.locator('[data-menu-calc="moodys-grade"]').click();
	await expect(status(page)).toHaveAttribute('data-status', 'complete');

	// Grow the aggregation and average a second agency's grade.
	await page.locator('[data-add-input="root"]').click();
	await slot(page, 'input.1').click();
	await page.locator('[data-menu-calc="sp-grade"]').click();

	await expect(page.getByLabel('Calculation expression')).toHaveValue(
		'avg(@moodys-grade, @sp-grade)'
	);
	await expect(resultValues(page)).toHaveText(['19', '12.5', 'no match']);

	// Mixing an array field into the same aggregation still works.
	await page.locator('[data-add-input="root"]').click();
	await slot(page, 'input.2').click();
	await page.locator('[data-menu-field="dailyReturns"]').click();
	// AAPL: (19 + 19 + 1 + 2 + 3) / 5
	await expect(resultValues(page).first()).toHaveText('8.8');
});

test('referenced-in chips navigate to the calcs using this one', async ({ page }) => {
	await loadFromLibrary(page, 'moodys-grade');
	const chip = page.locator('[data-ref-in="consensus-grade"]');
	await expect(chip).toContainText('Consensus grade');

	// A freshly loaded tree is clean, so navigating asks nothing.
	await chip.click();
	await expect(page.getByLabel('Calculation name')).toHaveValue('Consensus grade');
	await expect(page.getByLabel('Calculation expression')).toHaveValue(
		'(@moodys-grade + @sp-grade) / 2'
	);
	// The consensus calc itself has no referencers.
	await expect(page.locator('[data-ref-in]')).toHaveCount(0);
});

test('inserts a library calc as a node from the popover', async ({ page }) => {
	await slot(page, 'root').click();
	await page.locator('[data-menu-calc="market-value"]').click();
	await expect(resultValues(page)).toHaveText(['7500', '2500', '8000']);
	await expect(page.getByLabel('Calculation expression')).toHaveValue('@market-value');
});

test('saves the current calc to the library and reuses it', async ({ page }) => {
	await op(page, 'count').click();
	await field(page, 'dailyReturns').click();

	await page.getByLabel('Calculation name').fill('Daily return count');
	await page.locator('[data-save-calc]').click();
	// Saving never yanks the view; the entry shows when the user opens Library.
	await page.locator('[data-tab="library"]').click();
	await expect(page.locator('[data-lib-row="daily-return-count"]')).toBeVisible();

	// Editing and saving again appends a version to the same entry.
	await page.locator('[data-op-select="root"]').selectOption('sum');
	await page.locator('[data-save-calc]').click();
	await expect(page.locator('[data-lib-row="daily-return-count"]')).toHaveCount(1);
	await expect(page.locator('[data-lib-row="daily-return-count"]')).toContainText(
		'sum(dailyReturns)'
	);

	// A saved tree is clean, so Clear no longer asks.
	await page.getByRole('button', { name: 'Clear' }).click();
	await slot(page, 'root').click();
	await page.locator('[data-menu-calc="daily-return-count"]').click();
	await page.locator('[data-tab="results"]').click();
	await expect(resultValues(page)).toHaveText(['6', '0', '0']);
	await expect(page.getByLabel('Calculation expression')).toHaveValue('@daily-return-count');
});

test('the DSL understands @calc references', async ({ page }) => {
	const bar = page.getByLabel('Calculation expression');
	await bar.fill('@moodys-grade * 2');
	await bar.press('Enter');
	await expect(resultValues(page)).toHaveText(['38', '22', 'no match']);
});

test('clicking a slot opens an in-place popover that fills it', async ({ page }) => {
	await slot(page, 'root').click();
	const menu = page.locator('[data-slot-menu]');
	await expect(menu).toBeVisible();
	await menu.locator('[data-menu-op="mul"]').click();
	await expect(menu).toHaveCount(0);

	await slot(page, 'input.0').click();
	await page.locator('[data-menu-field="price"]').click();
	await slot(page, 'input.1').click();
	await page.locator('[data-menu-field="quantity"]').click();
	await expect(resultValues(page)).toHaveText(['7500', '2500', '8000']);

	// Clicking a leaf pops the same menu for in-place replacement.
	await page.locator('[data-node-path="input.1"] .leaf-btn').click();
	await page.locator('[data-menu-field="costBasis"]').click();
	await expect(resultValues(page)).toHaveText(['28125', '75000', '6400']);
});

test('the popover filter narrows options and Enter picks the first match', async ({ page }) => {
	await slot(page, 'root').click();
	const filter = page.getByLabel('Filter options');
	await expect(filter).toBeFocused();
	await filter.fill('moody');
	await expect(page.locator('[data-menu-calc="moodys-grade"]')).toBeVisible();
	await expect(page.locator('[data-menu-op="mul"]')).toHaveCount(0);
	await expect(page.locator('[data-menu-field="price"]')).toHaveCount(0);
	await filter.press('Enter');
	await expect(page.getByLabel('Calculation expression')).toHaveValue('@moodys-grade');

	// A whole calc built from the keyboard: click slot, type, Enter.
	await page.locator('[data-remove="root"]').click();
	for (const [key, text] of [
		['root', 'mul'],
		['input.0', 'price'],
		['input.1', 'quantity']
	] as const) {
		await slot(page, key).click();
		await page.getByLabel('Filter options').fill(text);
		await page.getByLabel('Filter options').press('Enter');
	}
	await expect(resultValues(page)).toHaveText(['7500', '2500', '8000']);

	// A hopeless query says so instead of showing an empty menu.
	await page.locator('[data-node-path="input.1"] .leaf-btn').click();
	await page.getByLabel('Filter options').fill('zzz');
	await expect(page.locator('[data-slot-menu]')).toContainText('Nothing matches');
});

test('the popover offers suggestions and dismisses on Escape and outside clicks', async ({
	page
}) => {
	await op(page, 'avg').click();
	await op(page, 'pluck').click();
	await field(page, 'instrument.creditRatings').click();

	await slot(page, 'input.0/input.1').click();
	await page.locator('[data-menu-suggestion="score"]').click();
	await expect(status(page)).toHaveAttribute('data-status', 'complete');

	await page.locator('[data-node-path="input.0/input.1"] .leaf-btn').click();
	await expect(page.locator('[data-slot-menu]')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('[data-slot-menu]')).toHaveCount(0);

	await page.locator('[data-node-path="input.0/input.1"] .leaf-btn').click();
	await page.locator('.hero h1').click();
	await expect(page.locator('[data-slot-menu]')).toHaveCount(0);
});

test('the operator dropdown swaps compatible operators in place', async ({ page }) => {
	await op(page, 'sum').click();
	await field(page, 'dailyReturns').click();
	await expect(resultValues(page)).toHaveText(['6', '0', '0']);

	await page.locator('[data-op-select="root"]').selectOption('max');
	await expect(resultValues(page)).toHaveText(['3', '3', 'empty array']);
	await expect(page.getByLabel('Calculation expression')).toHaveValue('max(dailyReturns)');

	// A unique signature keeps a static header instead of a dropdown.
	page.once('dialog', (dialog) => dialog.accept());
	await loadFromLibrary(page, 'avg-credit-score');
	await expect(page.locator('[data-op-select="input.0"]')).toHaveCount(0);
	await expect(page.locator('[data-op-select="root"]')).toBeVisible();
});

test('typing a DSL expression builds the tree and evaluates', async ({ page }) => {
	const bar = page.getByLabel('Calculation expression');
	await bar.fill('(price - costBasis) * quantity');
	await bar.press('Enter');

	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page)).toHaveText(['1500', '-500', '0']);
	await expect(page.locator('[data-node-path="root"]').first()).toBeVisible();
});

test('editing the tree rewrites the DSL bar', async ({ page }) => {
	const bar = page.getByLabel('Calculation expression');
	await op(page, 'mul').click();
	await field(page, 'price').click();
	await expect(bar).toHaveValue('price * _');
	await field(page, 'quantity').click();
	await expect(bar).toHaveValue('price * quantity');

	page.once('dialog', (dialog) => dialog.accept());
	await loadFromLibrary(page, 'avg-credit-score');
	await expect(bar).toHaveValue('avg(pluck(instrument.creditRatings, "score"))');
});

test('invalid DSL shows an error and leaves the tree alone', async ({ page }) => {
	await op(page, 'count').click();
	await field(page, 'dailyReturns').click();

	const bar = page.getByLabel('Calculation expression');
	await bar.fill('count(dailyReturns');
	await bar.press('Enter');
	await expect(page.locator('[data-dsl-error]')).toContainText('Expected ")"');
	await expect(resultValues(page)).toHaveText(['3', '4', '0']);

	// Escape reverts the draft to the tree's expression.
	await bar.press('Escape');
	await expect(bar).toHaveValue('count(dailyReturns)');
});

test('maps number arrays with the item element field in scope', async ({ page }) => {
	await op(page, 'map').click();
	await field(page, 'dailyReturns').click();
	// Inside the body, the palette gains an "item" element field.
	await op(page, 'mul').click();
	await field(page, 'item').click();
	await field(page, 'quantity').click();

	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page).first()).toHaveText('[40, 80, 120]');
});

test('loads the mapped rating-grade example', async ({ page }) => {
	await loadFromLibrary(page, 'avg-rating-grade');
	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page)).toHaveText(['18.3333', '12.5', 'empty array']);
});

test('loads calcs, confirming only over unsaved changes', async ({ page }) => {
	await loadFromLibrary(page, 'avg-credit-score');
	await expect(resultValues(page)).toHaveText(['19', '12', 'empty array']);

	// A freshly loaded tree is clean: the next load happens without a dialog.
	await loadFromLibrary(page, 'moodys-grade');
	await expect(resultValues(page)).toHaveText(['19', '11', 'no match']);

	// Editing makes it dirty; declining the confirm keeps the edit.
	await page.locator('[data-remove="fallback"]').click();
	await expect(status(page)).toContainText('1 empty slot');
	page.once('dialog', (dialog) => dialog.dismiss());
	await loadFromLibrary(page, 'avg-credit-score');
	await expect(status(page)).toContainText('1 empty slot');

	// Accepting loads a cross-model example, which switches the model too.
	page.once('dialog', (dialog) => dialog.accept());
	await loadFromLibrary(page, 'book-imbalance');
	await expect(page.locator('[data-model-id="order-book"]')).toHaveClass(/active/);
	await expect(resultValues(page)).toHaveText(['1.5', '0.25', '0']);

	// The library tab leads with the selected model's calcs.
	await page.locator('[data-tab="library"]').click();
	const currentRows = page.locator('[data-lib-group="current"] [data-lib-row]');
	await expect(currentRows).toHaveCount(1);
	await expect(currentRows).toContainText('Order book imbalance');
	await expect(page.locator('[data-lib-group="other"] [data-lib-row]').first()).toBeVisible();
});

test('persists the working calc and library saves across reloads', async ({ page }) => {
	await op(page, 'count').click();
	await field(page, 'dailyReturns').click();
	await page.getByLabel('Calculation name').fill('Persisted calc');
	await page.locator('[data-save-calc]').click();
	await page.locator('[data-tab="library"]').click();
	await expect(page.locator('[data-lib-row="persisted-calc"]')).toBeVisible();

	await page.reload();
	await page.waitForSelector('[data-node-path="root"]');
	await page.locator('[data-tab="results"]').click();
	await expect(resultValues(page)).toHaveText(['3', '4', '0']);
	await expect(page.getByLabel('Calculation expression')).toHaveValue('count(dailyReturns)');
	await expect(page.getByLabel('Calculation name')).toHaveValue('Persisted calc');

	await page.locator('[data-tab="library"]').click();
	await expect(page.locator('[data-lib-row="persisted-calc"]')).toBeVisible();

	// User-saved entries can be deleted; built-ins cannot.
	await expect(page.locator('[data-calc-delete="market-value"]')).toHaveCount(0);
	page.once('dialog', (dialog) => dialog.accept());
	await page.locator('[data-calc-delete="persisted-calc"]').click();
	await expect(page.locator('[data-lib-row="persisted-calc"]')).toHaveCount(0);
});

test('saving appends a draft; publishing promotes it for consumers', async ({ page }) => {
	await loadFromLibrary(page, 'consensus-grade');
	await page.locator('[data-op-select="input.0"]').selectOption('avg');
	await page.locator('[data-save-calc]').click();

	// The draft is private: the library still serves the published v1 and no
	// duplicate entry was created.
	await page.locator('[data-tab="library"]').click();
	const card = page.locator('[data-lib-row="consensus-grade"]');
	await expect(card).toContainText('(@moodys-grade + @sp-grade) / 2');
	await expect(card).toContainText('v1 · published');
	await expect(card).toContainText('draft pending');
	await expect(page.locator('[data-lib-row]', { hasText: 'Consensus grade' })).toHaveCount(1);

	// The audit trail shows both versions; publishing v2 makes it effective.
	await page.locator('[data-tab="history"]').click();
	await expect(page.locator('[data-version-row]')).toHaveCount(2);
	await expect(page.locator('[data-version-row="2"]')).toContainText('draft');
	await page.locator('[data-version-publish="2"]').click();
	await expect(page.locator('[data-version-row="2"]')).toContainText('in effect');

	await page.locator('[data-tab="library"]').click();
	await expect(card).toContainText('avg(@moodys-grade, @sp-grade)');
	await expect(card).toContainText('v2 · published');

	// The whole history survives a reload.
	await page.reload();
	await page.waitForSelector('[data-node-path="root"]');
	await page.locator('[data-tab="history"]').click();
	await expect(page.locator('[data-version-row]')).toHaveCount(2);
	await expect(page.locator('[data-version-row="2"]')).toContainText('published');
});

test('repeat saves of identical content are idempotent', async ({ page }) => {
	await op(page, 'count').click();
	await field(page, 'dailyReturns').click();
	await page.getByLabel('Calculation name').fill('Idempotent calc');
	await page.locator('[data-save-calc]').click();
	await page.locator('[data-save-calc]').click();
	await page.locator('[data-save-calc]').click();

	await page.locator('[data-tab="history"]').click();
	await expect(page.locator('[data-version-row]')).toHaveCount(1);
});

test('opening an old version restores it; saving appends, never rewrites', async ({ page }) => {
	await loadFromLibrary(page, 'market-value');
	await page.locator('[data-op-select="root"]').selectOption('add');
	await page.locator('[data-save-calc]').click();

	await page.locator('[data-tab="history"]').click();
	await page.locator('[data-version-open="1"]').click();
	await expect(page.getByLabel('Calculation expression')).toHaveValue('price * quantity');

	// Restoring v1 and saving creates v3; v2 stays in the trail.
	await page.locator('[data-op-select="root"]').selectOption('div');
	await page.locator('[data-save-calc]').click();
	await expect(page.locator('[data-version-row]')).toHaveCount(3);
	await expect(page.locator('[data-version-row="3"]')).toContainText('price / quantity');
});

test('Revert restores the last saved state', async ({ page }) => {
	await loadFromLibrary(page, 'moodys-grade');
	await expect(page.locator('[data-revert-calc]')).toBeDisabled();

	await page.locator('[data-remove="fallback"]').click();
	await expect(status(page)).toContainText('1 empty slot');

	await page.locator('[data-revert-calc]').click();
	await expect(status(page)).toHaveAttribute('data-status', 'complete');
	await expect(resultValues(page)).toHaveText(['19', '11', 'no match']);
	await expect(page.locator('[data-revert-calc]')).toBeDisabled();
});

test('the Data Model tab shows the definition as read-only JSON', async ({ page }) => {
	await op(page, 'mul').click();
	await field(page, 'price').click();
	await field(page, 'quantity').click();

	await page.locator('[data-tab="definition"]').click();
	const json = page.locator('[data-definition-json]');
	await expect(json).toContainText('"op": "mul"');
	await expect(json).toContainText('"field": "price"');
	await expect(json).toContainText('"modelId": "trading-position"');
	await expect(json).toContainText('"label": "Untitled calc"');
});

test('New starts a fresh calc; Clear keeps the identity', async ({ page }) => {
	await loadFromLibrary(page, 'moodys-grade');
	// A loaded tree is clean, so Clear empties it without asking; name stays.
	await page.getByRole('button', { name: 'Clear' }).click();
	await expect(status(page)).toContainText('1 empty slot');
	await expect(page.getByLabel('Calculation name')).toHaveValue("Moody's rating as a number");

	await op(page, 'count').click();
	await field(page, 'dailyReturns').click();
	page.once('dialog', (dialog) => dialog.accept());
	await page.locator('[data-new-calc]').click();
	await expect(page.getByLabel('Calculation name')).toHaveValue('');
	await expect(slot(page, 'root')).toHaveClass(/selected/);
	// A fresh calc has no identity, so no history yet.
	await page.locator('[data-tab="history"]').click();
	await expect(page.locator('[data-version-row]')).toHaveCount(0);
});

test('the article embeds the demo in an expandable stage', async ({ page }) => {
	await expect(page.locator('.article .hero h1')).toContainText('Same word, different numbers');
	await expect(page.locator('[data-article-section="compiler"]')).toContainText('250');

	const stage = page.locator('[data-demo-stage]');
	await expect(stage).not.toHaveClass(/expanded/);
	await page.locator('[data-expand-demo]').click();
	await expect(stage).toHaveClass(/expanded/);
	await page.keyboard.press('Escape');
	await expect(stage).not.toHaveClass(/expanded/);

	// The lenses figure computes its groupings with the real evaluator.
	await expect(page.locator('[data-figure-lenses] .chip')).toHaveCount(9);
	await expect(page.locator('[data-figure-pipelines]')).toBeVisible();
	await expect(page.locator('[data-figure-ast]')).toBeVisible();
});

test('clear resets to an empty, selected root slot', async ({ page }) => {
	await op(page, 'mul').click();
	await field(page, 'price').click();

	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Clear' }).click();
	await expect(slot(page, 'root')).toHaveClass(/selected/);
	await expect(status(page)).toContainText('1 empty slot');
});

test('slide deck presents full screen, navigates, and exits back to the article', async ({
	page
}) => {
	await page.locator('[data-present]').click();
	const deck = page.locator('[data-slide-deck]');
	await expect(deck).toBeVisible();
	await expect(page.locator('[data-deck-counter]')).toHaveText('1 / 13');

	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('[data-deck-counter]')).toHaveText('3 / 13');
	await expect(page.locator('[data-figure-incident]')).toBeVisible();

	// The demo slide hosts the live builder; deck keys must not fire from its inputs.
	await page.keyboard.press('End');
	await page.keyboard.press('Home');
	await expect(page.locator('[data-deck-counter]')).toHaveText('1 / 13');

	await page.locator('[data-deck-next]').click();
	await expect(page.locator('[data-deck-counter]')).toHaveText('2 / 13');

	await page.keyboard.press('Escape');
	await expect(deck).not.toBeVisible();
	await expect(page.locator('.hero h1')).toBeVisible();
});

test('slide deck demo slide hosts the working calc builder', async ({ page }) => {
	await page.locator('[data-present]').click();
	await page.keyboard.press('End');
	// Walk back to the demo slide (index 6).
	for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
	await page.waitForSelector('[data-slide="6"] [data-slot-path="root"]');

	// Typing in the DSL bar must not advance slides.
	const dsl = page.locator('[data-slide="6"] .dsl-input');
	await dsl.click();
	await dsl.press('ArrowRight');
	await dsl.press('Space');
	await expect(page.locator('[data-deck-counter]')).toHaveText('7 / 13');
});
