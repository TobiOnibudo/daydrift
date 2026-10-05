// Client-side validation. It mirrors the server rules so people get instant, specific feedback;
// the server remains the authority and its errors are mapped back to fields (see errors.ts).

export const MAX_EMAIL = 254;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;
export const MAX_NAME = 80;
export const MAX_INTEREST_LENGTH = 50;
export const MAX_INTERESTS = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INTEREST_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s&'’.,-]*$/u;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email))
    return 'Enter a valid email address, like you@example.com.';
  return null;
}

/** Sign-in only needs a password; sign-up enforces the length rules. */
export function validatePassword(value: string, mode: 'signin' | 'signup'): string | null {
  if (!value) return 'Enter your password.';
  if (mode === 'signup') {
    if (value.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
    if (value.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
  }
  return null;
}

export function validateName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Tell us what to call you.';
  if (name.length > MAX_NAME) return `Keep your name under ${MAX_NAME} characters.`;
  return null;
}

/** Returns an error for a custom interest, or null when it is fine to add. */
export function validateInterest(value: string, existing: string[]): string | null {
  const interest = value.trim().toLowerCase();
  if (!interest) return 'Type an interest to add it.';
  if (interest.length > MAX_INTEREST_LENGTH)
    return `Keep it under ${MAX_INTEREST_LENGTH} characters.`;
  if (!INTEREST_PATTERN.test(interest)) return 'Use letters, numbers, and simple punctuation only.';
  if (existing.includes(interest)) return `"${interest}" is already on your list.`;
  if (existing.length >= MAX_INTERESTS) return `You can add up to ${MAX_INTERESTS} interests.`;
  return null;
}
