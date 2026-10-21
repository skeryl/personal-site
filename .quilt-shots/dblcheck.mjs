/* Throwaway: does double-clicking a palette swatch open the picker? */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

await page.locator('.palette .add').click();
await page.locator('.picker-window .hex-chip').fill('4f7fe8');
await page.locator('.picker-window .close').click();
await page.locator('.active .name').fill('Blue');

const sw = page.locator('.palette .swatch:not(.add)').first();
console.log('swatch count:', await page.locator('.palette .swatch:not(.add)').count());
console.log('swatch box:', await sw.boundingBox());
await sw.dblclick();
await page.waitForTimeout(300);
console.log('picker after dblclick on .palette .swatch:', await page.locator('.picker-window').count());

await page.getByRole('button', { name: /^Paint with Blue/ }).dblclick();
await page.waitForTimeout(300);
console.log('picker after dblclick by role:', await page.locator('.picker-window').count());
console.log('errors:', errors);
await browser.close();
