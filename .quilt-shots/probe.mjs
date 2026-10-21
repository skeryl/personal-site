import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
console.log(await page.evaluate(() => {
  const r = document.querySelector('.readout');
  const cs = getComputedStyle(r);
  const t = document.querySelector('.titlebar');
  return {
    readout: { h: r.getBoundingClientRect().height, margin: cs.margin, padding: cs.padding, font: cs.fontSize, lh: cs.lineHeight },
    titlebar: { h: t.getBoundingClientRect().height, padding: getComputedStyle(t).padding },
    name: document.querySelector('.quilt-name').getBoundingClientRect().height,
    size: document.querySelector('.size').getBoundingClientRect().height,
  };
}));
await browser.close();
