/* Throwaway: does the app fit the window, and does only the wall scroll? */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.selectOption('.size select', 'king');
await page.waitForTimeout(150);

const m = await page.evaluate(() => {
  const vp = document.querySelector('.viewport');
  const side = document.querySelector('.side');
  return {
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
    pageOverflow: document.documentElement.scrollHeight - window.innerHeight,
    wallScrollsAtFit: vp.scrollHeight > vp.clientHeight + 1 || vp.scrollWidth > vp.clientWidth + 1,
    sideScrolls: side.scrollHeight > side.clientHeight + 1,
    vp: { w: vp.clientWidth, h: vp.clientHeight, sw: vp.scrollWidth, sh: vp.scrollHeight }
  };
});
console.log(JSON.stringify(m, null, 1));
await page.mouse.move(10, 10);
await page.screenshot({ path: `${DIR}fit.png` });
console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'no page errors');
await browser.close();
