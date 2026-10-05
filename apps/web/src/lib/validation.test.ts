import { describe, expect, it } from 'vitest';

import {
  MAX_INTERESTS,
  validateEmail,
  validateInterest,
  validateName,
  validatePassword,
} from './validation';

describe('validateEmail', () => {
  it.each(['you@example.com', ' you@example.com ', 'first.last+tag@sub.example.co'])(
    'accepts %j',
    (v) => {
      expect(validateEmail(v)).toBeNull();
    },
  );

  it.each([
    '',
    '   ',
    'plain',
    'no@tld',
    '@example.com',
    'a b@example.com',
    `${'a'.repeat(250)}@example.com`,
  ])('rejects %j', (v) => {
    expect(validateEmail(v)).not.toBeNull();
  });

  it('asks for the email when empty and for a valid one when malformed', () => {
    expect(validateEmail('')).toMatch(/enter your email/i);
    expect(validateEmail('nope')).toMatch(/valid email/i);
  });
});

describe('validatePassword', () => {
  it('only requires a value when signing in, so existing short passwords still work', () => {
    expect(validatePassword('', 'signin')).not.toBeNull();
    expect(validatePassword('abc', 'signin')).toBeNull();
  });

  it('enforces length limits when signing up', () => {
    expect(validatePassword('short', 'signup')).toMatch(/at least 8/);
    expect(validatePassword('x'.repeat(129), 'signup')).toMatch(/at most 128/);
    expect(validatePassword('long-enough-1', 'signup')).toBeNull();
  });
});

describe('validateName', () => {
  it('requires a non-blank name of sensible length', () => {
    expect(validateName('   ')).not.toBeNull();
    expect(validateName('x'.repeat(81))).not.toBeNull();
    expect(validateName('Ada Lovelace')).toBeNull();
  });
});

describe('validateInterest', () => {
  it('accepts ordinary words, phrases, and international text', () => {
    for (const ok of ['street art', 'Hole-in-the-wall', 'café', 'parcs & jardins', '寿司']) {
      expect(validateInterest(ok, [])).toBeNull();
    }
  });

  it('explains why each bad input is rejected', () => {
    expect(validateInterest('   ', [])).toMatch(/type an interest/i);
    expect(validateInterest('x'.repeat(51), [])).toMatch(/under 50/);
    expect(validateInterest('<script>', [])).toMatch(/letters, numbers/i);
    expect(validateInterest('-leading', [])).toMatch(/letters, numbers/i);
  });

  it('rejects duplicates case-insensitively and enforces the maximum', () => {
    expect(validateInterest('Art', ['art'])).toMatch(/already on your list/);
    const full = Array.from({ length: MAX_INTERESTS }, (_, i) => `i${i}`);
    expect(validateInterest('one more', full)).toMatch(/up to 10/);
  });
});
