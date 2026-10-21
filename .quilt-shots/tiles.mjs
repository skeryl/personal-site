/* Throwaway: measure the grid tiles against the design's numbers. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 3 });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:panels'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
console.log(JSON.stringify(await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('.composition .chip')];
  return tiles.map((chip) => {
    const svg = chip.querySelector('svg');
    const r = svg.getBoundingClientRect();
    const line = svg.querySelector('line');
    const cs = line ? getComputedStyle(line) : null;
    return {
      label: chip.getAttribute('aria-label'),
      box: [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10],
      frame: svg.querySelector('rect')?.getAttribute('stroke-width') ?? null,
      stroke: cs?.strokeWidth ?? null,
      dash: cs?.strokeDasharray ?? null
    };
  });
})));
const box = await page.locator('.composition').boundingBox();
await page.screenshot({ path: `${DIR}tiles.png`, clip: { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 } });
await browser.close();
