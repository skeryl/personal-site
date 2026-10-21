import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder#slides');
await page.waitForSelector('[data-slide-deck]');
for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
await page.waitForSelector('[data-slide="7"] .palette');

const deck = await page.evaluate(() => {
	const fill = document.querySelector('.demo-fill');
	const palette = document.querySelector('.palette');
	fill.scrollTop = fill.scrollHeight;
	palette.scrollTop = palette.scrollHeight;
	const lit = document.querySelector('[data-literal="true"]');
	const litRect = lit.getBoundingClientRect();
	const fillRect = fill.getBoundingClientRect();
	return {
		paletteMax: getComputedStyle(palette).maxHeight,
		fillHeight: fillRect.height,
		litWithinFill: litRect.bottom <= fillRect.bottom + 1 && litRect.top >= fillRect.top,
		litTop: litRect.top,
		fillBottom: fillRect.bottom
	};
});
console.log('deck slide:', JSON.stringify(deck));

// Article fallback still capped by the viewport.
const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page2.goto('http://localhost:4173/journal/calc-builder');
await page2.waitForSelector('[data-slot-path="root"]');
await page2.locator('.tool-grid').scrollIntoViewIfNeeded();
const article = await page2.evaluate(() => {
	const palette = document.querySelector('.palette');
	palette.scrollTop = palette.scrollHeight;
	const lit = document.querySelector('[data-literal="true"]');
	return {
		paletteMax: getComputedStyle(palette).maxHeight,
		litVisible: lit.getBoundingClientRect().top < innerHeight
	};
});
console.log('article:', JSON.stringify(article));
await browser.close();
