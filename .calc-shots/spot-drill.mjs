import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');
await page.locator('[data-tab="library"]').click();
await page.locator('[data-calc-load="consensus-grade"]').click();
await page.locator('[data-node-path="root"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const box = await page.locator('.tree-panel, .tree-editor, [data-node-path="root"]').first().boundingBox();
await page.screenshot({
	path: '.calc-shots/drill.png',
	clip: { x: box.x - 20, y: box.y - 70, width: Math.min(box.width + 40, 900), height: Math.min(box.height + 120, 620) }
});
await browser.close();
console.log('done');
