import { expect, test, type Page } from '@playwright/test';

/*
 * Each post page should download the engine it renders with and no other.
 * Both canvas renderers used to be imported statically by Post.svelte, which
 * put three.js on every post page, a 2D sketch included.
 */

/** A string three.js has and the other engines don't. */
const THREE_SIGNATURE = 'BufferGeometry';

/** Fetch every script the page loads and report which ones hold three.js. */
async function loadsThree(page: Page, route: string): Promise<boolean> {
	const scripts: Promise<string>[] = [];
	page.on('response', (res) => {
		if (res.request().resourceType() === 'script') {
			scripts.push(res.text().catch(() => ''));
		}
	});
	await page.goto(route);
	await page.waitForLoadState('networkidle');
	const bodies = await Promise.all(scripts);
	return bodies.some((b) => b.includes(THREE_SIGNATURE));
}

test('a 2D canvas sketch does not download three.js', async ({ page }) => {
	expect(await loadsThree(page, '/journal/follow')).toBe(false);
});

test('an exploration does not download three.js', async ({ page }) => {
	expect(await loadsThree(page, '/journal/calc-builder')).toBe(false);
});

test('a 3D experiment does download three.js', async ({ page }) => {
	expect(await loadsThree(page, '/journal/cube-peg-torus-hole')).toBe(true);
});
