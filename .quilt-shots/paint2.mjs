/* Throwaway: Paint colours what is there and leaves blank space blank. */
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
const pts = (i) => cell(i).locator('polygon:not(.piece-outline)').evaluateAll((e) => e.map((n) => n.getAttribute('points')));
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
const shape = await pts(0);

await add('38511F');
await page.locator('.actions').getByRole('button', { name: /^Paint/ }).click();
console.log('banner:', (await page.locator('.banner').textContent()).trim());

// A blank square is left alone.
const blank = await cell(3).boundingBox();
await page.mouse.click(blank.x + blank.width / 2, blank.y + blank.height / 2);
await park();
console.log('blank square after painting:', await fills(3));

// A drag across blank space and the shape only touches the shape.
const b = await cell(0).boundingBox();
await page.mouse.move(blank.x + 5, blank.y + blank.height / 2);
await page.mouse.down();
await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.8, { steps: 10 });
await page.mouse.up();
await park();
console.log('blank after the drag:', await fills(3));
console.log('shape after the drag: ', await fills(0));
console.log('shape geometry intact:', JSON.stringify(await pts(0)) === JSON.stringify(shape));
console.log('undo enabled:', await page.locator('.actions').getByRole('button', { name: /^Undo/ }).isEnabled());
console.log('errors:', errors);
await browser.close();
