/* Throwaway: clicking off the quilt drops the selection; the palette does not. */
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
const readout = () => page.locator('.readout').textContent();

await page.getByRole('button', { name: 'Half square triangle', exact: true }).click();
await cell(0).click();
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await cell(0).click();
console.log('selected:', await readout());

// The palette still acts on the selection rather than dropping it.
await page.getByRole('button', { name: '2 by 2', exact: true }).click();
console.log('after a grid chip:', await readout());

// A click on the wall beside the quilt lets it go.
const vp = await page.locator('.viewport').boundingBox();
await page.mouse.click(vp.x + 12, vp.y + vp.height - 12);
await page.waitForTimeout(120);
console.log('after clicking the wall:', await readout());
console.log('errors:', errors);
await browser.close();
