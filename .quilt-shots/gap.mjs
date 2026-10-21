import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
console.log(JSON.stringify(await page.evaluate(() => {
  const pick = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; };
  return {
    innerHeight: window.innerHeight,
    qb: pick('.qb'),
    hero: pick('.hero'),
    titlebar: pick('.titlebar'),
    body: pick('.body'),
    wallFrame: pick('.wall-frame'),
    side: pick('.side'),
    gapBelowWall: Math.round(window.innerHeight - document.querySelector('.wall-frame').getBoundingClientRect().bottom)
  };
})));
await browser.close();
