/* Throwaway: alt in Place mode covers the whole square, however finely divided. */
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

await page.locator('.palette .add').click();
await page.locator('.picker-window .hex-chip').fill('4F7FE8');
await page.locator('.picker-window .close').click();

const cell = (i) => page.locator(`[data-cell-index="${i}"]`);
const fills = (i) => cell(i).locator('polygon:not(.piece-outline), rect:not(.piece-outline)').evaluateAll(
  (els) => els.map((e) => e.getAttribute('fill')).filter(Boolean)
);
const park = () => page.mouse.move(5, 5);

// A 4x4 square full of pinwheels.
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
await page.getByRole('button', { name: '4 by 4', exact: true }).click();
await cell(1).click();
await park();
console.log('after 4x4 pinwheel fill:', (await fills(1)).length, 'pieces');

// Alt-hover previews the whole-square placement...
const box = await cell(1).boundingBox();
await page.keyboard.down('Alt');
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
await page.waitForTimeout(150);
console.log('alt hover preview:', (await fills(1)).length, 'pieces');
await page.locator('.wall, .blanket').first().screenshot({ path: DIR + 'alt-preview.png' }).catch(() => {});

// ...and clicking commits it.
await page.mouse.down();
await page.mouse.up();
await page.keyboard.up('Alt');
await park();
console.log('after alt click:', (await fills(1)).length, 'pieces');

// Without alt, the same click lands in one sixteenth of a fresh 4x4 square.
await cell(2).click();
await park();
console.log('plain 4x4 square:', (await fills(2)).length, 'pieces');
const b2 = await cell(2).boundingBox();
await page.mouse.click(b2.x + b2.width * 0.1, b2.y + b2.height * 0.1);
await park();
console.log('after plain click:', (await fills(2)).length, 'pieces');
console.log('errors:', errors);
await browser.close();
