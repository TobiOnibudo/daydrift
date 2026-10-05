import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../test/utils';

import { AuthPage } from './AuthPage';

afterEach(() => vi.unstubAllGlobals());

/** Route fetch by URL: the session check answers "signed out" and auth calls use `authResponse`. */
function stubApi(authResponse?: { status: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: string) => {
    if (String(url).includes('get-session'))
      return { ok: true, status: 200, json: async () => null };
    const { status, body } = authResponse ?? { status: 200, body: {} };
    return { ok: status < 400, status, json: async () => body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const authCalls = (fetchMock: ReturnType<typeof stubApi>) =>
  fetchMock.mock.calls.filter(([url]) => !String(url).includes('get-session'));

const setup = async () => {
  const user = userEvent.setup();
  renderWithProviders(<AuthPage />);
  await screen.findByRole('button', { name: 'Sign in' });
  return user;
};

describe('AuthPage validation', () => {
  it('blocks an empty submit, explains each field, and focuses the first problem', async () => {
    const fetchMock = stubApi();
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(authCalls(fetchMock)).toHaveLength(0);
  });

  it('ties each message to its field for assistive tech', async () => {
    stubApi();
    const user = await setup();
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.tab();

    const email = screen.getByLabelText('Email');
    const message = screen.getByText(/valid email address/i);
    expect(email).toHaveAttribute('aria-describedby', message.id);
  });

  it('clears a field error as soon as the person starts correcting it', async () => {
    stubApi();
    const user = await setup();
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.tab();
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'x');
    expect(screen.queryByText(/valid email address/i)).not.toBeInTheDocument();
  });

  it('applies the password length rule to sign-up but not to sign-in', async () => {
    const fetchMock = stubApi();
    const user = await setup();
    await user.type(screen.getByLabelText('Email'), 'a@b.co');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(authCalls(fetchMock)).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      screen.getByText('Use at least 8 characters.', { selector: 'p#password-error' }),
    ).toBeInTheDocument();
    expect(authCalls(fetchMock)).toHaveLength(1);
  });
});

describe('AuthPage server errors', () => {
  const fill = async (user: Awaited<ReturnType<typeof setup>>, email = 'a@b.co') => {
    await user.type(screen.getByLabelText('Email'), email);
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
  };

  it('shows a wrong password as a form-level alert without blaming a field', async () => {
    stubApi({
      status: 401,
      body: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
    });
    const user = await setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password do not match.',
    );
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('points a duplicate sign-up at the email field and suggests signing in', async () => {
    stubApi({
      status: 422,
      body: { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'User already exists.' },
    });
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/try signing in/i);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('reports an unreachable server plainly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('get-session'))
          return { ok: true, status: 200, json: async () => null };
        throw new TypeError('Failed to fetch');
      }),
    );
    const user = await setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach daydrift/i);
  });

  it('switching between sign in and sign up clears stale errors', async () => {
    stubApi();
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.queryByText('Enter your email address.')).not.toBeInTheDocument();
  });
});

describe('AuthPage blur validation', () => {
  it('does not validate on blur when focus moves to the submit button, so the click is not lost', async () => {
    const fetchMock = stubApi();
    const user = await setup();
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');

    // Pressing the button moves focus (and blurs the password field) before the click lands.
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    // The submit itself validated and focused the problem field.
    expect(screen.getByLabelText('Password')).toHaveFocus();
    expect(authCalls(fetchMock)).toHaveLength(0);
  });
});
