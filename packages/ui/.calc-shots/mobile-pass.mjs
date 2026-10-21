import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4173/journal/calc-builder';
const OUT = '.calc-shots';

const browser = await chromium.launch();

async function shoot(width, height, label, steps) {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.goto(BASE);
	await page.waitForTimeout(800);
	for (const [name, action] of steps) {
		await action(page);
		await page.waitForTimeout(500);
		await page.screenshot({ path: `${OUT}/m-${label}-${name}.png` });
	}
	await page.close();
}

const scrollTo = (sel) => (page) => page.locator(sel).first().scrollIntoViewIfNeeded();

for (const [w, h, label] of [
	[390, 844, '390'],
	[768, 1024, '768']
]) {
	await shoot(w, h, label, [
		['hero', () => {}],
		['footnote', scrollTo('[data-article-section="the-call"] .footnote')],
		['pipelines', scrollTo('[data-figure-pipelines]')],
		['demo', scrollTo('[data-demo-stage]')],
		['java', scrollTo('.prose .code-block')],
		['arch', scrollTo('[data-article-section="compiler"] .fig-embed:nth-of-type(2)')],
		['retro', scrollTo('[data-article-section="landing"]')],
		['colophon', scrollTo('.colophon')]
	]);
}

await browser.close();
console.log('done');
