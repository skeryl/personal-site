import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

const probe = async (label, sel) => {
  const info = await page.locator(sel).evaluate((el) => {
    const cs = getComputedStyle(el);
    const svg = el.querySelector('svg');
    const r = el.getBoundingClientRect();
    const sr = svg.getBoundingClientRect();
    return {
      classes: el.className,
      boxShadow: cs.boxShadow,
      outline: cs.outline,
      svgCoversCell: sr.width >= r.width - 0.5 && sr.height >= r.height - 0.5
    };
  });
  console.log(label, JSON.stringify(info));
};

await page.locator('[data-cell-index="7"]').hover();
await probe('hovered ', '[data-cell-index="7"]');
await page.locator('[data-cell-index="7"]').click();
await page.mouse.move(5, 5);
await probe('selected', '[data-cell-index="7"]');
await browser.close();
