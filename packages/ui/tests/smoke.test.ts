import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

// Collect console errors during each test
test.beforeEach(async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			errors.push(msg.text());
		}
	});
	page.on('pageerror', (err) => {
		errors.push(err.message);
	});
	// Expose errors array for assertions
	(page as any).__consoleErrors = errors;
});

// Errors expected in headless environments (no WebGL/canvas/audio support)
const IGNORED_PATTERNS = [
	'favicon',
	'Failed to load resource',
	'WebGL',
	'WebGL2',
	'Error creating WebGL context',
	'Could not create a WebGL context',
	'THREE.WebGLRenderer',
	'AnalyserNode',
	'AudioContext',
	'The AudioContext was not allowed to start',
	'Cannot read properties of null' // canvas.getContext() returns null in headless
];

/*
 * Broad patterns that could mask real bugs are opted into per route instead
 * of applying everywhere ("is not a function" once hid a genuine crash on
 * the home page).
 */
const ROUTE_IGNORED_PATTERNS: Record<string, string[]> = {
	cell: ['is not a function'] // WebGL-dependent Walker code path
};

function assertNoErrors(page: any, route?: string) {
	const errors: string[] = (page as any).__consoleErrors ?? [];
	const ignored = [...IGNORED_PATTERNS, ...(route ? (ROUTE_IGNORED_PATTERNS[route] ?? []) : [])];
	const real = errors.filter((e) => !ignored.some((p) => e.includes(p)));
	expect(real, `Unexpected console errors: ${real.join('\n')}`).toHaveLength(0);
}

// --- Top-level pages ---

test('home page loads and shows post cards', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.card-grid')).toBeVisible();
	const cards = page.locator('.card-grid a');
	expect(await cards.count()).toBeGreaterThan(0);
	assertNoErrors(page);
});

test('about page loads', async ({ page }) => {
	await page.goto('/about');
	await expect(page.getByText("what's all this?")).toBeVisible();
	assertNoErrors(page);
});

test('journal page loads', async ({ page }) => {
	await page.goto('/journal');
	await page.waitForLoadState('networkidle');
	assertNoErrors(page);
});

// --- Navigation ---

test('cards link to journal entries', async ({ page }) => {
	await page.goto('/');
	const firstCard = page.locator('.card-grid a').first();
	const href = await firstCard.getAttribute('href');
	expect(href).toContain('/journal/');
});

// --- Journal entry smoke tests ---
// Every entry file gets a route test automatically, so a new exploration
// cannot silently ship without CI ever loading its page.

const entriesDir = fileURLToPath(new URL('../src/lib/entries', import.meta.url));
const journalEntries = readdirSync(entriesDir)
	.filter((file) => file.endsWith('.ts') && file !== 'index.ts')
	.map((file) => file.replace(/\.ts$/, ''))
	.sort();

for (const entry of journalEntries) {
	test(`journal/${entry} loads without errors`, async ({ page }) => {
		await page.goto(`/journal/${entry}`);
		await page.waitForLoadState('networkidle');
		assertNoErrors(page, entry);
	});
}
