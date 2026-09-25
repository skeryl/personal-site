import { expect, test } from '@playwright/test';

/*
 * The builder's own behaviour is covered where the builder lives, in
 * skeryl/quilt-builder, against a harness that is only the element. What is
 * left here is what that repo cannot see: that the package is installed and
 * defines its tag, and that the page around it still holds it the way the
 * design asks.
 */

const ROUTE = '/journal/quilt-builder';

test.use({ viewport: { width: 1440, height: 1400 } });

test('the element arrives and draws the builder', async ({ page }) => {
	await page.goto(ROUTE);

	// It defines itself on import, and the import waits for the client.
	await expect(page.locator('quilt-builder')).toBeAttached();
	await page.waitForFunction(() => !!customElements.get('quilt-builder'));

	// And it is really the builder, not an empty tag: a quilt to work on.
	await expect(page.locator('[data-cell-index="0"]')).toBeVisible();
	await expect(page.locator('quilt-builder .masthead')).toHaveText('Quilt Builder');
});

test('the site and the builder head the page as one band', async ({ page }) => {
	/*
	 * This is the half of the old assertion that could not move: the site's
	 * nav is the site's, and it is set to match the builder's masthead so the
	 * two read as a single band across the top. Only a page that has both can
	 * say whether they still line up.
	 */
	await page.goto(ROUTE);
	await page.evaluate(() => document.fonts.ready);
	await expect(page.locator('quilt-builder .masthead')).toBeVisible();

	for (const selector of ['nav', 'quilt-builder .masthead']) {
		const bar = page.locator(selector).first();
		expect(Math.round((await bar.boundingBox())!.height)).toBe(33);
		await expect(bar).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	}
});

test('the wall is given the page padding back, and reaches the window', async ({ page }) => {
	/*
	 * The builder fits its box by default; the full bleed is this page handing
	 * its own px-6 and pb-8 over through the tokens. If that ever stops
	 * arriving, the wall quietly stops at the text column instead.
	 */
	await page.goto(ROUTE);
	await expect(page.locator('[data-cell-index="0"]')).toBeVisible();

	const { inner, viewport, overflow } = await page.evaluate(() => ({
		inner: document.querySelector('quilt-builder .qb')!.getBoundingClientRect(),
		viewport: window.innerWidth,
		overflow: document.documentElement.scrollWidth - window.innerWidth
	}));
	expect(Math.round(inner.width)).toBe(viewport);
	expect(Math.round(inner.left)).toBe(0);
	// Reaching the window is not the same as spilling past it.
	expect(overflow).toBe(0);
});

test('the builder takes the whole of the room this page gives it', async ({ page }) => {
	/*
	 * The element is a flex item here, and this page sizes the element rather
	 * than what is inside it. When the content ignored that room the quilt
	 * wall lost a quarter of its height and every square shrank with it —
	 * twelve pixels instead of nineteen on a phone. Nothing looked broken,
	 * which is exactly why it is worth measuring rather than eyeballing.
	 */
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(ROUTE);
	await expect(page.locator('[data-cell-index="0"]')).toBeVisible();
	await page.evaluate(() => document.fonts.ready);

	const room = await page.evaluate(() => {
		const el = document.querySelector('quilt-builder')!;
		return {
			given: el.getBoundingClientRect().height,
			taken: el.firstElementChild!.getBoundingClientRect().height
		};
	});
	// It may ask for more than it is given. What it must not do is take less.
	expect(Math.round(room.taken)).toBeGreaterThanOrEqual(Math.round(room.given));
});
