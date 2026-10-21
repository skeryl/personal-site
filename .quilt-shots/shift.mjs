/* Throwaway: does selecting a palette colour shift the palette under the cursor? */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.locator('.palette .add').click();
await page.locator('.picker-window .close').click();

const sw = page.locator('.palette .swatch:not(.add)').first();
const before = await sw.boundingBox();
console.log('tool before:', await page.locator('.actions .active').textContent());
await sw.click();
await page.waitForTimeout(250);
const after = await sw.boundingBox();
console.log('tool after: ', await page.locator('.actions .active').textContent());
console.log('swatch y before/after:', before.y, after.y, 'shift', (after.y - before.y).toFixed(1));
await browser.close();
