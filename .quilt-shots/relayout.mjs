/* Throwaway: the pinned Attributes pane and the new wall footer. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const box = async (sel) => { const b = await page.locator(sel).boundingBox(); return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
for (const sel of ['.side', '.setting', '.stack', '.pane', '.pane-scroll', '.composition', '.attributes', '.trailer', '.actions', '.wall-actions', '.footer']) {
  console.log(sel.padEnd(14), await box(sel));
}
console.log('export in panel:', await page.locator('.side .export').count(), '/ in wall:', await page.locator('.wall-frame .export').count());
console.log('tools:', (await page.locator('.actions .action').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '));
console.log('wall actions:', (await page.locator('.wall-actions .action').allTextContents()).map((t) => t.trim()).join(' | '));
console.log('page scrolls?', await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight));
await page.screenshot({ path: DIR + 'relayout.png' });
console.log('errors:', errors);
await browser.close();
