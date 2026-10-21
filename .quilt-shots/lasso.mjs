/* Throwaway: the lasso mid-drag and the mouse-tool hover outline. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

// Lay down a few blocks so the lasso has something to sit over.
await page.locator('.palette input[type="color"]').fill('#2f3d6b');
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
for (const i of [7, 8, 13, 14, 20]) {
  const b = await page.locator(`[data-cell-index="${i}"]`).boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
const a = await page.locator('[data-cell-index="7"]').boundingBox();
const z = await page.locator('[data-cell-index="20"]').boundingBox();
await page.mouse.move(a.x + 4, a.y + 4);
await page.mouse.down();
await page.mouse.move(z.x + z.width - 4, z.y + z.height - 4, { steps: 10 });

const stage = await page.locator('.stage').boundingBox();
await page.screenshot({ path: `${DIR}lasso.png`, clip: stage });
await page.mouse.up();
console.log('readout:', await page.locator('.readout').innerText());
await browser.close();
