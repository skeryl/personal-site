import { chromium } from 'playwright';
const DIR = new URL('.', import.meta.url).pathname;
const run = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({
		viewport: { width: 390, height: 1600 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true
	});
	await page.goto('http://localhost:5173/journal/quilt-builder', { waitUntil: 'networkidle' });
	await page.waitForSelector('[data-cell-index="0"]');

	// Tap-to-paint a few cells with touch, to confirm placement works on mobile.
	for (const i of [0, 1, 7]) {
		const b = await page.locator(`[data-cell-index="${i}"]`).boundingBox();
		await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
	}
	await page.screenshot({ path: `${DIR}mobile.png`, fullPage: true });
	const painted = await page.$$eval('[data-cell-index] polygon', (n) =>
		n.filter((p) => p.getAttribute('fill') === '#103c39').length
	);
	console.log('mobile taps painted cells:', painted);
	await browser.close();
};
run().catch((e) => (console.error(e), process.exit(1)));
