/* Throwaway: which panel element changes height when the tool flips to Place? */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.locator('.palette .add').click();
await page.locator('.picker-window .close').click();

const snap = () => page.evaluate(() => {
  const out = {};
  const path = (el) => {
    const bits = [];
    for (let n = el; n && !n.classList?.contains('side'); n = n.parentElement) {
      bits.unshift(n.tagName + '.' + String(n.className).split(' ')[0] + ':' + ([...n.parentElement.children].indexOf(n)));
    }
    return bits.join('>');
  };
  document.querySelectorAll('.side *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height) out[path(el)] = Math.round(r.height * 10) / 10;
  });
  return out;
});
const a = await snap();
await page.locator('.palette .swatch:not(.add)').first().click();
await page.waitForTimeout(200);
const b = await snap();
for (const k of Object.keys(a)) if (b[k] !== undefined && b[k] !== a[k]) console.log(k, a[k], '->', b[k]);
for (const k of Object.keys(a)) if (b[k] === undefined) console.log('GONE', k, a[k]);
for (const k of Object.keys(b)) if (a[k] === undefined) console.log('NEW ', k, b[k]);
await browser.close();
