import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.removeItem('quilt-builder:panels'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
const probe = async (label) => {
  const rows = await page.evaluate(() =>
    ['grid', 'type', 'patterns', 'attributes'].map((id) => {
      const d = document.querySelector(`[data-panel="${id}"]`);
      const summary = d.querySelector('summary');
      return { id, open: d.hasAttribute('open'), marker: getComputedStyle(summary, '::before').transform };
    })
  );
  console.log(label, JSON.stringify(rows));
};
await probe('all open ');
await page.locator('[data-panel="type"] summary').click();
await page.locator('[data-panel="attributes"] summary').click();
await page.waitForTimeout(400);
await probe('2 closed ');
await browser.close();
