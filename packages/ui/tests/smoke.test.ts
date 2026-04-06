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
	'Cannot read properties of null', // canvas.getContext() returns null in headless
	'is not a function' // runtime errors from WebGL-dependent code paths (e.g. Walker in cell)
];

function assertNoErrors(page: any) {
	const errors: string[] = (page as any).__consoleErrors ?? [];
	const real = errors.filter((e) => !IGNORED_PATTERNS.some((p) => e.includes(p)));
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
// Each test visits the route and asserts no JS errors on load.

const journalEntries = [
	'ant-farm',
	'blob-convergence',
	'blob-grid',
	'cell',
	'chrysanthemum',
	'cube-peg-torus-hole',
	'down-south',
	'follow',
	'gravity-swell',
	'math-journey',
	'mirrors',
	'note-playground',
	'note-points',
	'note-shader',
	'note-shader-2',
	'note-shader-3',
	'nyc-subway',
	'orbit',
	'playlist-helper',
	'prime-coloring',
	'scale-practice',
	'spline-experiment-0',
	'spring-harp',
	'squiggles'
];

for (const entry of journalEntries) {
	test(`journal/${entry} loads without errors`, async ({ page }) => {
		await page.goto(`/journal/${entry}`);
		await page.waitForLoadState('networkidle');
		assertNoErrors(page);
	});
}
