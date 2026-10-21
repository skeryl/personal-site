/*
 * Throwaway harness: drive the calc-builder exploration in headless chromium
 * and screenshot it. Not committed — lives under .calc-shots.
 */
import { chromium } from 'playwright';

const PAGE_URL = 'http://localhost:4173/journal/calc-builder';
const DIR = new URL('.', import.meta.url).pathname;

const shot = async (page, name) => {
	await page.screenshot({ path: `${DIR}${name}.png`, fullPage: true });
	console.log(`shot: ${name}`);
};

const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
	const errors = [];
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
	page.on('dialog', (dialog) => dialog.accept());

	await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-slot-path="root"]', { timeout: 10000 });
	await shot(page, '01-initial');

	// Market value: mul(price, quantity)
	await page.locator('[data-op-id="mul"]').click();
	await page.locator('[data-field-id="price"]').click();
	await shot(page, '02-partial');
	await page.locator('[data-field-id="quantity"]').click();
	await shot(page, '03-market-value');

	// Nested: gt(avg(dailyReturns), literal 1) inside a switch-free tree
	await page.locator('[data-remove="root"]').click();
	await page.locator('[data-op-id="gt"]').click();
	await page.locator('[data-op-id="avg"]').click();
	await page.locator('[data-field-id="dailyReturns"]').click();
	await page.getByLabel('Number literal').fill('1');
	await page.locator('[data-literal="number"]').click();
	await shot(page, '04-nested-bool');

	// Switch on symbol
	await page.locator('[data-remove="root"]').click();
	await page.locator('[data-op-id="switch"]').click();
	await page.locator('[data-field-id="symbol"]').click();
	await page.getByLabel('Text literal').fill('AAPL');
	await page.locator('[data-literal="string"]').click();
	await page.getByLabel('Number literal').fill('1');
	await page.locator('[data-literal="number"]').click();
	await page.getByLabel('Number literal').fill('0');
	await page.locator('[data-literal="number"]').click();
	await shot(page, '05-switch');

	// Stale field refs after a model change
	await page.locator('[data-model-id="order-book"]').click();
	await shot(page, '06-stale-model');
	await page.locator('[data-model-id="trading-position"]').click();

	// Reference data: switch on lookup(creditRatings, agency=moodys -> rating)
	await page.locator('[data-remove="root"]').click();
	await page.locator('[data-op-id="switch"]').click();
	await page.locator('[data-op-id="lookupString"]').click();
	await page.locator('[data-field-id="instrument.creditRatings"]').click();
	for (const text of ['agency', 'moodys', 'rating', 'AA']) {
		await page.getByLabel('Text literal').fill(text);
		await page.locator('[data-literal="string"]').click();
	}
	await page.getByLabel('Number literal').fill('1');
	await page.locator('[data-literal="number"]').click();
	await page.getByLabel('Number literal').fill('0');
	await page.locator('[data-literal="number"]').click();
	await shot(page, '08-lookup-switch');

	// Narrow viewport
	await page.setViewportSize({ width: 900, height: 1200 });
	await shot(page, '07-narrow');

	if (errors.length) {
		console.log('console errors:');
		for (const e of errors) console.log('  ' + e);
	} else {
		console.log('no console errors');
	}
	await browser.close();
};

run();
