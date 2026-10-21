/* Throwaway: 4x4 blocks zoomed out should read as colour, not as line noise. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.removeItem('quilt-builder:v3');
  localStorage.removeItem('quilt-builder:v2');
  localStorage.removeItem('quilt-builder:panels');
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
await page.selectOption('.size select', 'king');
await page.waitForTimeout(150);

const add = async (hex) => page.locator('.palette .add input[type="color"]').fill(hex);
await add('#c766e4');
const box = async (i) => page.locator(`[data-cell-index="${i}"]`).boundingBox();

// Paint a patch of 4x4 blocks, alternating two colours inside each.
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
const patch = [];
for (let r = 3; r <= 8; r++) for (let c = 2; c <= 9; c++) patch.push(r * 14 + c);
const first = await box(patch[0]);
const last = await box(patch[patch.length - 1]);
await page.mouse.move(first.x + 4, first.y + 4);
await page.mouse.down();
await page.mouse.move(last.x + last.width - 4, last.y + last.height - 4, { steps: 10 });
await page.mouse.up();
await page.getByRole('button', { name: '4 by 4', exact: true }).click();

await page.locator('.actions').getByRole('button', { name: /^Place/ }).click();
await page.getByRole('button', { name: 'Square', exact: true }).click();
for (const i of patch) {
  const b = await box(i);
  for (let k = 0; k < 16; k += 2) {
    const fx = ((k % 4) + 0.5) / 4;
    const fy = (Math.floor(k / 4) + 0.5) / 4;
    await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
  }
}
await add('#5f7a5a');
for (const i of patch.slice(0, 8)) {
  const b = await box(i);
  await page.mouse.click(b.x + b.width * 0.375, b.y + b.height * 0.375);
}

await page.mouse.move(5, 5);
const a = await box(patch[0]);
const z = await box(patch[patch.length - 1]);
await page.screenshot({ path: `${DIR}noise-out.png`, clip: { x: a.x - 6, y: a.y - 6, width: z.x + z.width - a.x + 12, height: z.y + z.height - a.y + 12 } });
for (let i = 0; i < 6; i++) await page.keyboard.press('+');
await page.waitForTimeout(150);
await page.screenshot({ path: `${DIR}noise-in.png`, clip: await page.locator('.viewport').boundingBox() });
console.log('done');
await browser.close();
