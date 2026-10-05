import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

export const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

export function wrapper(client = makeQueryClient(), route = '/') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: { client?: QueryClient; route?: string } = {},
) {
  const client = options.client ?? makeQueryClient();
  return { client, ...render(ui, { wrapper: wrapper(client, options.route) }) };
}

/** Resolve `fetch` with a JSON body (or a bare status). Returns the mock for assertions. */
export function mockFetch(body: unknown, init: { status?: number } = {}) {
  const status = init.status ?? 200;
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}
