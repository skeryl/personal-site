import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');
const dsl = page.getByLabel('Calculation expression');
await dsl.fill('(@moodys-grade + @sp-grade) / 2');
await dsl.press('Enter');
await page.locator('[data-op-select="input.0"]').selectOption('avg');

// Make sure source and target are both on-screen before the gesture starts.
await page.locator('[data-node-path="root"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const vis = await page.evaluate(() => {
	const r1 = document.querySelector('[data-node-path="input.0"]').getBoundingClientRect();
	const r2 = document.querySelector('[data-node-path="root"]').getBoundingClientRect();
	return { src: { y: r1.y, h: r1.height }, tgt: { y: r2.y, h: r2.height }, vh: innerHeight };
});
console.log('geometry:', JSON.stringify(vis));
await page.dragAndDrop('[data-node-path="input.0"]', '[data-node-path="root"]', {
	sourcePosition: { x: 300, y: 14 },
	targetPosition: { x: 340, y: 14 }
});
await page.waitForTimeout(250);
console.log('value:', await dsl.inputValue());
await browser.close();
