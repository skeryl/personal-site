/* Throwaway: the header and the two-line footer. */
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

await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
for (const i of [0, 1, 7]) await page.locator(`[data-cell-index="${i}"]`).click();
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await page.locator('[data-cell-index="0"]').click();
await page.mouse.move(5, 5);

const box = async (sel) => { const b = await page.locator(sel).boundingBox(); return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
for (const sel of ['.titlebar', '.readout', '.size', '.actions', '.footer', '.zoom', '.caption', '.export', '.wall-frame']) {
  console.log(sel.padEnd(12), await box(sel));
}
console.log('readout text:', await page.locator('.readout').textContent());
console.log('page scrolls?', await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight));
await page.screenshot({ path: DIR + 'layout-full.png' });
await page.locator('.titlebar').screenshot({ path: DIR + 'layout-top.png' });
await page.locator('.wall-frame').screenshot({ path: DIR + 'layout-frame.png' });
console.log('errors:', errors);
await browser.close();
