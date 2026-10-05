import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { planTrip, signUp } from './helpers';

// WCAG 2.1 A/AA automated checks (docs/05 §7). Automated checks catch roughly a third of issues,
// so these complement, and do not replace, keyboard and screen-reader testing.
// Entrance animations fade content in; axe would otherwise measure half-transparent text.
const settle = (page: Page, ms: number) => page.waitForTimeout(ms);

// The landing hero drops its last pin in after about 2.5s, so it needs longer to settle.
async function expectNoViolations(page: Page, settleMs = 1200) {
  await settle(page, settleMs);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Third-party map tiles and controls are outside our control.
    .exclude('.leaflet-container')
    .analyze();

  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) e.g. ${v.nodes[0]?.target.join(' ')}`,
  );
  expect(summary, summary.join('\n')).toEqual([]);
}

test('public pages have no detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page, 3500);

  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expectNoViolations(page);
});

test('signed-in pages have no detectable accessibility violations', async ({ page }) => {
  await signUp(page);
  await expect(page.getByRole('heading', { name: 'Plan a trip' })).toBeVisible();
  await expectNoViolations(page);

  await planTrip(page, ['art']);
  await expect(page.getByRole('list', { name: 'Itinerary stops' })).toBeVisible();
  await expectNoViolations(page);

  await page.goto('/trips');
  await expect(page.getByRole('heading', { name: 'My trips' })).toBeVisible();
  await expectNoViolations(page);
});

test('the planner is fully usable from the keyboard', async ({ page }) => {
  await signUp(page);
  await page.getByRole('button', { name: 'art', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'art', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByLabel('A full day').focus();
  await page.keyboard.press('Space');
  await expect(page.getByLabel('A full day')).toBeChecked();

  await page.getByRole('button', { name: 'Plan my trip' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
});
