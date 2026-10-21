/* Throwaway: paint fills a blank square; a block type lands on the selection. */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
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

await add('4F7FE8');
await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
await cell(0).click();
await park();

await add('38511F');
await page.locator('.actions').getByRole('button', { name: /^Paint/ }).click();
const blank = await cell(3).boundingBox();
await page.mouse.click(blank.x + blank.width / 2, blank.y + blank.height / 2);
await park();
console.log('blank square after painting:', await fills(3));
const b = await cell(0).boundingBox();
await page.mouse.click(b.x + b.width * 0.8, b.y + b.height * 0.2);
await park();
console.log('the triangle keeps its cut:  ', await fills(0));

// Block type onto a selection of empty squares.
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
const e1 = await cell(10).boundingBox();
const e2 = await cell(12).boundingBox();
await page.keyboard.down('Meta');
await page.mouse.move(e1.x + 4, e1.y + 4);
await page.mouse.down();
await page.mouse.move(e2.x + e2.width - 4, e2.y + e2.height - 4, { steps: 6 });
await page.mouse.up();
await page.keyboard.up('Meta');
console.log('selected:', await page.locator('.readout').textContent());
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
await park();
console.log('pinwheel over the selection:', (await fills(10)).length, (await fills(11)).length, (await fills(12)).length);
console.log('selection kept:', await page.locator('.readout').textContent());
console.log('tool still:', (await page.locator('.actions .active').textContent()).trim());
console.log('errors:', errors);
await browser.close();
