import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.on('console', (msg) => {
	if (msg.text().startsWith('EVT')) console.log(msg.text());
});
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');

await page.evaluate(() => {
	for (const type of ['dragstart', 'dragover', 'drop', 'dragend']) {
		document.addEventListener(
			type,
			(e) => {
				const el = e.target instanceof Element ? e.target : null;
				const id =
					el?.getAttribute?.('data-node-path') ??
					el?.getAttribute?.('data-op-id') ??
					el?.getAttribute?.('data-slot-path') ??
					el?.tagName;
				console.log('EVT', type, id, 'defaultPrevented=', e.defaultPrevented);
			},
			true
		);
	}
});

const dsl = page.getByLabel('Calculation expression');
await dsl.fill('(@moodys-grade + @sp-grade) / 2');
await dsl.press('Enter');
await page.locator('[data-op-select="input.0"]').selectOption('avg');

await page.dragAndDrop('[data-node-path="input.0"]', '[data-node-path="root"]', {
	sourcePosition: { x: 260, y: 14 },
	targetPosition: { x: 300, y: 14 }
});
await page.waitForTimeout(200);
console.log('value:', await dsl.inputValue());
await browser.close();
