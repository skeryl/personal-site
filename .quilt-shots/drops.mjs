/* Throwaway: the new dimension dropdowns and the quilt size table. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

console.log('dimension labels:', await page.locator('.dimensions .field-label').allTextContents());
console.log('dimension values:', await page.locator('.dimensions .display').allTextContents());
await page.locator('.dimensions').screenshot({ path: DIR + 'dims.png' });

// The seam allowance reaches the cutting list.
await page.locator('.palette .add').click();
await page.locator('.picker-window .close').click();
await page.getByRole('button', { name: 'Square', exact: true }).click();
await page.locator('[data-cell-index="0"]').click();
await page.mouse.move(5, 5);
await page.locator('.cut-list summary').click();
console.log('cut at 1/4:', (await page.locator('.cut-row .label').first().textContent()).trim());
await page.locator('.dimensions .dropdown').nth(1).locator('.trigger').click();
await page.locator('.dimensions .dropdown').nth(1).getByRole('option', { name: '1/2”' }).click();
await page.waitForTimeout(150);
console.log('cut at 1/2:', (await page.locator('.cut-row .label').first().textContent()).trim());

// The quilt size opens as a table.
await page.locator('.size .trigger').click();
await page.waitForTimeout(150);
const menu = await page.locator('.size .menu').boundingBox();
console.log('size menu:', menu && { w: Math.round(menu.width), h: Math.round(menu.height) });
console.log('headings:', await page.locator('.size .headings span').allTextContents());
console.log('rows:', await page.locator('.size .option .lead').allTextContents());
await page.locator('.size .menu').screenshot({ path: DIR + 'sizemenu.png' });
await page.locator('.size').getByRole('option', { name: 'King' }).click();
await page.waitForTimeout(200);
console.log('after King:', (await page.locator('.size .display').textContent()).trim());
console.log('errors:', errors);
await browser.close();
