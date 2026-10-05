import { MockEmbeddingModelV1, MockLanguageModelV1, simulateReadableStream } from 'ai/test';

// Deterministic, offline stand-ins for the embedding and chat models. Selected with
// LLM_PROVIDER=mock / EMBEDDING_PROVIDER=mock so end-to-end tests and CI need no Ollama or OpenAI.
// Never allowed in production (enforced in provider.ts).

/** Stable pseudo-random unit vector derived from the text (same text, same vector). */
export function mockEmbedding(text: string, dim: number): number[] {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);

  const vec = Array.from({ length: dim }, () => {
    seed =
      Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed >>> 0) / 4294967295) * 2 - 1;
  });
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export const createMockEmbeddingModel = (dim: number) =>
  new MockEmbeddingModelV1<string>({
    modelId: 'mock-embedding',
    maxEmbeddingsPerCall: 100,
    supportsParallelCalls: true,
    doEmbed: async ({ values }) => ({
      embeddings: values.map((v) => mockEmbedding(v, dim)),
      usage: { tokens: values.join(' ').split(/\s+/).length },
    }),
  });

const USAGE = { promptTokens: 1, completionTokens: 1 };
const RAW = { rawPrompt: null, rawSettings: {} };

/** Pull candidate refs (`- p3: Name (category)`) and the requested stop count out of our prompt. */
export function planFromPrompt(prompt: string) {
  const places = [...prompt.matchAll(/^- (p\d+): (.+?) \(/gm)].map((m) => ({
    ref: m[1] as string,
    name: m[2] as string,
  }));
  const range = /exactly (\d+)(?:-(\d+))? stops/.exec(prompt);
  const stops = Math.min(places.length, Number(range?.[1] ?? 3));
  const city = /trip in ([^.\n]+)\./.exec(prompt)?.[1] ?? 'the city';

  return {
    title: `A mock day in ${city}`,
    vibeTags: ['mock', 'test'],
    legs: places.slice(0, stops).map((p, i) => ({
      placeId: p.ref,
      order: i + 1,
      rationale: `A fine stop: ${p.name}.`,
    })),
  };
}

const flatten = (prompt: Array<{ content: unknown }>) =>
  prompt
    .flatMap((m) =>
      Array.isArray(m.content)
        ? m.content.map((c) => (c as { text?: string }).text ?? '')
        : [String(m.content)],
    )
    .join('\n');

const NARRATIVE =
  'Start your day with an easy stroll, then let the city carry you from stop to stop.';

export const createMockLanguageModel = () =>
  new MockLanguageModelV1({
    modelId: 'mock-chat',
    defaultObjectGenerationMode: 'json',
    doGenerate: async ({ prompt }) => ({
      text: JSON.stringify(planFromPrompt(flatten(prompt))),
      finishReason: 'stop',
      usage: USAGE,
      rawCall: RAW,
    }),
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 15,
        values: [
          ...NARRATIVE.split(/(?<=\s)/).map((text) => ({
            type: 'text-delta' as const,
            textDelta: text,
          })),
          { type: 'finish' as const, finishReason: 'stop' as const, usage: USAGE },
        ],
      }),
      rawCall: RAW,
    }),
  });
