import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-present]');
await page.locator('[data-present]').click();
for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
await page.waitForSelector('.code');
const rules = await page.evaluate(() => {
	const pre = document.querySelector('.code');
	const hits = [];
	for (const sheet of document.styleSheets) {
		let cssRules;
		try {
			cssRules = sheet.cssRules;
		} catch {
			continue;
		}
		for (const rule of cssRules) {
			if (rule.style && rule.style.whiteSpace && pre.matches(rule.selectorText || '§')) {
				hits.push({ sel: rule.selectorText, ws: rule.style.whiteSpace });
			}
		}
	}
	return hits;
});
console.log(JSON.stringify(rules, null, 2));
await browser.close();
