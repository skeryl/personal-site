import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.on('console', (msg) => {
	if (msg.text().startsWith('EVT')) console.log(msg.text());
});
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');
await page.evaluate(() => {
	for (const type of ['dragstart', 'drop']) {
		document.addEventListener(
			type,
			(e) => {
				const el = e.target instanceof Element ? e.target : null;
				console.log('EVT', type, el?.tagName, el?.className?.slice?.(0, 30));
			},
			true
		);
	}
});
const dsl = page.getByLabel('Calculation expression');
await dsl.fill('(@moodys-grade + @sp-grade) / 2');
await dsl.press('Enter');
const flags = await page.evaluate(() => ({
	nodeDraggable: document.querySelector('[data-node-path="input.0"]')?.draggable,
	nodeAttr: document.querySelector('[data-node-path="input.0"]')?.getAttribute('draggable'),
	paletteDraggable: document.querySelector('[data-op-id="mul"]')?.draggable
}));
console.log('flags:', JSON.stringify(flags));
// Palette native drag with logging, for comparison.
await page.dragAndDrop('[data-op-id="mul"]', '[data-node-path="input.1"]');
await page.waitForTimeout(200);
console.log('value:', await dsl.inputValue());
await browser.close();
