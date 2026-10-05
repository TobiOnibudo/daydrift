import { useRef, useState, type FocusEvent, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Field } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { useSession, useSignIn, useSignUp } from '../hooks/useAuth';
import { describeError } from '../lib/errors';
import {
  MAX_EMAIL,
  MAX_NAME,
  validateEmail,
  validateName,
  validatePassword,
} from '../lib/validation';

type Mode = 'signin' | 'signup';
type FieldName = 'name' | 'email' | 'password';
type Errors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = ['name', 'email', 'password'];

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  const { data: user } = useSession();
  const signIn = useSignIn();
  const signUp = useSignUp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/plan';
  const pending = signIn.isPending || signUp.isPending;

  if (user) return <Navigate to={from} replace />;

  const check = (field: FieldName, value: string): string | null => {
    if (field === 'name') return mode === 'signup' ? validateName(value) : null;
    if (field === 'email') return validateEmail(value);
    return validatePassword(value, mode);
  };

  const validateAll = (): Errors => {
    const found: Errors = {};
    for (const field of FIELD_ORDER) {
      const message = check(field, values[field]);
      if (message) found[field] = message;
    }
    return found;
  };

  const update = (field: FieldName, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    // Clear a field's error as soon as the person starts fixing it.
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    if (formError) setFormError(null);
  };

  // Don't validate when focus is moving to the submit button: showing a message now would shift
  // the layout between mousedown and mouseup and swallow the click. Submit validates everything.
  const validateOnBlur = (field: FieldName, event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget;
    if (next instanceof HTMLButtonElement && next.type === 'submit') return;
    const message = values[field] ? check(field, values[field]) : null;
    setErrors((e) => ({ ...e, [field]: message ?? undefined }));
  };

  const focusFirst = (found: Errors) => {
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) document.getElementById(first)?.focus();
    else formErrorRef.current?.focus();
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setErrors({});
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;

    const found = validateAll();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      focusFirst(found);
      return;
    }

    const handlers = {
      onSuccess: () => {
        toast.success(mode === 'signup' ? 'Welcome to Daydrift!' : 'Welcome back!');
        navigate(from, { replace: true });
      },
      onError: (error: unknown) => {
        const described = describeError(error);
        const fromServer = described.fieldErrors as Errors;
        setErrors(fromServer);
        setFormError(described.message);
        queueMicrotask(() => focusFirst(fromServer));
      },
    };

    const email = values.email.trim();
    if (mode === 'signup') {
      signUp.mutate({ name: values.name.trim(), email, password: values.password }, handlers);
    } else {
      signIn.mutate({ email, password: values.password }, handlers);
    }
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
            {formError && (
              <p
                ref={formErrorRef}
                tabIndex={-1}
                role="alert"
                className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
              >
                {formError}
              </p>
            )}

            {mode === 'signup' && (
              <Field id="name" label="Name" error={errors.name}>
                <Input
                  autoComplete="name"
                  maxLength={MAX_NAME + 20}
                  value={values.name}
                  onChange={(e) => update('name', e.target.value)}
                  onBlur={(e) => validateOnBlur('name', e)}
                />
              </Field>
            )}
            <Field id="email" label="Email" error={errors.email}>
              <Input
                type="email"
                autoComplete="email"
                maxLength={MAX_EMAIL + 20}
                value={values.email}
                onChange={(e) => update('email', e.target.value)}
                onBlur={(e) => validateOnBlur('email', e)}
              />
            </Field>
            <Field
              id="password"
              label="Password"
              error={errors.password}
              hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
            >
              <Input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={values.password}
                onChange={(e) => update('password', e.target.value)}
                onBlur={(e) => validateOnBlur('password', e)}
              />
            </Field>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-5 text-center text-sm">
            {mode === 'signin' ? 'New to Daydrift?' : 'Already have an account?'}{' '}
            <button
              type="button"
              className="text-primary font-medium underline-offset-4 hover:underline"
              onClick={switchMode}
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
