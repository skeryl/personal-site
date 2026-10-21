import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const dump = async (label) => {
  const rows = await page.$$eval('.composition .chip', (els) =>
    els.map((e) => ({ label: e.getAttribute('aria-label'), active: e.classList.contains('active'), pressed: e.getAttribute('aria-pressed') }))
  );
  console.log(label, JSON.stringify(rows));
};
await dump('initial      ');
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await page.locator('[data-cell-index="8"]').click();
await page.locator('[data-cell-index="15"]').click({ modifiers: ['Shift'] });
await dump('2 selected   ');
await browser.close();
