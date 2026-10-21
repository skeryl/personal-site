import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const info = await page.evaluate(() => {
  const d = document.querySelector('[data-panel="type"]');
  const s = d.querySelector('summary');
  const before = getComputedStyle(s, '::before');
  // Which stylesheet rules mention summary::before at all?
  const rules = [];
  for (const sheet of document.styleSheets) {
    let list;
    try { list = sheet.cssRules; } catch { continue; }
    for (const r of list) {
      if (r.selectorText && /summary/.test(r.selectorText) && /before/.test(r.selectorText)) {
        rules.push({ sel: r.selectorText, css: r.style.cssText.slice(0, 120) });
      }
    }
  }
  return {
    open: d.hasAttribute('open'),
    matchesOpen: d.matches('[open]'),
    transform: before.transform,
    content: before.content,
    borderLeft: before.borderLeftWidth,
    classes: s.className,
    rules
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
