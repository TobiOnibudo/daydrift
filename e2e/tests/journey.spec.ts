import { expect, test } from '@playwright/test';

import { PASSWORD, planTrip, signUp, uniqueEmail } from './helpers';

test.describe('authentication', () => {
  test('signed-out visitors are sent to sign in and returned afterwards', async ({ page }) => {
    await page.goto('/trips');
    await expect(page).toHaveURL(/\/auth$/);

    const email = uniqueEmail();
    await page.getByRole('button', { name: 'Create an account' }).click();
    await page.getByLabel('Name').fill('Returner');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/trips$/);
    await expect(page.getByRole('heading', { name: 'My trips' })).toBeVisible();
  });

  test('a wrong password shows a clear error', async ({ page }) => {
    const email = await signUp(page);
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/auth');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('definitely-not-it');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('do not match');
  });

  test('signing out ends the session for API calls and protected pages', async ({ page }) => {
    await signUp(page);
    expect((await page.request.get('/api/v1/trips')).status()).toBe(200);

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL('/');

    expect((await page.request.get('/api/v1/trips')).status()).toBe(401);
    await page.goto('/trips');
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('a too-short password is rejected on sign-up before any request is made', async ({
    page,
  }) => {
    const authRequests: string[] = [];
    page.on('request', (r) => r.url().includes('/auth/sign-') && authRequests.push(r.url()));

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Create an account' }).click();
    await page.getByLabel('Name').fill('Shorty');
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
      page.getByText('Use at least 8 characters.', { exact: false }).first(),
    ).toBeVisible();
    await expect(page.getByLabel('Password')).toBeFocused();
    expect(authRequests).toEqual([]);
  });
});

test.describe('planning a trip', () => {
  test('streams generation, then shows the itinerary, map and route facts', async ({ page }) => {
    await signUp(page);
    await planTrip(page, ['art', 'coffee']);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('A mock day in toronto');
    await expect(
      page.getByRole('list', { name: 'Itinerary stops' }).getByRole('listitem'),
    ).toHaveCount(3);
    await expect(
      page.getByRole('region', { name: /map of the route with 3 stops/i }),
    ).toBeVisible();
    await expect(page.getByText(/km \(straight line\)/)).toBeVisible();
  });

  test('the same request a second time is served instantly from the cache', async ({ page }) => {
    await signUp(page);
    await planTrip(page, ['art']);
    await expect(page.getByRole('list', { name: 'Itinerary stops' })).toBeVisible();

    await planTrip(page, ['art']);
    // No generation stepper: the finished trip renders straight away.
    await expect(page.getByRole('list', { name: 'Itinerary stops' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('list', { name: /planning progress/i })).toHaveCount(0);
  });
});

test.describe('sharing and history', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('a shared link works without an account and stops working when sharing is turned off', async ({
    page,
    browser,
  }) => {
    await signUp(page);
    await planTrip(page, ['art']);

    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.getByText(/link copied/i)).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(/\/s\/[A-Za-z0-9_-]{16,}$/);

    // A brand-new, signed-out browser context can read it.
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(new URL(link).pathname);
    await expect(visitorPage.getByRole('heading', { level: 1 })).toContainText(
      'A mock day in toronto',
    );
    await expect(visitorPage.getByRole('link', { name: 'Plan your own trip' })).toBeVisible();

    await page.getByRole('button', { name: 'Stop sharing' }).click();
    await expect(page.getByText('Sharing turned off')).toBeVisible();

    await visitorPage.reload();
    await expect(visitorPage.getByRole('alert')).toContainText("This link isn't available");
    await visitor.close();
  });

  test('trips are listed and can be deleted', async ({ page }) => {
    await signUp(page);
    await planTrip(page, ['art']);

    await page.goto('/trips');
    await expect(page.getByRole('link', { name: /A mock day in toronto/ })).toBeVisible();

    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: /^Delete A mock day/ }).click();
    await expect(page.getByText('Trip deleted')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No trips yet' })).toBeVisible();
  });

  test("one user cannot open another user's trip", async ({ page, browser }) => {
    await signUp(page);
    await planTrip(page, ['art']);
    const tripUrl = page.url();

    const stranger = await browser.newContext();
    const strangerPage = await stranger.newPage();
    await signUp(strangerPage);
    await strangerPage.goto(new URL(tripUrl).pathname);
    await expect(strangerPage.getByRole('alert')).toContainText("can't find that trip");
    await stranger.close();
  });
});

test('unknown pages show a friendly 404', async ({ page }) => {
  await page.goto('/this/does/not/exist');
  await expect(page.getByRole('heading', { name: /drifted off the map/i })).toBeVisible();
});
