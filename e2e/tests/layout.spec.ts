import { expect, test, type Page } from '@playwright/test';

import { planTrip, signUp } from './helpers';

// Real device sizes. "Desktop" means the two-column layouts kick in (Tailwind `lg`, 1024px+).
const DESKTOPS = [
  { name: 'laptop 1366x768', width: 1366, height: 768 },
  { name: 'small laptop 1280x720', width: 1280, height: 720 },
  { name: 'MacBook 1440x900', width: 1440, height: 900 },
  { name: 'desktop 1920x1080', width: 1920, height: 1080 },
];
const SMALL = [
  { name: 'iPad portrait 768x1024', width: 768, height: 1024 },
  { name: 'iPhone 390x844', width: 390, height: 844 },
  { name: 'small phone 360x640', width: 360, height: 640 },
];

const overflow = (page: Page) =>
  page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    vertical: document.documentElement.scrollHeight - window.innerHeight,
  }));

/** Let entrance animations finish so layout is measured in its final state. */
const settle = (page: Page) => page.waitForTimeout(1500);

for (const size of [...DESKTOPS, ...SMALL]) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    const desktop = size.width >= 1024;

    test('public pages never scroll sideways, and fit the screen on desktops', async ({ page }) => {
      await page.goto('/');
      await settle(page);
      const landing = await overflow(page);
      expect(landing.horizontal, 'landing sideways overflow').toBeLessThanOrEqual(0);
      if (desktop) expect(landing.vertical, 'landing fits the screen').toBeLessThanOrEqual(1);

      await page.goto('/auth');
      await settle(page);
      const auth = await overflow(page);
      expect(auth.horizontal, 'auth sideways overflow').toBeLessThanOrEqual(0);
      if (size.height >= 720) expect(auth.vertical, 'auth fits the screen').toBeLessThanOrEqual(1);
    });

    test('the planner and a planned trip fit, with no sideways scrolling', async ({ page }) => {
      await signUp(page);
      await settle(page);
      const plan = await overflow(page);
      expect(plan.horizontal, 'planner sideways overflow').toBeLessThanOrEqual(0);
      if (desktop) expect(plan.vertical, 'planner fits the screen').toBeLessThanOrEqual(1);

      await planTrip(page, ['art']);
      await expect(page.getByRole('list', { name: 'Itinerary stops' })).toBeVisible();
      await settle(page);
      const trip = await overflow(page);
      expect(trip.horizontal, 'trip sideways overflow').toBeLessThanOrEqual(0);
      if (desktop) expect(trip.vertical, 'trip fits the screen').toBeLessThanOrEqual(1);

      // The map must always be on screen and usable, never squashed or pushed off.
      const map = page.getByRole('region', { name: /map of the route/i });
      await expect(map).toBeVisible();
      const box = (await map.boundingBox())!;
      expect(box.width).toBeGreaterThan(size.width * (desktop ? 0.4 : 0.8));
      expect(box.height).toBeGreaterThanOrEqual(200);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
    });
  });
}

test('on phones the map stays pinned while the itinerary scrolls underneath', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUp(page);
  await planTrip(page, ['art']);
  await expect(page.getByRole('list', { name: 'Itinerary stops' })).toBeVisible();

  const map = page.getByRole('region', { name: /map of the route/i });
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(400);
  const box = (await map.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
});
