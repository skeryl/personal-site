/* Throwaway: are the hover and selected outlines actually visible now? */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 3 });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

await page.locator('.palette input[type="color"]').fill('#2f3d6b');
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
for (const i of [7, 8, 13, 14]) {
  const b = await page.locator(`[data-cell-index="${i}"]`).boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();

// Select two, then hover a third.
await page.locator('[data-cell-index="7"]').click();
await page.locator('[data-cell-index="8"]').click({ modifiers: ['Shift'] });
await page.locator('[data-cell-index="14"]').hover();

const a = await page.locator('[data-cell-index="0"]').boundingBox();
const z = await page.locator('[data-cell-index="21"]').boundingBox();
await page.screenshot({
  path: `${DIR}outlines.png`,
  clip: { x: a.x - 6, y: a.y - 6, width: z.x + z.width - a.x + 12, height: z.y + z.height - a.y + 12 }
});
console.log('readout:', await page.locator('.readout').innerText());
await browser.close();
