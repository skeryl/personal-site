import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForTimeout(800);

const report = await page.evaluate(() => {
	const vw = 390;
	const lines = [];
	lines.push(`scrollWidth: ${document.documentElement.scrollWidth}`);

	const label = (el) =>
		el.tagName.toLowerCase() +
		(el.className && typeof el.className === 'string'
			? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
			: '');

	const offenders = [];
	document.querySelectorAll('*').forEach((el) => {
		const r = el.getBoundingClientRect();
		if (r.width > vw + 1) {
			const pr = el.parentElement?.getBoundingClientRect();
			const parentWide = pr && pr.width > vw + 1;
			offenders.push({ el, w: Math.round(r.width), parentWide });
		}
	});
	// roots of overflow: wide elements whose parent is not wide
	offenders
		.filter((o) => !o.parentWide)
		.slice(0, 15)
		.forEach((o) => {
			const chain = [];
			let el = o.el;
			for (let i = 0; i < 4 && el; i++) {
				chain.push(label(el));
				el = el.parentElement;
			}
			lines.push(`ROOT ${o.w}px: ${chain.join(' < ')}`);
		});

	// parent chain of .article with display + width
	let el = document.querySelector('.article');
	while (el) {
		const cs = getComputedStyle(el);
		lines.push(
			`chain ${label(el)}: display=${cs.display} width=${Math.round(el.getBoundingClientRect().width)} minW=${cs.minWidth}`
		);
		el = el.parentElement;
	}
	return lines.join('\n');
});

console.log(report);
await browser.close();
