/* Throwaway: the Paint tool brushes colour onto pieces, leaving shapes alone. */
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
const fills = (i) => cell(i).locator('polygon:not(.piece-outline)').evaluateAll((e) => e.map((n) => n.getAttribute('fill')));
const pts = (i) => cell(i).locator('polygon:not(.piece-outline)').evaluateAll((e) => e.map((n) => n.getAttribute('points')));
const park = () => page.mouse.move(5, 5);
const add = async (hex) => {
  await page.locator('.palette .add').click();
  await page.locator('.picker-window .hex-chip').fill(hex);
  await page.locator('.picker-window .close').click();
};

await add('4F7FE8');
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
for (const i of [0, 1, 2]) await cell(i).click();
await park();
console.log('three HSTs:', await fills(0));
const shapeBefore = await pts(0);

// Paint the second half of A1 green, leaving the shape alone.
await add('38511F');
await page.locator('.actions').getByRole('button', { name: /^Paint/ }).click();
console.log('banner:', (await page.locator('.banner').textContent().catch(() => '-'))?.trim());
const b = await cell(0).boundingBox();
await page.mouse.click(b.x + b.width * 0.8, b.y + b.height * 0.2);
await park();
console.log('A1 after brushing one piece:', await fills(0));
console.log('A1 shape unchanged:', JSON.stringify(await pts(0)) === JSON.stringify(shapeBefore));

// A drag brushes across several.
const c = await cell(2).boundingBox();
await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.8);
await page.mouse.down();
await page.mouse.move(c.x + c.width * 0.2, c.y + c.height * 0.8, { steps: 10 });
await page.mouse.up();
await park();
console.log('after a drag:', await fills(0), await fills(1), await fills(2));

// T is the shortcut.
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await page.keyboard.press('t');
console.log('tool after T:', (await page.locator('.actions .active').textContent()).trim());
await page.locator('.wall-frame').screenshot({ path: DIR + 'paint.png' });
console.log('errors:', errors);
await browser.close();
