/* Throwaway: the Attributes palette with a selection. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

const add = async (name, hex) => {
  await page.locator('.palette .add input[type="color"]').fill(hex);
  await page.locator('.active .name').fill(name);
};
await add('Navy', '#2f3d6b');
await page.getByRole('button', { name: 'Square', exact: true }).click();
for (const i of [0, 1, 6, 7]) await page.locator(`[data-cell-index="${i}"]`).click();
await add('Cream', '#efe6d2');
await page.getByRole('button', { name: 'Pinwheel' }).click();
for (const i of [0, 1, 6, 7]) await page.locator(`[data-cell-index="${i}"]`).click();

await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await page.locator('[data-cell-index="0"]').click();
await page.locator('[data-cell-index="1"]').click({ modifiers: ['Shift'] });
await page.locator('.colors .color').first().locator('.swatch').click();
await page.mouse.move(10, 10);

await page.locator('.attributes').scrollIntoViewIfNeeded();
await page.locator('.attributes').screenshot({ path: `${DIR}attributes.png` });
await page.screenshot({ path: `${DIR}attributes-full.png` });
console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'no console errors');
await browser.close();
