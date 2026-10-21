/* Throwaway: does the quilt settle at each zoom, or chase its own scrollbar? */
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--disable-features=OverlayScrollbar'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
// Force classic, space-taking scrollbars: overlay ones cannot show the bug.
await page.addStyleTag({ content: `
  .viewport::-webkit-scrollbar { width: 15px; height: 15px; }
  .viewport::-webkit-scrollbar-thumb { background: #999; }
` });
await page.waitForTimeout(200);

const gutter = await page.evaluate(() => {
  const p = document.createElement('div');
  p.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll';
  document.body.append(p);
  const n = p.offsetWidth - p.clientWidth;
  p.remove();
  return n;
});
console.log('scrollbar gutter in this browser:', gutter);

const sample = async () => {
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    seen.add(await page.locator('.blanket').evaluate((el) => Math.round(el.getBoundingClientRect().width)));
    await page.waitForTimeout(50);
  }
  return [...seen];
};

for (const size of ['throw', 'king']) {
  await page.selectOption('.size select', size);
  await page.waitForTimeout(200);
  for (let step = 0; step <= 4; step++) {
    if (step) await page.locator('.zoom').getByLabel('Zoom in').click();
    await page.waitForTimeout(200);
    const zoom = (await page.locator('.zoom-level').textContent()).trim();
    const widths = await sample();
    const vp = await page.locator('.viewport').evaluate((el) =>
      `off ${el.offsetWidth}x${el.offsetHeight} client ${el.clientWidth}x${el.clientHeight} scroll ${el.scrollWidth}x${el.scrollHeight}`);
    console.log(`${size.padEnd(5)} ${zoom.padStart(5)}  scrollbars ${vp}  widths seen: ${widths.join(', ')}${widths.length > 1 ? '   <-- OSCILLATING' : ''}`);
  }
  await page.locator('.zoom-level').click();
}
await browser.close();
