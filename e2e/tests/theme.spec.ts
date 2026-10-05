import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { planTrip, signUp } from './helpers';

const isDark = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

test.describe('dark mode', () => {
  test('follows the system setting until a choice is made', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    expect(await isDark(page)).toBe(true);

    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    expect(await isDark(page)).toBe(false);
  });

  test('a choice sticks across reloads and beats the system setting', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await signUp(page);

    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    expect(await isDark(page)).toBe(true);

    await page.reload();
    expect(await isDark(page)).toBe(true);
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();

    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await page.reload();
    expect(await isDark(page)).toBe(false);
  });

  test('is set by the page itself before any app code runs, so nothing flashes light', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    // With the app bundle blocked, only the inline script in index.html can have set the theme.
    await page.route('**/assets/*.js', (route) => route.abort());
    await page.goto('/');
    expect(await isDark(page)).toBe(true);
  });

  test('the trip page in dark mode has no accessibility violations', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await signUp(page);
    await planTrip(page, ['art']);
    await page.getByRole('button', { name: /ask your guide/i }).click();
    await page.getByRole('button', { name: 'Add a stop' }).click();
    await expect(page.getByRole('region', { name: 'Add a stop' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // Map tiles are third-party imagery; the app's own UI is what is checked.
      .exclude('.leaflet-container')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
