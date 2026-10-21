/* Throwaway: a COLOR row goes straight to the picker; patterns fit their square. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('dialog', (d) => d.accept('Tall one'));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const cell = (i) => page.locator(`[data-cell-index="${i}"]`);
const fills = (i) => cell(i).locator('polygon:not(.piece-outline)').evaluateAll((e) => e.map((n) => n.getAttribute('fill')));
const add = async (hex) => {
  await page.locator('.palette .add').click();
  await page.locator('.picker-window .hex-chip').fill(hex);
  await page.locator('.picker-window .close').click();
};
await add('4F7FE8');
await add('38511F');
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
await cell(0).click();
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await cell(0).click();
console.log('slots:', await page.locator('.colors .color-label').allTextContents());

// One click on COLOR 1 goes straight to the modal.
await page.locator('.colors .color').first().locator('.swatch').click();
await page.waitForTimeout(150);
console.log('popover gone:', await page.locator('.colors .picker').count());
console.log('picker open:', await page.locator('.picker-window').count());
console.log('hex:', await page.locator('.picker-window .hex-chip').inputValue());

// Its palette remaps the row.
await page.locator('.picker-window .pick').first().click();
await page.waitForTimeout(150);
await page.locator('.picker-window .close').click();
await page.mouse.move(5, 5);
console.log('after remapping via the window:', await fills(0));
console.log('selection kept:', await page.locator('.readout').textContent());

// A 1x2 pattern icon fits its square.
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
await cell(6).click();
await cell(12).click();
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await cell(6).click();
await cell(12).click({ modifiers: ['Shift'] });
console.log('capturable selection:', await page.locator('.readout').textContent());
await page.getByRole('button', { name: /Add selection as pattern/ }).click();
await page.waitForTimeout(250);
console.log('saved count:', await page.locator('.saved').count());
const icon = await page.locator('.saved .type').first().boundingBox();
const art = await page.locator('.saved .type .pattern').first().boundingBox();
console.log('button: ', icon && { w: Math.round(icon.width), h: Math.round(icon.height) });
console.log('artwork:', art && { w: Math.round(art.width), h: Math.round(art.height) });
await page.locator('[data-panel="patterns"]').screenshot({ path: DIR + 'pattern-fit.png' });
console.log('errors:', errors);
await browser.close();
