import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');

const dsl = page.getByLabel('Calculation expression');
await dsl.fill('(@moodys-grade + @sp-grade) / 2');
await dsl.press('Enter');
await page.locator('[data-op-select="input.0"]').selectOption('avg');
await page.locator('[data-node-path="root"]').scrollIntoViewIfNeeded();

await page.dragAndDrop('[data-node-path="input.0"]', '[data-node-path="root"]', {
	sourcePosition: { x: 260, y: 14 },
	targetPosition: { x: 40, y: 14 }
});
await page.waitForTimeout(200);
console.log('after native drop:', await dsl.inputValue());
await page.screenshot({ path: '.calc-shots/dnd-after.png' });
await browser.close();
