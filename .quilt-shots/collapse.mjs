/* Throwaway: collapse Block type so the colours sit near the top. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.removeItem('quilt-builder:v3');
  localStorage.removeItem('quilt-builder:v2');
  localStorage.removeItem('quilt-builder:panels');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.locator('.palette input[type="color"]').fill('#2f3d6b');
await page.locator('.active .name').fill('Navy');
await page.locator('.palette input[type="color"]').fill('#efe6d2');
await page.locator('.active .name').fill('Cream');

await page.locator('[data-panel="type"] summary').click();
await page.locator('[data-panel="patterns"] summary').click();
await page.mouse.move(5, 5);
const side = await page.locator('.side').boundingBox();
await page.screenshot({ path: `${DIR}collapsed.png`, clip: side });
await browser.close();
