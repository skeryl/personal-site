import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const [file, xStr, y0Str, y1Str] = process.argv.slice(2);
const b64 = readFileSync(file).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
const out = await page.evaluate(async ({ dataUrl, x, y0, y1 }) => {
  const img = new Image(); img.src = dataUrl; await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const cols = [];
  for (let xx = x - 3; xx <= x + 3; xx++) {
    const counts = new Map();
    const { data } = ctx.getImageData(xx, y0, 1, y1 - y0);
    for (let i = 0; i < data.length; i += 4) {
      const key = `#${[data[i], data[i+1], data[i+2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    cols.push([xx, [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3)]);
  }
  return cols;
}, { dataUrl: `data:image/png;base64,${b64}`, x: +xStr, y0: +y0Str, y1: +y1Str });
for (const [x, top] of out) console.log('x=' + x, JSON.stringify(top));
await browser.close();
