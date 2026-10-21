/* Throwaway: crop the left palette and the selection readout. */
import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
await page.waitForSelector('[data-cell-index="0"]');
// Select a couple of squares so the readout has something to say.
await page.locator('.actions').getByRole('button', { name: /^Mouse/ }).click();
await page.locator('[data-cell-index="8"]').click();
await page.locator('[data-cell-index="15"]').click({ modifiers: ['Shift'] });
await page.mouse.move(10, 10);
const side = await page.locator('.side').boundingBox();
await page.screenshot({ path: `${DIR}panel.png`, clip: { x: side.x, y: side.y, width: side.width, height: 420 } });
const readout = await page.locator('.readout').boundingBox();
await page.screenshot({ path: `${DIR}readout.png`, clip: { x: readout.x - 220, y: readout.y - 10, width: 640, height: 60 } });
await browser.close();
