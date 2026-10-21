import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-slot-path="root"]');

// 1. Manual DragEvent dispatch: does the handler chain work at all?
const dt = await page.evaluateHandle(() => new DataTransfer());
await page.dispatchEvent('[data-op-id="mul"]', 'dragstart', { dataTransfer: dt });
const slotClass = await page.locator('[data-slot-path="root"]').getAttribute('class');
await page.dispatchEvent('[data-slot-path="root"]', 'drop', { dataTransfer: dt });
await page.dispatchEvent('[data-op-id="mul"]', 'dragend', { dataTransfer: dt });
const dsl1 = await page.locator('.dsl-input').inputValue();
console.log('manual dispatch:', { slotClass, dsl1 });

// 2. Native dragAndDrop on a fresh page (fresh localStorage keeps state clean).
const page2 = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page2.goto('http://localhost:4173/journal/calc-builder');
await page2.waitForSelector('[data-slot-path="root"]');
await page2.dragAndDrop('[data-op-id="mul"]', '[data-slot-path="root"]');
const dsl2 = await page2.locator('.dsl-input').inputValue();
console.log('native dragAndDrop:', { dsl2 });
await browser.close();
