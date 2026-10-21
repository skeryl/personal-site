/* Throwaway: no selection in Place mode, and the Unset colour slot. */
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

const add = async (hex) => {
  await page.locator('.palette .add').click();
  await page.locator('.picker-window .hex-chip').fill(hex);
  await page.locator('.picker-window .close').click();
};
const cell = (i) => page.locator(`[data-cell-index="${i}"]`);
const pts = (i) => cell(i).locator('polygon:not(.piece-outline)').evaluateAll((e) => e.map((n) => n.getAttribute('points')));
const park = () => page.mouse.move(5, 5);
const mouse = () => page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
const place = () => page.locator('.actions').getByRole('button', { name: /^Place/ }).click();

await add('4F7FE8');
// A half square triangle on an empty square: one piece coloured, one bare.
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
await cell(0).click();
await park();
const before = await pts(0);
console.log('pieces in A1:', before.length);

// --- 1. A selection must not survive into Place mode ---
await mouse();
await cell(0).click();
console.log('readout after selecting:', await page.locator('.readout').textContent());
await place();
console.log('readout after arming Place:', await page.locator('.readout').textContent());
await page.keyboard.press('r');
await park();
console.log('A1 unchanged after R:', JSON.stringify(await pts(0)) === JSON.stringify(before));
await cell(1).click();
await park();
console.log('A2 differs from A1 (R turned the armed shape):', JSON.stringify(await pts(1)) !== JSON.stringify(before));

// --- 2. The Unset colour slot ---
await add('38511F');
await mouse();
await cell(0).click();
const labels = await page.locator('.colors .color-label').allTextContents();
const names = await page.locator('.colors .color-name').allTextContents();
console.log('slots:', labels, names);
await page.locator('.attributes').screenshot({ path: DIR + 'unset-slot.png' });

// Filling the unset slot colours every bare piece in the selection.
const unset = page.locator('.colors .color').filter({ hasText: 'UNSET' });
await unset.locator('.swatch').first().click();
await unset.locator('.picker .swatch.small').last().click();
await park();
const fills = await cell(0).locator('polygon:not(.piece-outline)').evaluateAll((e) => e.map((n) => n.getAttribute('fill')));
console.log('A1 fills after filling Unset:', fills);
console.log('slots now:', await page.locator('.colors .color-label').allTextContents());
console.log('errors:', errors);
await browser.close();
