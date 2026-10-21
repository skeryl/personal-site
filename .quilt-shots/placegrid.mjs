/* Throwaway: cycling the grid while placing changes how fine a piece lands. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 3 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.removeItem('quilt-builder:v3');
  localStorage.removeItem('quilt-builder:panels');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.locator('.palette .add input[type="color"]').fill('#6f8fe0');
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();

const box = async (i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();
// Same block type, three grids, three squares.
for (const [i, grid] of [[7, 'One piece'], [8, '2 by 2'], [9, '4 by 4']]) {
  await page.getByRole('button', { name: grid, exact: true }).click();
  const b = await box(i);
  await page.mouse.click(b.x + b.width * 0.15, b.y + b.height * 0.15);
}
await page.mouse.move(5, 5);
const a = await box(6); const z = await box(10);
await page.screenshot({ path: `${DIR}place-grid.png`, clip: { x: a.x - 4, y: a.y - 4, width: z.x + z.width - a.x + 8, height: a.height + 8 } });
console.log('tool after cycling:', await page.locator('.actions .action.active').innerText());
console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'no page errors');
await browser.close();
