/* Most common saturated (non-grey) colours in a design render. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const browser = await chromium.launch();
const page = await browser.newPage();
for (const file of process.argv.slice(2)) {
  const b64 = readFileSync(file).toString('base64');
  const out = await page.evaluate(async (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const counts = new Map();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max - min > 35) {
        const key = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, `data:image/png;base64,${b64}`);
  console.log(file.split('/').pop().padEnd(24), JSON.stringify(out));
}
await browser.close();
