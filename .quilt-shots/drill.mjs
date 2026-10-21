/* Throwaway: cmd-click drills to a piece; cmd-drag still moves and sweeps. */
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
const park = () => page.mouse.move(5, 5);
const readout = () => page.locator('.readout').textContent();
const outlines = () => page.locator('polygon.piece-outline').count();

await page.locator('.palette .add').click();
await page.locator('.picker-window .hex-chip').fill('4F7FE8');
await page.locator('.picker-window .close').click();
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
await cell(8).click();
await cell(9).click();
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await park();

const at = async (i, fx, fy, mods) => {
  const b = await cell(i).boundingBox();
  for (const m of mods) await page.keyboard.down(m);
  await page.mouse.move(b.x + b.width * fx, b.y + b.height * fy);
  await page.mouse.down();
  await page.mouse.up();
  for (const m of mods) await page.keyboard.up(m);
};

await at(8, 0.25, 0.12, ['ControlOrMeta']);
console.log('cmd-click:', await readout(), '/ outlines', await outlines());

await page.keyboard.press('Escape');
await at(8, 0.25, 0.12, ['Alt']);
console.log('alt-click: ', await readout(), '/ outlines', await outlines());

// cmd-hover previews the piece.
await page.keyboard.press('Escape');
const b = await cell(9).boundingBox();
await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.12);
await page.keyboard.down('ControlOrMeta');
await page.waitForTimeout(120);
console.log('cmd-hover outlines:', await outlines());
await page.keyboard.up('ControlOrMeta');
await page.waitForTimeout(120);
console.log('after release:     ', await outlines());
await park();

// cmd-drag still sweeps including empty squares.
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
const c = await cell(2).boundingBox();
const d = await cell(14).boundingBox();
await page.keyboard.down('ControlOrMeta');
await page.mouse.move(c.x + 4, c.y + 4);
await page.mouse.down();
await page.mouse.move(d.x + d.width - 4, d.y + d.height - 4, { steps: 8 });
await page.mouse.up();
await page.keyboard.up('ControlOrMeta');
console.log('cmd-drag sweep:', await readout());
console.log('errors:', errors);
await browser.close();
