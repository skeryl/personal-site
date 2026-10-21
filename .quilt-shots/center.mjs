/* Throwaway: centre markers on an even grid and an odd one. */
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

const shot = async (name) => {
  await page.mouse.move(5, 5);
  await page.screenshot({ path: `${DIR}${name}.png`, clip: await page.locator('.stage').boundingBox() });
  console.log(name, 'guides:', await page.locator('.center-guide').count());
};

await shot('center-off');
await page.locator('.actions').getByRole('button', { name: 'Center' }).click();
await shot('center-king-off-default');

// King is 14x14: no middle square, so four squares are marked.
await page.selectOption('.size select', 'king');
await page.waitForTimeout(150);
await shot('center-even');

// A custom 40x40 at 8" is 5x5: one middle square.
await page.selectOption('.size select', 'custom');
await page.locator('.inches').first().fill('40');
await page.locator('.inches').first().blur();
await page.locator('.inches').last().fill('40');
await page.locator('.inches').last().blur();
await page.waitForTimeout(200);
await shot('center-odd');
await browser.close();
