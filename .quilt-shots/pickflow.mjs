/* Throwaway: one click opens the picker, and its palette switches colours. */
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
const add = async (hex) => {
  await page.locator('.palette .add').click();
  await page.locator('.picker-window .hex-chip').fill(hex);
  await page.locator('.picker-window .close').click();
};
await add('4F7FE8');
await add('38511F');
await add('C766E4');

// One click on a palette colour opens the picker on it.
await page.locator('.palette .swatch:not(.add)').first().click();
await page.waitForTimeout(150);
console.log('picker open after one click:', await page.locator('.picker-window').count());
console.log('window box:', await page.locator('.picker-window').boundingBox());
console.log('hex shown:', await page.locator('.picker-window .hex-chip').inputValue());
console.log('picks in the picker:', await page.locator('.picker-window .pick').count());
console.log('current pick:', await page.locator('.picker-window .pick.current').getAttribute('aria-label'));
await page.locator('.picker-window').screenshot({ path: DIR + 'picker-palette.png' });

// Picking another colour there switches to it, in one click.
await page.locator('.picker-window .pick').nth(2).click();
await page.waitForTimeout(150);
console.log('hex after picking the third:', await page.locator('.picker-window .hex-chip').inputValue());
console.log('armed swatch on the left:', await page.locator('.palette .swatch.current').getAttribute('aria-label'));
console.log('still open:', await page.locator('.picker-window').count());
console.log('errors:', errors);
await browser.close();
