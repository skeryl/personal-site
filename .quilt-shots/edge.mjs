/* Sample a horizontal run of pixels from a design render. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const [file, yStr, x0Str, x1Str] = process.argv.slice(2);
const b64 = readFileSync(file).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
const out = await page.evaluate(async ({ dataUrl, y, x0, x1 }) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const rows = [];
  for (let yy = y - 3; yy <= y + 3; yy++) {
    const counts = new Map();
    const { data } = ctx.getImageData(x0, yy, x1 - x0, 1);
    for (let i = 0; i < data.length; i += 4) {
      const key = `#${[data[i], data[i+1], data[i+2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    rows.push([yy, [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3)]);
  }
  return rows;
}, { dataUrl: `data:image/png;base64,${b64}`, y: +yStr, x0: +x0Str, x1: +x1Str });
for (const [y, top] of out) console.log('y=' + y, JSON.stringify(top));
await browser.close();
