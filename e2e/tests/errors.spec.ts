import { expect, test, type Page } from '@playwright/test';

import { PASSWORD, signUp, uniqueEmail } from './helpers';

const startPlan = async (page: Page) => {
  await page.goto('/plan');
  await page.getByRole('button', { name: 'art', exact: true }).click();
  await page.getByRole('button', { name: 'Plan my trip' }).click();
};

test.describe('form validation', () => {
  test('sign-in explains each problem next to its field and makes no request', async ({ page }) => {
    const authRequests: string[] = [];
    page.on('request', (r) => r.url().includes('/auth/sign-') && authRequests.push(r.url()));

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter your email address.')).toBeVisible();
    await expect(page.getByText('Enter your password.')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeFocused();

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('x');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/valid email address/i)).toBeVisible();
    expect(authRequests).toEqual([]);
  });

  test('a field error clears as soon as the person fixes it', async ({ page }) => {
    await page.goto('/auth');
    await page.getByLabel('Email').fill('nope');
    await page.getByLabel('Email').blur();
    await expect(page.getByText(/valid email address/i)).toBeVisible();

    await page.getByLabel('Email').fill('nope@example.com');
    await expect(page.getByText(/valid email address/i)).toHaveCount(0);
  });

  test('creating an account with an email that exists points at the email and offers sign-in', async ({
    page,
    browser,
  }) => {
    const email = await signUp(page);
    const other = await browser.newContext();
    const otherPage = await other.newPage();

    await otherPage.goto('/auth');
    await otherPage.getByRole('button', { name: 'Create an account' }).click();
    await otherPage.getByLabel('Name').fill('Copycat');
    await otherPage.getByLabel('Email').fill(email);
    await otherPage.getByLabel('Password').fill(PASSWORD);
    await otherPage.getByRole('button', { name: 'Create account' }).click();

    await expect(otherPage.getByRole('alert')).toContainText(/already exists.*try signing in/i);
    await expect(otherPage.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(otherPage.getByLabel('Email')).toBeFocused();
    await other.close();
  });

  test('custom interests are checked with specific messages', async ({ page }) => {
    await signUp(page);
    const input = page.getByLabel('Add your own interest');

    await input.fill('<script>');
    await input.press('Enter');
    await expect(page.getByText(/letters, numbers, and simple punctuation/i)).toBeVisible();

    await input.fill('street art');
    await input.press('Enter');
    await expect(page.getByRole('button', { name: 'street art' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await input.fill('Street Art');
    await input.press('Enter');
    await expect(page.getByText(/"street art" is already on your list/)).toBeVisible();
    await expect(page.getByText('1 of 10 chosen')).toBeVisible();
  });
});

test.describe('when things go wrong', () => {
  test('server validation errors appear on the planner, next to the field', async ({ page }) => {
    await signUp(page);
    await page.route('**/api/v1/trips', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request',
                details: { fieldErrors: { city: ['String must contain at least 1 character(s)'] } },
              },
            }),
          })
        : route.continue(),
    );

    await startPlan(page);
    await expect(page.getByRole('alert')).toContainText('Please fix the highlighted fields');
    await expect(page.getByText('Choose a city.')).toBeVisible();
    await expect(page.getByLabel('Where are you headed?')).toHaveAttribute('aria-invalid', 'true');
  });

  for (const [status, message] of [
    [429, /wait a minute/i],
    [503, /temporarily unavailable/i],
    [500, /our side/i],
  ] as const) {
    test(`a ${status} while creating a trip gets a plain-language message`, async ({ page }) => {
      await signUp(page);
      await page.route('**/api/v1/trips', (route) =>
        route.request().method() === 'POST'
          ? route.fulfill({
              status,
              contentType: 'application/json',
              body: JSON.stringify({
                error: { code: 'INTERNAL', message: 'db exploded at 10.0.0.5' },
              }),
            })
          : route.continue(),
      );

      await startPlan(page);
      const alert = page.getByRole('alert');
      await expect(alert).toContainText(message);
      await expect(alert).not.toContainText('10.0.0.5');
      await expect(page.getByRole('button', { name: 'Plan my trip' })).toBeEnabled();
    });
  }

  test('an expired session sends you to sign in, explains why, and brings you back', async ({
    page,
    context,
  }) => {
    const email = await signUp(page);
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: 'Plan a trip' })).toBeVisible();

    // The session disappears server-side or by expiry while the page is open.
    await context.clearCookies();
    await page.getByRole('button', { name: 'art', exact: true }).click();
    await page.getByRole('button', { name: 'Plan my trip' }).click();

    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByText(/session has expired/i)).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/plan$/);
  });

  test('going offline shows a banner and a clear message instead of a mystery failure', async ({
    page,
    context,
  }) => {
    await signUp(page);
    await page.goto('/plan');
    await expect(page.getByRole('heading', { name: 'Plan a trip' })).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByRole('status').filter({ hasText: /you're offline/i })).toBeVisible();

    await page.getByRole('button', { name: 'Plan my trip' }).click();
    await expect(page.getByRole('alert')).toContainText(/check your connection/i);

    await context.setOffline(false);
    await expect(page.getByText(/you're offline/i)).toHaveCount(0);
  });

  test('a malformed or unknown trip link says the trip cannot be found', async ({ page }) => {
    await signUp(page);
    await page.goto('/trips/not-a-real-id');
    await expect(page.getByRole('alert')).toContainText("can't find that trip");

    await page.goto('/trips/7d4b8a3e-7c43-4f6f-9d1b-1f2b7a9c0e11');
    await expect(page.getByRole('alert')).toContainText("can't find that trip");
  });

  test('a mangled share link says it is not available', async ({ page }) => {
    await page.goto('/s/x');
    await expect(page.getByRole('alert')).toContainText("This link isn't available");
  });

  test('a failed stream shows a retry that works', async ({ page }) => {
    await signUp(page);
    let blocked = true;
    await page.route('**/api/v1/trips/*/stream', (route) =>
      blocked ? route.fulfill({ status: 500, body: 'nope' }) : route.continue(),
    );
    // Make the trip look unfinished so the page opens the stream.
    await page.route(/\/api\/v1\/trips\/[0-9a-f-]{36}$/, async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { trip: { status: string } };
      await route.fulfill({
        response,
        json: { trip: { ...body.trip, status: blocked ? 'processing' : body.trip.status } },
      });
    });

    await startPlan(page);
    await expect(page.getByRole('alert')).toContainText(/lost the connection/i);

    // Only the page is faked. If the plan was not already cached, the real trip is still being
    // generated, and asking to regenerate it now would (correctly) be refused as a conflict.
    const tripId = page.url().split('/').pop();
    await expect
      .poll(
        async () =>
          (
            (await (await page.request.get(`/api/v1/trips/${tripId}`)).json()) as {
              trip: { status: string };
            }
          ).trip.status,
        { timeout: 30_000 },
      )
      .toBe('complete');

    blocked = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('list', { name: 'Itinerary stops' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('visitors who are not signed in are never shown other people’s data', async ({ page }) => {
    const email = uniqueEmail();
    expect(email).toContain('@');
    await page.goto('/trips');
    await expect(page).toHaveURL(/\/auth$/);
    expect((await page.request.get('/api/v1/trips')).status()).toBe(401);
  });
});
