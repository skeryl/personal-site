/* Throwaway: the three rungs of the selection ladder. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 3 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

await page.locator('.palette input[type="color"]').fill('#6f8fe0');
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
const box = async (i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();
const b = await box(8);
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();

const shot = async (name) => {
  await page.mouse.move(5, 5);
  const a = await box(7); const z = await box(9);
  await page.screenshot({ path: `${DIR}${name}.png`, clip: { x: a.x - 4, y: a.y - 4, width: z.x + z.width - a.x + 8, height: a.height + 8 } });
  console.log(name, '->', await page.locator('.readout').innerText());
};

await page.keyboard.down('Alt');
await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.12);
await page.mouse.down(); await page.mouse.up();
await page.keyboard.up('Alt');
await shot('rung-piece');
await page.getByRole('button', { name: 'the block' }).click();
await shot('rung-block');
await page.getByRole('button', { name: 'the square' }).click();
await shot('rung-square');
console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'no page errors');
await browser.close();
