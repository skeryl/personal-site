/* Throwaway: the Attributes panel after the picker replaced the native inputs. */
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
  await page.locator('.palette .add').click();
  await page.locator('.picker-window .hex-chip').fill(hex);
  await page.locator('.picker-window .close').click();
  await page.locator('.active .name').fill(name);
};
await add('Navy', '2F3D6B');
await page.getByRole('button', { name: 'Square', exact: true }).click();
for (const i of [0, 1, 6, 7]) await page.locator(`[data-cell-index="${i}"]`).click();
await add('Cream', 'EFE6D2');
await page.getByRole('button', { name: 'Pinwheel' }).click();
for (const i of [0, 1, 6, 7]) await page.locator(`[data-cell-index="${i}"]`).click();

// A selection, so the COLOR n rows and their popovers show.
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await page.locator('[data-cell-index="0"]').click();
await page.locator('[data-cell-index="1"]').click({ modifiers: ['Shift'] });
await page.mouse.move(10, 10);
await page.locator('.attributes').screenshot({ path: DIR + 'panel-attrs.png' });

// The popover's "New color" opens the picker and remaps in one go.
await page.locator('.colors .color').first().locator('.swatch').click();
await page.waitForSelector('.colors .picker');
await page.locator('.colors .picker').screenshot({ path: DIR + 'panel-popover.png' });
await page.locator('.colors .picker .new').click();
console.log('picker open from popover:', await page.locator('.picker-window').count());
console.log('palette size (a fabric was added):', await page.locator('.palette .swatch:not(.add)').count());
await page.keyboard.press('Escape');
console.log('errors:', errors);
await browser.close();
