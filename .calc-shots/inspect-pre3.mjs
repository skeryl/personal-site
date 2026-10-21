import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/journal/calc-builder');
await page.waitForSelector('[data-present]');
const rules = await page.evaluate(() => {
	const hits = [];
	for (const sheet of document.styleSheets) {
		let cssRules;
		try {
			cssRules = sheet.cssRules;
		} catch {
			continue;
		}
		for (const rule of cssRules) {
			if (rule.selectorText === '.code') {
				hits.push({
					css: rule.cssText.slice(0, 300),
					href: sheet.href,
					owner: sheet.ownerNode?.id || sheet.ownerNode?.tagName
				});
			}
		}
	}
	return hits;
});
console.log(JSON.stringify(rules, null, 2));
await browser.close();
