/* Throwaway: which element actually receives the dblclick? */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => console.log('[page]', m.text()));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.locator('.palette .add').click();
await page.locator('.picker-window .close').click();
await page.locator('.active .name').fill('Blue');

await page.evaluate(() => {
  document.addEventListener('dblclick', (e) => {
    const t = e.target;
    console.log('DBLCLICK on', t.tagName, t.className, 'label=', t.getAttribute('aria-label'));
  }, true);
  document.addEventListener('click', (e) => {
    const t = e.target;
    console.log('click detail=' + e.detail, t.tagName, t.className?.toString().slice(0, 40));
  }, true);
});

const sw = page.locator('.palette .swatch:not(.add)').first();
await sw.dblclick();
await page.waitForTimeout(300);
console.log('picker count:', await page.locator('.picker-window').count());
await browser.close();
