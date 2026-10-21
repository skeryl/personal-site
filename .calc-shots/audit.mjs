/*
 * Usability audit driver: walk the calc builder like a first-time user,
 * screenshotting each state and logging what the UI affords at each step.
 * Not committed — lives under .calc-shots.
 */
import { chromium } from 'playwright';

const BASE = process.env.CALC_BASE ?? 'http://localhost:5173';
const PAGE_URL = `${BASE}/journal/calc-builder`;
const DIR = new URL('.', import.meta.url).pathname;

const shot = async (page, name) => {
	await page.screenshot({ path: `${DIR}audit-${name}.png`, fullPage: false });
	console.log(`shot: audit-${name}`);
};

const report = async (page, label) => {
	const selected = await page
		.locator('.slot.selected')
		.count()
		.then((n) => (n ? page.locator('.slot.selected').first().getAttribute('data-slot-path') : null));
	const enabledOps = await page
		.locator('[data-op-id]:not(.depleted)')
		.evaluateAll((els) => els.map((el) => el.dataset.opId));
	const enabledFields = await page
		.locator('[data-field-id]:not(.depleted)')
		.evaluateAll((els) => els.map((el) => el.dataset.fieldId));
	const status = await page.locator('.status').textContent();
	console.log(`--- ${label}`);
	console.log(`    selected slot: ${selected}`);
	console.log(`    enabled ops: ${enabledOps.join(', ') || '(none)'}`);
	console.log(`    enabled fields: ${enabledFields.join(', ') || '(none)'}`);
	console.log(`    status: ${status?.replace(/\s+/g, ' ').trim()}`);
};

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	const errors = [];
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
	page.on('dialog', (dialog) => dialog.accept());

	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]');
	await report(page, 'initial load');
	await shot(page, '01-initial');

	// Scenario 1: does deselecting strand the user?
	await page.keyboard.press('Escape');
	await report(page, 'after Escape (nothing selected)');
	await shot(page, '02-deselected');
	await page.locator('[data-slot-path="root"]').click();

	// Scenario 2: basic calc, watching selection auto-advance.
	await page.locator('[data-op-id="mul"]').click();
	await report(page, 'after placing multiply');
	await page.locator('[data-field-id="price"]').click();
	await page.locator('[data-field-id="quantity"]').click();
	await report(page, 'completed mul(price, quantity)');
	await shot(page, '03-complete-basic');

	// Scenario 3: what does a complete tree afford? (everything disabled?)
	// Scenario 4: replace quantity with costBasis — how many steps?
	await page.locator('[data-remove="input.1"]').click();
	await report(page, 'after removing quantity leaf');
	await page.locator('[data-field-id="costBasis"]').click();

	// Scenario 5: advanced calc — lookup inside switch. Count the typing burden.
	await page.locator('[data-remove="root"]').click();
	await shot(page, '04-after-root-remove');
	await page.locator('[data-op-id="switch"]').click();
	await page.locator('[data-op-id="lookupString"]').click();
	await report(page, 'lookup placed, first slot selected');
	await shot(page, '05-lookup-slots');
	await page.locator('[data-field-id="instrument.creditRatings"]').click();
	await report(page, 'after filling lookup "in" — user must now type field names');
	await shot(page, '06-lookup-field-name-slot');

	if (errors.length) {
		console.log('console errors:');
		for (const e of errors) console.log('  ' + e);
	} else {
		console.log('no console errors');
	}
	await browser.close();
};

run();
