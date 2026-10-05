import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
  test('shows a sample day that reshapes when you say what changed', async ({ page }) => {
    await page.goto('/');
    const stops = page.getByRole('list', { name: /sample itinerary/i }).getByRole('listitem');
    await expect(stops).toHaveCount(4);
    await expect(stops.nth(1)).toContainText('Trinity Bellwoods Park');

    await page.getByRole('button', { name: "It's raining" }).click();
    await expect(stops.nth(1)).toContainText('Royal Ontario Museum');
    await expect(page.getByText(/rain changes the plan/i)).toBeVisible();

    await page.getByRole('button', { name: 'Running late' }).click();
    await expect(stops).toHaveCount(3);
    await expect(stops.first()).toContainText('10:45');
  });

  test('the main call to action leads to sign-in for a visitor', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Get started' }).click();
    await expect(page).toHaveURL(/\/auth$/);
  });
});
