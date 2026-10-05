import { createOpenAI } from '@ai-sdk/openai';
import { config } from '@daydrift/config';
import type { EmbeddingModel, LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider';

import { createMockEmbeddingModel, createMockLanguageModel } from './mock-provider.js';

// Provider resolution for the AI SDK. The provider is a config switch (Ollama in dev,
// OpenAI in prod, or any OpenAI-compatible endpoint), so no app ever hand-rolls a fetch.
// See docs/03-rag-pipeline.md §6.

interface ProviderSettings {
  provider: string | undefined;
  model: string | undefined;
  baseUrl: string | undefined;
  apiKey: string | undefined;
}

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/** ollama-ai-provider expects the `/api` suffix, which OLLAMA_BASE_URL omits. */
const ollamaApiUrl = (base?: string) =>
  `${(base ?? config.ollamaBaseUrl ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, '')}/api`;

const openaiLike = (s: ProviderSettings) =>
  createOpenAI({ apiKey: s.apiKey ?? config.openaiApiKey, baseURL: s.baseUrl });

/** The offline mock models exist for tests and CI only; a production deploy must never use them. */
function assertMockAllowed(): void {
  if (config.nodeEnv === 'production') {
    throw new Error('The mock AI provider is not allowed in production.');
  }
}

/** text-embedding-3 models can return fewer dimensions; ask for exactly what the schema stores. */
const embeddingSettings = (model: string) =>
  model.startsWith('text-embedding-3') ? { dimensions: config.embedding.dim } : {};

const requireModel = (s: ProviderSettings, kind: string): string => {
  if (!s.model) throw new Error(`No ${kind} model configured.`);
  return s.model;
};

/** Resolve the configured chat/completion model instance. */
export function getLanguageModel(): LanguageModel {
  const s: ProviderSettings = config.llm;
  if (s.provider === 'mock') {
    assertMockAllowed();
    return createMockLanguageModel() as unknown as LanguageModel;
  }
  const model = requireModel(s, 'LLM');
  switch (s.provider) {
    case 'ollama':
      return createOllama({ baseURL: ollamaApiUrl(s.baseUrl) })(model) as unknown as LanguageModel;
    case 'openai':
      return openaiLike(s)(model) as unknown as LanguageModel;
    default:
      if (s.baseUrl) return openaiLike(s)(model) as unknown as LanguageModel;
      throw new Error(
        `Unsupported LLM provider "${s.provider}" (set LLM_BASE_URL for a generic endpoint).`,
      );
  }
}

/** Resolve the configured embedding model instance. */
export function getEmbeddingModel(): EmbeddingModel<string> {
  const s: ProviderSettings = config.embedding;
  if (s.provider === 'mock') {
    assertMockAllowed();
    return createMockEmbeddingModel(config.embedding.dim) as unknown as EmbeddingModel<string>;
  }
  const model = requireModel(s, 'embedding');
  switch (s.provider) {
    case 'ollama':
      return createOllama({ baseURL: ollamaApiUrl(s.baseUrl) }).embedding(
        model,
      ) as unknown as EmbeddingModel<string>;
    case 'openai':
      return openaiLike(s).embedding(
        model,
        embeddingSettings(model),
      ) as unknown as EmbeddingModel<string>;
    default:
      if (s.baseUrl) {
        return openaiLike(s).embedding(
          model,
          embeddingSettings(model),
        ) as unknown as EmbeddingModel<string>;
      }
      throw new Error(
        `Unsupported embedding provider "${s.provider}" (set EMBEDDING_BASE_URL for a generic endpoint).`,
      );
  }
}
