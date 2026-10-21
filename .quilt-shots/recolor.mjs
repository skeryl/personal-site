/* Throwaway: editing a palette colour repaints everything cut from it. */
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

const add = async (name, hex) => {
  await page.locator('.palette .add input[type="color"]').fill(hex);
  await page.locator('.active .name').fill(name);
};
await add('Navy', '#2f3d6b');
await add('Cream', '#efe6d2');
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
const box = async (i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();
for (const i of [7, 8, 13, 14, 20, 26]) { const b = await box(i); await page.mouse.click(b.x + b.width/2, b.y + b.height/2); }

const crop = async (name) => {
  await page.mouse.move(5, 5);
  const a = await box(7); const z = await box(27);
  await page.screenshot({ path: `${DIR}${name}.png`, clip: { x: a.x - 4, y: a.y - 4, width: z.x + z.width - a.x + 8, height: z.y + z.height - a.y + 8 } });
};
await crop('recolor-before');
await page.getByRole('button', { name: /^Paint with Cream/ }).dblclick();
await page.locator('.recolor-picker').fill('#c23b22');
await crop('recolor-after');
console.log('done');
await browser.close();
