/* Throwaway: headers must stay pinned once the wall scrolls. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.selectOption('.size select', 'king');
await page.waitForTimeout(150);

const headerAt = async () => page.evaluate(() => {
  const first = document.querySelector('.col-headers .head');
  const cell = document.querySelector('[data-cell-index="0"]');
  const rowFirst = document.querySelector('.row-headers .head');
  return {
    colLeft: Math.round(first.getBoundingClientRect().left),
    cellLeft: Math.round(cell.getBoundingClientRect().left),
    rowTop: Math.round(rowFirst.getBoundingClientRect().top),
    cellTop: Math.round(cell.getBoundingClientRect().top),
    stripTop: Math.round(document.querySelector('.col-strip').getBoundingClientRect().top)
  };
});

console.log('fit  ', JSON.stringify(await headerAt()));
await page.screenshot({ path: `${DIR}frozen-fit.png` });

// Zoom in and scroll well away from the origin.
for (let i = 0; i < 7; i++) await page.keyboard.press('+');
await page.locator('.viewport').evaluate((el) => { el.scrollLeft = 900; el.scrollTop = 700; el.dispatchEvent(new Event('scroll')); });
await page.waitForTimeout(120);
console.log('scrolled', JSON.stringify(await headerAt()));
console.log('col heads visible:', await page.locator('.col-headers .head').count());
await page.screenshot({ path: `${DIR}frozen-zoom.png` });
console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'no page errors');
await browser.close();
