import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1250 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-present]');

// Interviews slide
await page.locator('[data-present]').click();
for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(650);
await page.screenshot({ path: '.calc-shots/needs-slide.png' });

// Debugger mid-walkthrough on the avg-credit-score calc, inside the demo slide
for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(650);
await page.locator('[data-tab="library"]').click();
await page.locator('[data-calc-load="avg-credit-score"]').click();
await page.locator('[data-tab="debug"]').click();
for (let i = 0; i < 3; i++) await page.locator("[data-debug-next]").click();
await page.waitForTimeout(200);
await page.screenshot({ path: '.calc-shots/debugger.png' });
await browser.close();
console.log('done');
