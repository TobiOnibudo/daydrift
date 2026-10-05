import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { embed, generateObject, streamText } from '../index.js';
import { mockEmbedding, planFromPrompt } from '../mock-provider.js';

const PROMPT = `You are a local guide planning a half-day walking trip in Toronto.
Traveler interests: art.

Choose exactly 4-5 stops using ONLY the candidate places below. Refer to each by its ref (p1, p2, ...) in placeId.

Candidates:
- p1: Royal Ontario Museum (museum) - museum
- p2: High Park (park)
- p3: Pilot Coffee (cafe) - coffee
- p4: AGO (gallery)
- p5: St Lawrence Market (market)
- p6: CN Tower Lookout (viewpoint)`;

describe('mock embeddings', () => {
  it('are deterministic, unit length, and differ per text', () => {
    const a = mockEmbedding('coffee', 768);
    expect(mockEmbedding('coffee', 768)).toEqual(a);
    expect(mockEmbedding('museum', 768)).not.toEqual(a);
    expect(a).toHaveLength(768);
    expect(Math.hypot(...a)).toBeCloseTo(1, 5);
  });

  it('flow through the real embed() wrapper at the configured dimension', async () => {
    const vector = await embed('hello');
    expect(vector).toHaveLength(768);
  });
});

describe('mock chat model', () => {
  it('derives a plan with the requested number of stops from the prompt', () => {
    const plan = planFromPrompt(PROMPT);
    expect(plan.title).toBe('A mock day in Toronto');
    expect(plan.legs.map((l) => l.placeId)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });

  it('never asks for more stops than there are candidates', () => {
    expect(planFromPrompt('exactly 5 stops\n- p1: A (cafe)\n- p2: B (park)').legs).toHaveLength(2);
  });

  it('serves structured output through the real generateObject() wrapper', async () => {
    const schema = z.object({
      title: z.string(),
      vibeTags: z.array(z.string()),
      legs: z.array(z.object({ placeId: z.string(), order: z.number(), rationale: z.string() })),
    });
    const { object } = await generateObject({ schema, prompt: PROMPT });
    expect(object.legs).toHaveLength(4);
    expect(object.legs[0]).toMatchObject({ placeId: 'p1', order: 1 });
  });

  it('streams a narrative through the real streamText() wrapper', async () => {
    const result = await streamText({ prompt: 'narrate' });
    let text = '';
    for await (const chunk of result.textStream) text += chunk;
    expect(text).toMatch(/^Start your day/);
  });
});

describe('production safety', () => {
  it('refuses to construct mock models when NODE_ENV is production', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@db:5432/x');
    vi.stubEnv('REDIS_URL', 'redis://redis:6379');

    try {
      const provider = await import('../provider.js');
      expect(() => provider.getLanguageModel()).toThrow(/not allowed in production/);
      expect(() => provider.getEmbeddingModel()).toThrow(/not allowed in production/);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
