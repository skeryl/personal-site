/* Throwaway: natural height of each grid-hint wording, at panel width. */
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const texts = [
  'Pick a grid to paint it on, or select blocks to change theirs.',
  'Click or drag on the quilt to paint this grid.',
  'Pieces you place land at this grid. Hold alt to cover a whole square instead, however finely it is divided.',
  'Pieces you place land at this grid. Hold alt to cover a whole square.',
  'Pieces you place land at this grid. Hold alt for the whole square.',
  '3 blocks selected, mixed grids',
];
const out = await page.evaluate((texts) => {
  const hint = document.querySelectorAll('.hint')[0];
  const probe = hint.cloneNode(true);
  probe.style.minHeight = '0';
  probe.style.visibility = 'hidden';
  hint.parentElement.appendChild(probe);
  const r = texts.map((t) => { probe.textContent = t; return [t.slice(0, 44), probe.getBoundingClientRect().height]; });
  probe.remove();
  return { width: hint.getBoundingClientRect().width, r };
}, texts);
console.log('hint width', Math.round(out.width));
for (const [t, h] of out.r) console.log(String(h).padStart(5), t);
await browser.close();
