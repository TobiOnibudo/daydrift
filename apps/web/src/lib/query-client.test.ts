import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = { error: vi.fn() };
vi.mock('sonner', () => ({ toast }));

const { createQueryClient, SESSION_EXPIRED_TOAST } = await import('./query-client');
const { ApiError } = await import('./api');
const { SESSION_KEY } = await import('../hooks/useAuth');

const run = (client: ReturnType<typeof createQueryClient>, error: unknown) =>
  client
    .fetchQuery({ queryKey: ['trips'], queryFn: () => Promise.reject(error), retry: false })
    .catch(() => undefined);

beforeEach(() => vi.clearAllMocks());

describe('createQueryClient', () => {
  it('ends the session once, with one explanatory toast, when any request returns 401', async () => {
    const client = createQueryClient();
    client.setQueryData(SESSION_KEY, { id: 'u1' });

    await run(client, new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));
    await run(client, new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));

    expect(client.getQueryData(SESSION_KEY)).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/session has expired/i), {
      id: SESSION_EXPIRED_TOAST,
    });
  });

  it('leaves wrong-password 401s to the sign-in form', async () => {
    const client = createQueryClient();
    client.setQueryData(SESSION_KEY, { id: 'u1' });
    await run(client, new ApiError(401, 'x', 'INVALID_EMAIL_OR_PASSWORD'));
    expect(client.getQueryData(SESSION_KEY)).toEqual({ id: 'u1' });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('ignores other failures and visitors who were never signed in', async () => {
    const client = createQueryClient();
    client.setQueryData(SESSION_KEY, { id: 'u1' });
    await run(client, new ApiError(500, 'boom'));
    await run(client, new TypeError('Failed to fetch'));
    expect(client.getQueryData(SESSION_KEY)).toEqual({ id: 'u1' });

    const anonymous = createQueryClient();
    anonymous.setQueryData(SESSION_KEY, null);
    await run(anonymous, new ApiError(401, 'x', 'UNAUTHORIZED'));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('runs actions immediately even when offline, so they fail with a clear message instead of hanging', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.networkMode).toBe('always');
  });

  it('retries network and server errors but never client errors', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (
      n: number,
      e: unknown,
    ) => boolean;
    expect(retry(0, new ApiError(404, 'x'))).toBe(false);
    expect(retry(0, new ApiError(400, 'x'))).toBe(false);
    expect(retry(0, new ApiError(503, 'x'))).toBe(true);
    expect(retry(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(retry(2, new ApiError(503, 'x'))).toBe(false);
  });
});
