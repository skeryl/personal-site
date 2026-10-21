/* Throwaway: placing with no colour at all, and the per-role unset slots. */
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

console.log('palette size at load:', await page.locator('.palette .swatch:not(.add)').count());
console.log('banner at load:', await page.locator('.banner').count());

// Place with nothing in the palette at all.
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
await cell(0).click();
await park();
console.log('HST with no colour:', await fills(0));

await page.getByRole('button', { name: 'Four patch', exact: true }).click();
await cell(1).click();
await park();
console.log('four patch with no colour:', await fills(1));

// A plain square stays blank, and still reads as empty.
await page.getByRole('button', { name: 'Square', exact: true }).click();
await cell(2).click();
await park();
console.log('plain square with no colour:', await fills(2));

// The lasso takes the placed shapes but not the blank square.
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
const a = await cell(0).boundingBox();
const c = await cell(2).boundingBox();
await page.mouse.move(a.x + 2, a.y + 2);
await page.mouse.down();
await page.mouse.move(c.x + c.width - 2, c.y + c.height - 2, { steps: 6 });
await page.mouse.up();
console.log('lasso readout:', await page.locator('.readout').textContent());

// Attributes lists a slot per role.
await cell(0).click();
console.log('slots for the bare HST:', await page.locator('.colors .color-label').allTextContents());
await page.locator('.attributes').screenshot({ path: DIR + 'unset-roles.png' });
await page.locator('.wall').screenshot({ path: DIR + 'unset-quilt.png' }).catch(() => {});

// Colouring Unset 1 leaves Unset 2 alone.
const one = page.locator('.colors .color').filter({ hasText: 'Unset 1' });
await one.locator('.swatch').first().click();
await one.locator('.picker .new').click();
await page.locator('.picker-window .hex-chip').fill('4F7FE8');
await page.locator('.picker-window .close').click();
await park();
console.log('HST after colouring Unset 1:', await fills(0));
console.log('slots now:', await page.locator('.colors .color-label').allTextContents());
console.log('errors:', errors);
await browser.close();
