/* Throwaway: a recoloured palette colour is undoable. */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const cell = (i) => page.locator(`[data-cell-index="${i}"]`);
const fills = (i) => cell(i).locator('polygon:not(.piece-outline)').evaluateAll((e) => e.map((n) => n.getAttribute('fill')));
const undo = () => page.locator('.actions').getByRole('button', { name: /^Undo/ }).click();
const redo = () => page.locator('.actions').getByRole('button', { name: /^Redo/ }).click();

await page.locator('.palette .add').click();
await page.locator('.picker-window .hex-chip').fill('4F7FE8');
await page.locator('.picker-window .close').click();
await page.getByRole('button', { name: 'Square', exact: true }).click();
await cell(0).click();
await page.mouse.move(5, 5);
console.log('placed:', await fills(0));

// Recolour that fabric.
await page.locator('.palette .swatch:not(.add)').first().click();
await page.locator('.picker-window .hex-chip').fill('FF0000');
await page.locator('.picker-window .close').click();
await page.mouse.move(5, 5);
console.log('recoloured:', await fills(0));

await undo();
await page.mouse.move(5, 5);
console.log('after undo:', await fills(0), await page.locator('.palette .swatch:not(.add)').first().evaluate((el) => getComputedStyle(el).backgroundColor));
await redo();
await page.mouse.move(5, 5);
console.log('after redo:', await fills(0));
console.log('errors:', errors);
await browser.close();
