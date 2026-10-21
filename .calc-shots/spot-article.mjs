/* Throwaway: screenshot the article top-to-bottom plus the expanded stage. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('http://localhost:4173/journal/calc-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('.article .hero h1');
	await page.screenshot({ path: `${DIR}article-1-top.png`, fullPage: false });
	for (const [i, sel] of [
		'[data-figure-incident]',
		'[data-figure-pipelines]',
		'[data-figure-ast]',
		'[data-demo-stage]',
		'[data-figure-lifecycle]',
		'[data-figure-codegen]',
		'[data-figure-lenses]'
	].entries()) {
		await page.locator(sel).scrollIntoViewIfNeeded();
		await page.waitForTimeout(650); // reveal transitions
		await page.screenshot({ path: `${DIR}article-${i + 2}-${sel.replace(/\W/g, '')}.png` });
	}
	// Hover lineage on the AST figure
	await page.locator('[data-figure-ast] .leaf.field').first().hover();
	await page.screenshot({ path: `${DIR}article-9-lineage.png` });
	// Expanded stage
	await page.locator('[data-expand-demo]').click();
	await page.waitForTimeout(300);
	await page.screenshot({ path: `${DIR}article-10-expanded.png` });
	console.log(errors.length ? `errors: ${errors.join(' | ')}` : 'no page errors');
	await browser.close();
};
run();
