/* Throwaway: what is under the cursor after the first of the two clicks? */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.locator('.palette .add').click();
await page.locator('.picker-window .close').click();
await page.locator('.active .name').fill('Blue');

const sw = page.locator('.palette .swatch:not(.add)').first();
const box = await sw.boundingBox();
const x = box.x + box.width / 2, y = box.y + box.height / 2;
const at = () => page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  const side = document.querySelector('.side');
  return { tag: el.tagName, cls: String(el.className).slice(0, 40), scroll: side.scrollTop };
}, [x, y]);

console.log('point', Math.round(x), Math.round(y));
console.log('before   ', await at());
await page.mouse.click(x, y);
await page.waitForTimeout(150);
console.log('after 1st', await at());
console.log('swatch box now', await sw.boundingBox());
await browser.close();
