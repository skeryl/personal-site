/* Throwaway: an unset swatch has an edge to aim at. */
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

// A white fabric in the palette: it must still show an edge.
await page.locator('.add-color').click();
await page.locator('.picker-window .hex-chip').fill('FFFFFF');
await page.locator('.picker-window .name').fill('Muslin');
await page.locator('.picker-window .close').click();
console.log('white chip border:', await page.locator('.palette .chip').first().evaluate((el) => getComputedStyle(el).borderTopColor + ' ' + getComputedStyle(el).borderTopWidth));

// A piece with no fabric at all: checkerboard, not white.
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
const b = await cell(0).boundingBox();
await page.mouse.click(b.x + b.width * 0.25, b.y + b.height * 0.75);
await page.locator('.actions').getByRole('button', { name: /^Select/ }).click();
await page.keyboard.down('ControlOrMeta');
await page.mouse.click(b.x + b.width * 0.75, b.y + b.height * 0.25);
await page.keyboard.up('ControlOrMeta');
await page.waitForTimeout(150);
console.log('readout:', await page.locator('.readout').textContent());
const sw = page.locator('.colors .swatch').first();
console.log('bare swatch:', await sw.evaluate((el) => ({
  cls: el.className.split(' ').filter((c) => !c.startsWith('svelte')).join(' '),
  image: getComputedStyle(el).backgroundImage.slice(0, 40),
  border: getComputedStyle(el).borderTopWidth + ' ' + getComputedStyle(el).borderTopColor
})));
await page.locator('.colors').screenshot({ path: DIR + 'bare.png' });
console.log('errors:', errors);
await browser.close();
