import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useSession, useSignIn, useSignUp } from '../hooks/useAuth';
import { ApiError } from '../lib/api';

type Mode = 'signin' | 'signup';

const MIN_PASSWORD = 8;

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'That email and password do not match.';
    if (error.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return error.message;
  }
  return 'We could not reach the server. Check your connection and try again.';
}

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: user } = useSession();
  const signIn = useSignIn();
  const signUp = useSignUp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/plan';
  const pending = signIn.isPending || signUp.isPending;

  if (user) return <Navigate to={from} replace />;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (password.length < MIN_PASSWORD) {
      setFormError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setFormError('Tell us what to call you.');
      return;
    }

    const done = {
      onSuccess: () => {
        toast.success(mode === 'signup' ? 'Welcome to Daydrift!' : 'Welcome back!');
        navigate(from, { replace: true });
      },
      onError: (error: unknown) => setFormError(describeError(error)),
    };

    if (mode === 'signup') signUp.mutate({ name: name.trim(), email, password }, done);
    else signIn.mutate({ email, password }, done);
  };

  return (
    <div className="container flex justify-center py-14">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin'
              ? 'Sign in to pick up your trips.'
              : 'Save your trips and share them with friends.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={MIN_PASSWORD}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {formError && (
              <p
                role="alert"
                className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
              >
                {formError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-5 text-center text-sm">
            {mode === 'signin' ? 'New to Daydrift?' : 'Already have an account?'}{' '}
            <button
              type="button"
              className="text-primary font-medium underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setFormError(null);
              }}
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
