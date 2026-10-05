import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockFetch, renderWithProviders } from '../test/utils';

import { ProtectedRoute } from './ProtectedRoute';

afterEach(() => vi.unstubAllGlobals());

function AuthProbe() {
  const { state } = useLocation();
  return <p>sign-in screen (from {(state as { from?: string } | null)?.from})</p>;
}

const app = (
  <Routes>
    <Route path="/auth" element={<AuthProbe />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/trips" element={<p>my trips</p>} />
    </Route>
  </Routes>
);

describe('ProtectedRoute', () => {
  it('shows a loading state while the session is checked', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => undefined)),
    );
    renderWithProviders(app, { route: '/trips' });
    expect(screen.getByRole('status', { name: /loading your account/i })).toBeInTheDocument();
  });

  it('sends signed-out visitors to sign in, remembering where they were going', async () => {
    mockFetch(null); // Better Auth answers 200 with a null body when signed out
    renderWithProviders(app, { route: '/trips' });
    expect(await screen.findByText('sign-in screen (from /trips)')).toBeInTheDocument();
  });

  it('renders the page for a signed-in user', async () => {
    mockFetch({ user: { id: 'u1', name: 'Tester', email: 't@example.com' } });
    renderWithProviders(app, { route: '/trips' });
    expect(await screen.findByText('my trips')).toBeInTheDocument();
  });
});
