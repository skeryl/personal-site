import { expect, test } from '@playwright/test';

test.describe('card hover states', () => {
	test('hovered card is fully opaque and siblings are dimmed', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.card-grid')).toBeVisible();

		const cards = page.locator('.card-grid .card');
		const cardCount = await cards.count();
		expect(cardCount).toBeGreaterThan(1);

		const firstCard = cards.first();
		const secondCard = cards.nth(1);

		// Hover over the first card
		await firstCard.hover();

		// The hovered card should have the is-active class
		await expect(firstCard).toHaveClass(/is-active/);

		// The hovered card should be fully opaque (opacity 1)
		const activeOpacity = await firstCard.evaluate((el) => window.getComputedStyle(el).opacity);
		expect(Number(activeOpacity)).toBe(1);

		// Sibling cards should have the is-dimmed class and be semitransparent
		await expect(secondCard).toHaveClass(/is-dimmed/);
		const dimmedOpacity = await secondCard.evaluate((el) => window.getComputedStyle(el).opacity);
		expect(Number(dimmedOpacity)).toBeLessThan(1);
	});

	test('hover state clears when mouse leaves the grid', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('.card-grid')).toBeVisible();

		const cards = page.locator('.card-grid .card');
		const firstCard = cards.first();
		const secondCard = cards.nth(1);

		// Hover a card then move away from the grid
		await firstCard.hover();
		await expect(firstCard).toHaveClass(/is-active/);

		// Move mouse outside the card grid
		await page.mouse.move(0, 0);

		// All cards should return to normal (no is-active or is-dimmed)
		await expect(firstCard).not.toHaveClass(/is-active/);
		await expect(secondCard).not.toHaveClass(/is-dimmed/);
	});
});
