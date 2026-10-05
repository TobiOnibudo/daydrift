import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct-horse-battery';

export const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

/** Create an account through the UI and land on the planner. */
export async function signUp(page: Page, email = uniqueEmail()): Promise<string> {
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Name').fill('E2E Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  return email;
}

/** Plan the quickest trip (a couple of hours, on foot) and wait for the finished itinerary. */
export async function planTrip(page: Page, interests = ['art']): Promise<void> {
  await page.goto('/plan');
  for (const interest of interests) {
    await page.getByRole('button', { name: interest, exact: true }).click();
  }
  await page.getByLabel('A couple of hours').check({ force: true });
  await page.getByRole('button', { name: 'Plan my trip' }).click();
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}
