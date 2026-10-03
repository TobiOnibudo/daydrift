import { createOpenAI } from '@ai-sdk/openai';
import { config } from '@daydrift/config';
import type { EmbeddingModel, LanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider';

// Provider resolution for the AI SDK. The provider is a config switch
// (Ollama in dev / OpenAI in prod / generic OpenAI-compatible endpoint),
// so no app ever hand-rolls a fetch. See docs/03-rag-pipeline.md §6.

// `@daydrift/config` only guarantees `provider` + `model`; base URL / API key
// are optional provider-specific extras, so we read them through a loose view.
type ProviderSettings = {
  provider: string;
  model: string;
  baseURL?: string;
  apiKey?: string;
};

const llm = config.llm as unknown as ProviderSettings;
const embedding = config.embedding as unknown as ProviderSettings;

/** Resolve the configured chat/completion model instance. */
export function getLanguageModel(): LanguageModel {
  switch (llm.provider) {
    case 'ollama': {
      const ollama = createOllama({ baseURL: llm.baseURL });
      return ollama(llm.model) as unknown as LanguageModel;
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey: llm.apiKey });
      return openai(llm.model) as unknown as LanguageModel;
    }
    default:
      // TODO: generic OpenAI-compatible endpoint (LLM_BASE_URL / LLM_API_KEY).
      throw new Error(`Unsupported LLM provider: ${llm.provider}`);
  }
}

/** Resolve the configured embedding model instance. */
export function getEmbeddingModel(): EmbeddingModel<string> {
  switch (embedding.provider) {
    case 'ollama': {
      const ollama = createOllama({ baseURL: embedding.baseURL });
      return ollama.embedding(embedding.model) as unknown as EmbeddingModel<string>;
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey: embedding.apiKey });
      return openai.embedding(embedding.model) as unknown as EmbeddingModel<string>;
    }
    default:
      // TODO: generic OpenAI-compatible endpoint (EMBEDDING_BASE_URL / EMBEDDING_API_KEY).
      throw new Error(`Unsupported embedding provider: ${embedding.provider}`);
  }
}
