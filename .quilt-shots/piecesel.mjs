/* Throwaway: alt-click drills to a piece; alt-drag still duplicates. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 3 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

await page.locator('.palette input[type="color"]').fill('#6f8fe0');
await page.getByRole('button', { name: 'Pinwheel', exact: true }).click();
const box = async (i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();
for (const i of [8, 9]) { const b = await box(i); await page.mouse.click(b.x + b.width/2, b.y + b.height/2); }

await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
// Alt-click one triangle of the pinwheel in cell 8.
const b = await box(8);
await page.keyboard.down('Alt');
await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.12);
await page.mouse.down();
await page.mouse.up();
await page.keyboard.up('Alt');
await page.mouse.move(5, 5);
console.log('readout:', await page.locator('.readout').innerText());
console.log('piece outlines:', await page.locator('polygon.piece-outline').count());

const a = await box(7); const z = await box(11);
await page.screenshot({ path: `${DIR}piece-selected.png`, clip: { x: a.x - 4, y: a.y - 4, width: z.x + z.width - a.x + 8, height: a.height + 8 } });
await page.locator('.attributes').scrollIntoViewIfNeeded();
await page.locator('.attributes').screenshot({ path: `${DIR}piece-attrs.png` });
console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'no page errors');
await browser.close();
