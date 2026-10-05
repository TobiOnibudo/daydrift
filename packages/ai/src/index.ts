import { config } from '@daydrift/config';
import {
  embed as aiEmbed,
  generateObject as aiGenerateObject,
  streamText as aiStreamText,
} from 'ai';
import type { z } from 'zod';

import { getEmbeddingModel, getLanguageModel } from './provider.js';

// Thin wrappers over the Vercel AI SDK so the rest of the codebase never
// touches a provider SDK directly. Used by the RAG pipeline in
// `packages/core`. See docs/03-rag-pipeline.md (embed query → generate → stream).

/** Bound every generation call: a hung local model must fail fast so the caller can fall back. */
const EMBED_TIMEOUT_MS = 30_000;
const llmLimits = () => ({
  abortSignal: AbortSignal.timeout(config.llm.timeoutMs),
  maxRetries: 1,
});

export { getEmbeddingModel, getLanguageModel } from './provider.js';

/** Embed a single string with the configured embedding model. */
export async function embed(text: string): Promise<number[]> {
  const { embedding } = await aiEmbed({
    model: getEmbeddingModel(),
    value: text,
    abortSignal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
  });
  return embedding;
}

export interface GenerateObjectOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
}

/** Generate a Zod-validated structured object (e.g. the itinerary plan). */
export async function generateObject<T>(opts: GenerateObjectOptions<T>) {
  return aiGenerateObject({
    model: getLanguageModel(),
    schema: opts.schema,
    prompt: opts.prompt,
    system: opts.system,
    ...llmLimits(),
  });
}

export interface StreamTextOptions {
  prompt: string;
  system?: string;
}

/** Stream narrative text tokens for perceived performance over SSE. */
export function streamText(opts: StreamTextOptions) {
  return aiStreamText({
    model: getLanguageModel(),
    prompt: opts.prompt,
    system: opts.system,
    ...llmLimits(),
  });
}
export { mockEmbedding } from './mock-provider.js';
