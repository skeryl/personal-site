/* Throwaway: the custom colour picker, next to the design for comparison. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.removeItem('quilt-builder:v3'); localStorage.removeItem('quilt-builder:v2'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');

// The palette "+" opens it, and the fabric is already in the palette.
await page.locator('.palette .add').click();
await page.waitForSelector('.picker-window');
await page.locator('.picker-window .hex-chip').fill('5B88F2');
await page.locator('.picker-window .hex-chip').blur();
await page.waitForTimeout(120);

const win = page.locator('.picker-window');
console.log('window box:', await win.boundingBox());
await win.screenshot({ path: DIR + 'picker-ours.png' });
await page.screenshot({ path: DIR + 'picker-in-place.png' });

// The square and the strip track the pointer.
const sv = await page.locator('.picker-window .sv').boundingBox();
await page.mouse.move(sv.x + sv.width * 0.25, sv.y + sv.height * 0.3);
await page.mouse.down();
await page.mouse.move(sv.x + sv.width * 0.7, sv.y + sv.height * 0.55, { steps: 6 });
await page.mouse.up();
console.log('after sv drag:', await page.locator('.picker-window .hex-chip').inputValue());

const hue = await page.locator('.picker-window .hue').boundingBox();
await page.mouse.click(hue.x + hue.width / 2, hue.y + hue.height * 0.83);
console.log('after hue click (expect ~yellow):', await page.locator('.picker-window .hex-chip').inputValue());
console.log('palette swatch now:', await page.locator('.palette .swatch:not(.add)').last().evaluate((el) => getComputedStyle(el).backgroundColor));
await win.screenshot({ path: DIR + 'picker-dragged.png' });

// Dragging the title bar moves the window.
const before = await win.boundingBox();
const bar = await page.locator('.picker-window .bar').boundingBox();
await page.mouse.move(bar.x + 60, bar.y + 14);
await page.mouse.down();
await page.mouse.move(bar.x - 140, bar.y + 174, { steps: 8 });
await page.mouse.up();
const after = await win.boundingBox();
console.log('moved by:', Math.round(after.x - before.x), Math.round(after.y - before.y));

// Escape closes it.
await page.locator('.picker-window .close').click();
console.log('open after close button:', await page.locator('.picker-window').count());

// And a second fabric can be added straight after, with nothing in the way.
await page.locator('.palette .add').click();
await page.locator('.picker-window .hex-chip').fill('38511F');
await page.keyboard.press('Escape');
console.log('open after Escape:', await page.locator('.picker-window').count());
console.log('palette size:', await page.locator('.palette .swatch:not(.add)').count());
console.log('errors:', errors);
await browser.close();
