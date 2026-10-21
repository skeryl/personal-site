/* Throwaway: a pinwheel should scale to the sub-block, like an HST does. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 3 });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.locator('.palette input[type="color"]').fill('#6f8fe0');

const cellAt = async (i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();
const clickIn = async (i, fx, fy) => {
  const b = await cellAt(i);
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
};

// Give three blocks grids of 1, 2x2 and 4x4.
const targets = [7, 8, 9];
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
for (const [i, division] of [[8, '2 by 2'], [9, '4 by 4']]) {
  await clickIn(i, 0.5, 0.5);
  await page.getByRole('button', { name: division, exact: true }).click();
}

// Stamp the same pinwheel into the top-left corner of each.
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
for (const i of targets) await clickIn(i, 0.1, 0.1);

await page.mouse.move(5, 5);
const a = await cellAt(6);
const z = await cellAt(10);
await page.screenshot({
  path: `${DIR}stamp-grid.png`,
  clip: { x: a.x - 4, y: a.y - 4, width: z.x + z.width - a.x + 8, height: a.height + 8 }
});
await browser.close();
