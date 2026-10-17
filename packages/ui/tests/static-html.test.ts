import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/*
 * The build is a multi-page static site: every route is prerendered to its
 * own HTML file whose markup carries the page's content, so crawlers and
 * no-JS visitors see the same page everyone else does. These specs load
 * pages with JavaScript disabled, so anything they find came from the HTML
 * file itself rather than from client-side rendering.
 */

test.use({ javaScriptEnabled: false });

const entriesDir = fileURLToPath(new URL('../src/lib/entries', import.meta.url));
const journalEntries = readdirSync(entriesDir)
	.filter((file) => file.endsWith('.ts') && file !== 'index.ts')
	.map((file) => file.replace(/\.ts$/, ''))
	.sort();

for (const route of ['/', '/journal']) {
	test(`${route} lists entries as plain links`, async ({ page }) => {
		await page.goto(route);
		const cards = page.locator('.card-grid a[href^="/journal/"]');
		expect(await cards.count()).toBeGreaterThan(0);
		await expect(page).toHaveTitle(/shane's computer/);
	});
}

test('about page is plain HTML with no scripts', async ({ page, request }) => {
	await page.goto('/about');
	await expect(page.getByText("what's all this?")).toBeVisible();
	await expect(page).toHaveTitle(/about/i);

	const html = await (await request.get('/about')).text();
	expect(html).not.toMatch(/<script/i);
	expect(html).not.toMatch(/rel="modulepreload"/);
});

for (const entry of journalEntries) {
	test(`journal/${entry} has its title and header in the HTML`, async ({ page }) => {
		await page.goto(`/journal/${entry}`);
		const heading = page.locator('h1').first();
		await expect(heading).not.toBeEmpty();
		const title = (await heading.textContent())!.trim();
		await expect(page).toHaveTitle(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
	});
}

/*
 * An exploration's prose is the reason this matters: a crawler should get the
 * writing, not a container waiting on hydration to fill it.
 */
test('an exploration serves its whole article as markup', async ({ page }) => {
	await page.goto('/journal/nyc-subway');
	await expect(
		page.getByRole('heading', { name: 'The Subway Gap', level: 1 }).first()
	).toBeVisible();
	for (const section of ['Which lines actually work?', 'What does CBTC actually mean?']) {
		await expect(page.getByRole('heading', { name: section })).toBeVisible();
	}
});
