import { config } from '@daydrift/config';
import { db } from '@daydrift/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

// Better Auth configuration for Daydrift. Mounted at `/api/v1/auth/*` by the
// API (docs/04-api.md §3). Cookie-first sessions with a dev bearer fallback;
// `AUTH_SECRET` is required at boot (no insecure default — docs/08).

// `@daydrift/config` guarantees `auth.secret` + `auth.baseUrl`; OAuth client
// credentials are optional extras read through a loose view.
type OAuthCreds = { clientId?: string; clientSecret?: string };
const oauth = config.auth as unknown as { google?: OAuthCreds; github?: OAuthCreds };

// Providers are enabled only when their client id is present.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (oauth.google?.clientId && oauth.google.clientSecret) {
  socialProviders.google = {
    clientId: oauth.google.clientId,
    clientSecret: oauth.google.clientSecret,
  };
}
if (oauth.github?.clientId && oauth.github.clientSecret) {
  socialProviders.github = {
    clientId: oauth.github.clientId,
    clientSecret: oauth.github.clientSecret,
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: config.auth.secret,
  baseURL: config.auth.baseUrl,
  basePath: '/api/v1/auth',
  trustedOrigins: [config.webUrl],
  emailAndPassword: { enabled: true },
  socialProviders,
});

export { fromNodeHeaders } from 'better-auth/node';
