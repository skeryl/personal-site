/* Throwaway: seam weight against the square rules. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const cell = (i) => page.locator(`[data-cell-index="${i}"]`);

await page.locator('.actions').getByRole('button', { name: /^Grid/ }).click();
await page.getByRole('button', { name: '2 by 2', exact: true }).click();
await cell(0).click();
await cell(1).click();
await page.getByRole('button', { name: '4 by 4', exact: true }).click();
await cell(7).click();
await page.mouse.move(5, 5);
console.log('seam stroke-width:', await page.locator('rect.seam').first().getAttribute('stroke-width'));
console.log('seam stroke:', await page.locator('rect.seam').first().getAttribute('stroke'));
await page.locator('.viewport').screenshot({ path: DIR + 'seams.png' });
await browser.close();
