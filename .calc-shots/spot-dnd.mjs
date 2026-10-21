import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');

const dsl = page.getByLabel('Calculation expression');
await dsl.fill('(@moodys-grade + @sp-grade) / 2');
await dsl.press('Enter');
await page.locator('[data-op-select="input.0"]').selectOption('avg');
await page.locator('.tree-editor, .tool-grid').first().scrollIntoViewIfNeeded();

// Real mouse drag: press on the avg node head, hover the root divide, release.
const src = await page.locator('[data-node-path="input.0"]').boundingBox();
const tgt = await page.locator('[data-node-path="root"]').boundingBox();
await page.mouse.move(src.x + 40, src.y + 14);
await page.mouse.down();
await page.mouse.move(src.x + 60, src.y + 40, { steps: 5 });
await page.mouse.move(tgt.x + 40, tgt.y + 12, { steps: 10 });
await page.screenshot({ path: '.calc-shots/dnd-mid.png' });
await page.mouse.up();
await page.waitForTimeout(200);
console.log('after drop:', await dsl.inputValue());
await page.screenshot({ path: '.calc-shots/dnd-after.png' });
await browser.close();
