/* Throwaway: click-out closes, unset shows its hex, delete drops a swatch. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('dialog', (d) => d.accept());
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const cell = (i) => page.locator(`[data-cell-index="${i}"]`);

// 1. Click-out closes the picker.
await page.locator('.palette .add').click();
console.log('picker open:', await page.locator('.picker-window').count());
await page.locator('.palette .add').click({ position: { x: 2, y: 2 }, force: true }).catch(() => {});
await page.waitForTimeout(150);
console.log('after clicking the + again:', await page.locator('.picker-window').count());
await page.locator('.palette .add').click();
await page.waitForTimeout(150);
await page.locator('.attributes summary').click();
await page.waitForTimeout(150);
console.log('after clicking elsewhere:', await page.locator('.picker-window').count());
await page.locator('.attributes summary').click();

// 2. Unset slots show their hex.
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
await cell(0).click();
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await cell(0).click();
console.log('slot labels:', await page.locator('.colors .color-label').allTextContents());
console.log('slot hexes: ', (await page.locator('.colors .hex-chip').allTextContents()).map((t) => t.trim()));

// 3. Delete removes the focused palette colour.
console.log('palette before:', await page.locator('.palette .swatch:not(.add)').count());
await page.locator('.palette .swatch:not(.add)').first().click();
await page.keyboard.press('Delete');
await page.waitForTimeout(200);
console.log('palette after delete:', await page.locator('.palette .swatch:not(.add)').count());
await page.locator('.attributes').screenshot({ path: DIR + 'three.png' });
console.log('errors:', errors);
await browser.close();
