import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
console.log(await page.evaluate(() => {
  const side = document.querySelector('.side');
  return {
    rows: getComputedStyle(side).gridTemplateRows,
    height: side.getBoundingClientRect().height,
    children: [...side.children].map((c) => `${c.tagName}.${String(c.className).split(' ')[0]} h=${Math.round(c.getBoundingClientRect().height)}`)
  };
}));
await browser.close();
