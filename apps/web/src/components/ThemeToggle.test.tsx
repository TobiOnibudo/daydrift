import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveTheme, THEME_KEY } from '../hooks/useTheme';

import { ThemeToggle } from './ThemeToggle';

const setSystemDark = (dark: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: dark && query.includes('dark'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
      }) as unknown as MediaQueryList,
  );

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.style.colorScheme = '';
});
afterEach(() => vi.unstubAllGlobals());

describe('resolveTheme', () => {
  it('follows the system only when no choice was made', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('ThemeToggle', () => {
  it('starts light and offers dark', () => {
    setSystemDark(false);
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('starts dark when the system is dark and nothing was chosen', () => {
    setSystemDark(true);
    render(<ThemeToggle />);
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('switches the page, the browser colour scheme, and remembers the choice', async () => {
    setSystemDark(false);
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('a saved choice beats the system setting', () => {
    setSystemDark(true);
    localStorage.setItem(THEME_KEY, 'light');
    render(<ThemeToggle />);
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
