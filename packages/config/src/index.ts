/**
 * @daydrift/config — the single source of truth (SSOT) for environment.
 *
 * Every environment variable is parsed and validated here exactly ONCE, using
 * a Zod schema, and exported as a typed, frozen `config` object. No other app
 * or package reads `process.env` directly. See docs/08-config-env.md.
 *
 * Fail-fast: invalid/missing required values throw at startup, not at the
 * first request that needs them. In production the required set is stricter.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { z } from 'zod';

/**
 * Load the workspace-root .env (dev convenience). Walks up from cwd to the directory holding
 * pnpm-workspace.yaml; never overrides variables already set, so real environments win.
 */
function loadWorkspaceEnv(): void {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      const file = join(dir, '.env');
      if (existsSync(file)) process.loadEnvFile?.(file);
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

loadWorkspaceEnv();

/**
 * Built-in embedding-model → vector-dimension map. This is the dimension SSOT
 * consumed by packages/db for the `places.embedding` column. See docs/08 and
 * docs/02-data-model.md.
 */
const MODEL_DIMS: Record<string, { dim: number; shortenable: boolean }> = {
  'nomic-embed-text': { dim: 768, shortenable: false },
  // OpenAI's text-embedding-3 models accept a smaller `dimensions`, so one schema can serve
  // both a local 768-dim dev model and the hosted model.
  'text-embedding-3-small': { dim: 1536, shortenable: true },
  'text-embedding-3-large': { dim: 3072, shortenable: true },
};

const providerEnum = z.enum(['ollama', 'openai']);

/** Raw env schema — mirrors .env.example / docs/08 variable names. */
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  AUTH_SECRET: z.string().min(1).optional(), // REQUIRED — no default (v1 problem #5)
  BASE_URL: z.string().default('http://localhost:3000'),
  WEB_URL: z.string().default('http://localhost:5173'),

  // Generic OpenAI-compatible providers use passthrough beyond the known enum.
  LLM_PROVIDER: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),

  OPENAI_API_KEY: z.string().optional(),

  EMBEDDING_PROVIDER: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),
  EMBEDDING_DIM: z.coerce.number().int().positive().optional(),
  EMBEDDING_BASE_URL: z.string().optional(),
  EMBEDDING_API_KEY: z.string().optional(),

  OLLAMA_BASE_URL: z.string().optional(),

  NOMINATIM_BASE_URL: z.string().default('https://nominatim.openstreetmap.org'),
  OVERPASS_BASE_URL: z.string().default('https://overpass-api.de/api/interpreter'),
  OSRM_BASE_URL: z.string().default('https://routing.openstreetmap.de'),

  VITE_API_URL: z.string().optional(),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
});

// A blank value (`EMBEDDING_DIM=` in a .env file) means "unset", not an empty string or zero.
const definedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== ''),
);

const env = envSchema.parse(definedEnv);

const isProd = env.NODE_ENV === 'production';

function fail(message: string): never {
  throw new Error(`[@daydrift/config] ${message}`);
}

// --- Fail-fast required-in-production checks (docs/08 "Fail-fast variables"). ---
if (isProd) {
  if (!env.DATABASE_URL) fail('DATABASE_URL is required in production.');
  if (!env.REDIS_URL) fail('REDIS_URL is required in production.');
  if (!env.AUTH_SECRET) fail('AUTH_SECRET is required in production.');
  if (!env.LLM_PROVIDER) fail('LLM_PROVIDER is required in production.');
  if (!env.EMBEDDING_MODEL) fail('EMBEDDING_MODEL is required in production.');
  if (!env.VITE_API_URL) fail('VITE_API_URL is required in production.');
  const usesOpenAI = env.LLM_PROVIDER === 'openai' || env.EMBEDDING_PROVIDER === 'openai';
  if (usesOpenAI && !env.OPENAI_API_KEY) {
    fail('OPENAI_API_KEY is required in production when provider is openai.');
  }
}

// AUTH_SECRET has no insecure default anywhere — require it always.
if (!env.AUTH_SECRET) fail('AUTH_SECRET is required (no fallback — see docs/08).');

// Dev-only connection fallbacks. Production already failed above if these are
// unset, so these localhost defaults only ever apply in dev/test — giving
// consumers a guaranteed string without weakening the prod fail-fast.
const databaseUrl = env.DATABASE_URL ?? 'postgresql://daydrift:daydrift@localhost:5432/daydrift';
const redisUrl = env.REDIS_URL ?? 'redis://localhost:6379';

// --- EMBEDDING_DIM resolution (docs/08 "Embedding model → dimension mapping"). ---
function resolveEmbeddingDim(): number {
  const model = env.EMBEDDING_MODEL;
  if (!model) fail('EMBEDDING_MODEL is required to resolve the embedding dimension.');
  const known = MODEL_DIMS[model];
  if (known !== undefined) {
    const requested = env.EMBEDDING_DIM;
    if (requested === undefined) return known.dim;
    const valid = known.shortenable ? requested <= known.dim : requested === known.dim;
    if (!valid) {
      fail(
        `EMBEDDING_DIM (${requested}) is not valid for model "${model}" ` +
          (known.shortenable ? `(at most ${known.dim}).` : `(must be ${known.dim}).`),
      );
    }
    return requested;
  }
  if (env.EMBEDDING_DIM === undefined) {
    fail(`EMBEDDING_DIM is required for unknown embedding model "${model}".`);
  }
  return env.EMBEDDING_DIM;
}

/** Derived vector dimension — the SSOT for the `places.embedding` column. */
export const EMBEDDING_DIM: number = resolveEmbeddingDim();

/** The typed, frozen config object. Import this everywhere instead of process.env. */
export const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  webUrl: env.WEB_URL,
  database: {
    url: databaseUrl,
  },
  redis: {
    url: redisUrl,
  },
  auth: {
    secret: env.AUTH_SECRET,
    baseUrl: env.BASE_URL,
  },
  llm: {
    provider: providerEnum.safeParse(env.LLM_PROVIDER).success
      ? (env.LLM_PROVIDER as z.infer<typeof providerEnum>)
      : env.LLM_PROVIDER,
    model: env.LLM_MODEL,
    baseUrl: env.LLM_BASE_URL,
    apiKey: env.LLM_API_KEY,
    timeoutMs: env.LLM_TIMEOUT_MS,
  },
  openaiApiKey: env.OPENAI_API_KEY,
  embedding: {
    provider: env.EMBEDDING_PROVIDER,
    model: env.EMBEDDING_MODEL,
    dim: EMBEDDING_DIM,
    baseUrl: env.EMBEDDING_BASE_URL,
    apiKey: env.EMBEDDING_API_KEY,
  },
  ollamaBaseUrl: env.OLLAMA_BASE_URL,
  external: {
    nominatimBaseUrl: env.NOMINATIM_BASE_URL,
    overpassBaseUrl: env.OVERPASS_BASE_URL,
    osrmBaseUrl: env.OSRM_BASE_URL,
  },
} as const);

/** Inferred shape of the validated config object. */
export type Config = typeof config;
