import { expect, test, type Page } from '@playwright/test';

import { planTrip, signUp } from './helpers';

const stops = (page: Page) =>
  page.getByRole('list', { name: 'Itinerary stops' }).getByRole('button', { name: /^Stop \d+:/ });

/** The stop names in list order. */
async function stopNames(page: Page): Promise<string[]> {
  const labels = await stops(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute('aria-label') ?? ''),
  );
  return labels.map((label) => /^Stop \d+: (.*)\. Show on map\.$/.exec(label)?.[1] ?? label);
}

test.describe('editing a trip', () => {
  test('moving a stop reorders the itinerary and is still there after a reload', async ({
    page,
  }) => {
    await signUp(page);
    await planTrip(page, ['art']);
    const before = await stopNames(page);
    expect(before).toHaveLength(3);

    await stops(page).first().click();
    await page.getByRole('button', { name: `Move ${before[0]} down` }).click();
    await expect(page.getByText('Stop moved')).toBeVisible();

    const expected = [before[1], before[0], before[2]];
    await expect.poll(() => stopNames(page)).toEqual(expected);

    await page.reload();
    await expect.poll(() => stopNames(page)).toEqual(expected);
  });

  test('removing a stop can be undone, and the last two stops are protected', async ({ page }) => {
    await signUp(page);
    await planTrip(page, ['art']);
    const before = await stopNames(page);

    await stops(page).nth(1).click();
    await page.getByRole('button', { name: `Remove ${before[1]}` }).click();
    await expect(page.getByText('Stop removed')).toBeVisible();
    await expect.poll(() => stopNames(page)).toEqual([before[0], before[2]]);

    // Two stops is the minimum, so nothing more can be removed.
    await stops(page).first().click();
    await expect(page.getByRole('button', { name: `Remove ${before[0]}` })).toBeDisabled();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(() => stopNames(page)).toEqual(before);
  });

  test('a place found through search can be added to the end of the day', async ({ page }) => {
    await signUp(page);
    await planTrip(page, ['art']);
    const before = await stopNames(page);

    await page.getByRole('button', { name: 'Add a stop' }).click();
    const panel = page.getByRole('region', { name: 'Add a stop' });
    const first = panel.getByRole('button', { name: /^Add / }).first();
    await expect(first).toBeVisible();
    const added = ((await first.getAttribute('aria-label')) ?? '').replace(/^Add /, '');
    await first.click();

    await expect(page.getByText('Stop added')).toBeVisible();
    await expect.poll(() => stopNames(page)).toEqual([...before, added]);
    await expect(panel).toHaveCount(0);
  });

  test('a shared link stays read-only', async ({ page, browser }) => {
    await signUp(page);
    await planTrip(page, ['art']);
    const tripId = page.url().split('/').pop();
    const response = await page.request.post(`/api/v1/trips/${tripId}/share`);
    const { shareToken } = (await response.json()) as { shareToken: string };

    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(`/s/${shareToken}`);
    await expect(visitorPage.getByRole('list', { name: 'Itinerary stops' })).toBeVisible();
    await expect(visitorPage.getByRole('button', { name: 'Add a stop' })).toHaveCount(0);
    await expect(visitorPage.getByRole('region', { name: /ask your guide/i })).toHaveCount(0);
    await visitor.close();
  });
});

test.describe('asking the guide', () => {
  test('a note is checked before it is sent', async ({ page }) => {
    await signUp(page);
    await planTrip(page, ['art']);

    await page.getByRole('button', { name: /ask your guide/i }).click();
    await page.getByRole('button', { name: 'Update my day' }).click();

    await expect(page.getByRole('alert').filter({ hasText: /tell your guide/i })).toBeVisible();
    await expect(page.getByLabel('What would you like to change?')).toBeFocused();
  });

  test('the guide revises the day and the trip comes back updated', async ({ page }) => {
    await signUp(page);
    await planTrip(page, ['art']);

    await page.getByRole('button', { name: /ask your guide/i }).click();
    await page.getByRole('button', { name: "It's raining" }).click();
    await page.getByRole('button', { name: 'Update my day' }).click();

    await expect(page.getByText('Your guide updated the trip')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('list', { name: 'Itinerary stops' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'From your guide' })).toBeVisible();
    await expect(stops(page)).toHaveCount(3);
  });
});
