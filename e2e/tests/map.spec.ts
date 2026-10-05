import { expect, test, type Page } from '@playwright/test';

import { planTrip, signUp } from './helpers';

const marker = (page: Page, order: number) =>
  page.locator('.leaflet-marker-icon', { hasText: new RegExp(`^${order}$`) });
const popupFor = (page: Page, order: number) =>
  page.locator('.leaflet-popup-content', { hasText: new RegExp('^' + order + '[.]') });
const stop = (page: Page, order: number) =>
  page.getByRole('button', { name: new RegExp(`^Stop ${order}:`) });

test.describe('itinerary and map are linked', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
    await planTrip(page, ['art']);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(3);
  });

  test('choosing a stop in the list highlights its marker and opens its popup', async ({
    page,
  }) => {
    await stop(page, 2).click();

    await expect(stop(page, 2)).toHaveAttribute('aria-pressed', 'true');
    await expect(marker(page, 2).locator('span.is-active')).toBeVisible();
    await expect(popupFor(page, 2)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show full route' })).toBeVisible();

    // Only one stop is selected at a time.
    await stop(page, 3).click();
    await expect(stop(page, 2)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.daydrift-marker span.is-active')).toHaveCount(1);
    await expect(marker(page, 3).locator('span.is-active')).toBeVisible();
    await expect(popupFor(page, 3)).toBeVisible();
  });

  test('clicking a marker on the map selects the matching stop in the list', async ({ page }) => {
    await marker(page, 3).click();

    await expect(stop(page, 3)).toHaveAttribute('aria-pressed', 'true');
    await expect(stop(page, 1)).toHaveAttribute('aria-pressed', 'false');
    await expect(popupFor(page, 3)).toBeVisible();
  });

  test('hovering a stop highlights its marker, and vice versa', async ({ page }) => {
    await stop(page, 1).hover();
    await expect(marker(page, 1).locator('span.is-hover')).toBeVisible();
    await page.mouse.move(5, 5);
    await expect(page.locator('.daydrift-marker span.is-hover')).toHaveCount(0);

    await marker(page, 2).hover();
    await expect(stop(page, 2)).toHaveClass(/bg-accent/);
  });

  test('"Show full route" and pressing the stop again both clear the selection', async ({
    page,
  }) => {
    await stop(page, 1).click();
    await page.getByRole('button', { name: 'Show full route' }).click();
    await expect(page.locator('.daydrift-marker span.is-active')).toHaveCount(0);
    await expect(stop(page, 1)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Show full route' })).toHaveCount(0);

    await stop(page, 1).click();
    await stop(page, 1).click();
    await expect(stop(page, 1)).toHaveAttribute('aria-pressed', 'false');
  });

  test('the whole interaction works from the keyboard', async ({ page }) => {
    await stop(page, 2).focus();
    await expect(marker(page, 2).locator('span.is-hover')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(marker(page, 2).locator('span.is-active')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(stop(page, 3)).toBeFocused();
  });
});
