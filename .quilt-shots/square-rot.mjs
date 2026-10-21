/* Throwaway: an uncoloured square is a shape, and R turns only the armed icon. */
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
const park = () => page.mouse.move(5, 5);

// A plain square placed with no colour.
await page.getByRole('button', { name: 'Square', exact: true }).click();
await cell(0).click();
await park();
console.log('square with no colour:', await fills(0));
console.log('untouched neighbour:  ', await fills(5));

await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await cell(0).click();
console.log('slots:', await page.locator('.colors .color-label').allTextContents());
console.log('grid hint:', (await page.locator('[data-panel="grid"] .hint').textContent()).trim());

// Erase removes it.
await page.locator('.actions').getByRole('button', { name: /^Erase/ }).click();
await cell(0).click();
await park();
console.log('after erase:', await fills(0));

// R turns only the armed icon.
const iconPoints = async () => page.locator('.types .type').evaluateAll((els) =>
  els.slice(0, 6).map((el) => el.querySelector('polygon')?.getAttribute('points') ?? '-')
);
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
const before = await iconPoints();
await page.keyboard.press('r');
await page.waitForTimeout(120);
const after = await iconPoints();
console.log('icons changed by R:', before.map((p, i) => p !== after[i]));
console.log('armed is index 2 (HST):', await page.locator('.types .type.active').getAttribute('aria-label'));
await page.locator('.side').screenshot({ path: DIR + 'palette-rot.png' });
console.log('errors:', errors);
await browser.close();
