/* Throwaway: the redesigned colour selection and palette. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const cell = (i) => page.locator(`[data-cell-index="${i}"]`);

const add = async (hex, name) => {
  await page.locator('.add-color').click();
  await page.locator('.picker-window .hex-chip').fill(hex);
  await page.locator('.picker-window .name').fill(name);
  await page.locator('.picker-window .close').click();
};
await add('4F7FE8', 'Denim');
await add('F4A6A6', 'Peach');

await page.getByRole('button', { name: /^Paint with Denim/ }).click();
await page.locator('.picker-window .close').click();
await page.getByRole('button', { name: 'Square', exact: true }).click();
for (const i of [0, 1, 2]) await cell(i).click();
await page.mouse.move(5, 5);
console.log('palette labels:', await page.locator('.entry-name').allTextContents());

const chip = await page.locator('.palette .chip').first().boundingBox();
console.log('palette chip:', chip && { w: Math.round(chip.width), h: Math.round(chip.height) });

await page.locator('.actions').getByRole('button', { name: /^Select/ }).click();
await cell(0).click();
const sw = await page.locator('.colors .swatch').first().boundingBox();
console.log('selection swatch:', sw && { w: Math.round(sw.width), h: Math.round(sw.height) });
console.log('slot labels:', await page.locator('.colors .color-label').allTextContents());
console.log('slot hexes: ', (await page.locator('.colors .hex-chip').allTextContents()).map((t) => t.trim()));
console.log('headings:', await page.locator('.attributes .label.section').allTextContents());
await page.locator('.pane').screenshot({ path: DIR + 'colours.png' });
console.log('errors:', errors);
await browser.close();
