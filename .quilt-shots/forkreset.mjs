/* Throwaway: a row forks a fabric, reset unsets, and removing a colour keeps shapes. */
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
const add = async (hex) => {
  await page.locator('.palette .add').click();
  await page.locator('.picker-window .hex-chip').fill(hex);
  await page.locator('.picker-window .close').click();
};
const paletteSize = () => page.locator('.palette .swatch:not(.add)').count();

await add('4F7FE8');
await page.getByRole('button', { name: 'Square', exact: true }).click();
await cell(0).click();
await cell(1).click();
await park();
console.log('two blue squares:', await fills(0), await fills(1), 'palette', await paletteSize());

// Change A1's colour through its row: forks rather than repainting B1.
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await cell(0).click();
await page.locator('.colors .color').first().locator('.swatch').click();
const sv = await page.locator('.picker-window .sv').boundingBox();
await page.mouse.move(sv.x + sv.width * 0.5, sv.y + sv.height * 0.5);
await page.mouse.down();
await page.mouse.move(sv.x + sv.width * 0.9, sv.y + sv.height * 0.2, { steps: 6 });
await page.mouse.up();
const mixed = await page.locator('.picker-window .hex-chip').inputValue();
await page.locator('.picker-window .close').click();
await park();
console.log('A1 forked to', (await fills(0))[0], '/ B1 kept', (await fills(1))[0], '/ palette', await paletteSize(), '/ mixed', mixed);

// Reset puts the row back to unset.
await cell(0).click();
await page.locator('.colors .color').first().locator('.swatch').click();
await page.locator('.picker-window .reset').click();
await park();
console.log('A1 after reset:', await fills(0), 'slots:', await page.locator('.colors .color-label').allTextContents());

// Removing a palette colour leaves the shapes, unset.
console.log('B1 before delete:', await fills(1), 'palette', await paletteSize());
await page.getByRole('button', { name: /^Paint with/ }).first().click();
await page.keyboard.press('Delete');
await page.waitForTimeout(250);
await park();
console.log('palette after delete:', await paletteSize(), 'B1 now:', await fills(1));
console.log('errors:', errors);
await browser.close();
