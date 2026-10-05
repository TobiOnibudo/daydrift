import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
vi.mock('@daydrift/auth', () => ({
  auth: { api: { getSession }, handler: vi.fn() },
  fromNodeHeaders: (h: unknown) => h,
}));

const core = {
  getCachedTripResult: vi.fn(),
  insertTrip: vi.fn(),
  failTrip: vi.fn(),
  getTrip: vi.fn(),
  resetTrip: vi.fn(),
  checkDependencies: vi.fn(),
  listCities: vi.fn(),
  shareTrip: vi.fn(),
  unshareTrip: vi.fn(),
  getSharedTrip: vi.fn(),
  buildEditedResult: vi.fn(),
  updateTripStops: vi.fn(),
  suggestPlacesForTrip: vi.fn(),
  startRefine: vi.fn(),
  restoreTrip: vi.fn(),
};
vi.mock('@daydrift/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@daydrift/core')>()),
  ...core,
}));

const { buildApp } = await import('../app.js');
const { TripEditError } = await import('@daydrift/core');

const queue = { add: vi.fn(), close: vi.fn(async () => undefined) };
const TRIP_ID = '7d4b8a3e-7c43-4f6f-9d1b-1f2b7a9c0e11';
const body = {
  city: ' Toronto ',
  interests: ['Art', 'coffee', 'art'],
  duration: 'half-day',
  travelMode: 'walking',
};

let app: Awaited<ReturnType<typeof buildApp>>;

beforeEach(async () => {
  vi.clearAllMocks();
  queue.add.mockReset().mockResolvedValue(undefined);
  getSession.mockResolvedValue({ user: { id: 'u1' } });
  core.getCachedTripResult.mockResolvedValue(null);
  core.insertTrip.mockImplementation(async (a: { result?: unknown }) => ({
    id: TRIP_ID,
    status: a.result ? 'complete' : 'pending',
  }));
  app = await buildApp({ aiPlanQueue: queue, logger: false });
});

afterEach(() => app.close());

const post = (url: string, payload?: unknown) =>
  app.inject({ method: 'POST', url, payload: payload as object });

describe('POST /api/v1/trips', () => {
  it('rejects unauthenticated requests with the UNAUTHORIZED envelope', async () => {
    getSession.mockResolvedValue(null);
    const res = await post('/api/v1/trips', body);
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  });

  it('rejects invalid input with VALIDATION_ERROR and field details', async () => {
    const res = await post('/api/v1/trips', { ...body, duration: 'forever' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
    expect(res.json().error.details.fieldErrors.duration).toBeDefined();
  });

  it('creates a pending trip from normalized input and enqueues one job on a cache miss', async () => {
    const res = await post('/api/v1/trips', body);

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ tripId: TRIP_ID, status: 'pending' });
    const inserted = core.insertTrip.mock.calls[0]![0];
    expect(inserted.userId).toBe('u1');
    expect(inserted.input).toEqual({
      city: 'toronto',
      interests: ['art', 'coffee'],
      duration: 'half-day',
      travelMode: 'walking',
    });
    expect(inserted.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(queue.add).toHaveBeenCalledWith(
      'ai-plan',
      { tripId: TRIP_ID, input: inserted.input },
      { jobId: TRIP_ID },
    );
  });

  it('returns a complete trip straight from the result cache without enqueueing', async () => {
    const cached = {
      title: 'Cached',
      legs: [],
      routeGeojson: null,
      totalDistanceKm: 1,
      vibeTags: [],
    };
    core.getCachedTripResult.mockResolvedValue(cached);

    const res = await post('/api/v1/trips', body);

    expect(res.json()).toEqual({ tripId: TRIP_ID, status: 'complete' });
    expect(core.insertTrip.mock.calls[0]![0].result).toEqual(cached);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('falls back to generation when the cache is unavailable', async () => {
    core.getCachedTripResult.mockRejectedValue(new Error('redis down'));
    const res = await post('/api/v1/trips', body);
    expect(res.statusCode).toBe(201);
    expect(queue.add).toHaveBeenCalledOnce();
  });

  it('marks the trip failed and returns 503 if enqueueing fails', async () => {
    queue.add.mockRejectedValue(new Error('redis down'));
    const res = await post('/api/v1/trips', body);

    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe('SERVICE_UNAVAILABLE');
    expect(core.failTrip).toHaveBeenCalledWith(TRIP_ID);
  });
});

describe('trip resources', () => {
  it('returns NOT_FOUND for a trip the caller does not own', async () => {
    core.getTrip.mockResolvedValue(null);
    const res = await app.inject({ method: 'GET', url: `/api/v1/trips/${TRIP_ID}` });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
    expect(core.getTrip).toHaveBeenCalledWith(TRIP_ID, 'u1');
  });

  it('validates the id parameter', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/trips/not-a-uuid' });
    expect(res.statusCode).toBe(400);
  });

  it('refuses to regenerate a trip that is still generating', async () => {
    core.getTrip.mockResolvedValue({ id: TRIP_ID, status: 'processing' });
    const res = await post(`/api/v1/trips/${TRIP_ID}/regenerate`);
    expect(res.statusCode).toBe(409);
    expect(core.resetTrip).not.toHaveBeenCalled();
  });

  it('resets and re-enqueues a finished trip with a fresh job id', async () => {
    const stored = {
      id: TRIP_ID,
      status: 'complete',
      city: 'toronto',
      interests: ['art'],
      duration: 'half-day',
      travelMode: 'walking',
    };
    core.getTrip.mockResolvedValue(stored);
    core.resetTrip.mockResolvedValue({ ...stored, status: 'pending' });

    const res = await post(`/api/v1/trips/${TRIP_ID}/regenerate`);

    expect(res.statusCode).toBe(202);
    const [, data, opts] = queue.add.mock.calls[0]!;
    expect(data).toEqual({
      tripId: TRIP_ID,
      input: { city: 'toronto', interests: ['art'], duration: 'half-day', travelMode: 'walking' },
    });
    expect(opts.jobId).toMatch(new RegExp(`^${TRIP_ID}-\\d+$`));
  });
});

describe('places and platform routes', () => {
  it('rejects an unknown place category', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/places?category=spaceport' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('lists plannable cities publicly', async () => {
    core.listCities.mockResolvedValue([{ key: 'toronto', name: 'Toronto', placeCount: 827 }]);
    const res = await app.inject({ method: 'GET', url: '/api/v1/places/cities' });
    expect(res.statusCode).toBe(200);
    expect(res.json().cities[0]).toMatchObject({ key: 'toronto', name: 'Toronto' });
  });

  it('requires auth for seeding and semantic search', async () => {
    getSession.mockResolvedValue(null);
    expect((await post('/api/v1/places/seed', { city: 'toronto' })).statusCode).toBe(401);
    expect(
      (await post('/api/v1/places/search/semantic', { query: 'x', city: 'toronto' })).statusCode,
    ).toBe(401);
  });

  it('reports readiness from the dependency checks', async () => {
    core.checkDependencies.mockResolvedValue({ database: true, redis: true });
    expect((await app.inject({ method: 'GET', url: '/health/ready' })).statusCode).toBe(200);

    core.checkDependencies.mockResolvedValue({ database: true, redis: false });
    const down = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(down.statusCode).toBe(503);
    expect(down.json().error).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      details: { redis: false },
    });
  });

  it('answers liveness without touching dependencies', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.json()).toEqual({ status: 'ok' });
    expect(core.checkDependencies).not.toHaveBeenCalled();
  });

  it('returns the envelope for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});

describe('sharing', () => {
  const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv';

  it('lets the owner enable and disable sharing', async () => {
    core.shareTrip.mockResolvedValue(TOKEN);
    const on = await post(`/api/v1/trips/${TRIP_ID}/share`);
    expect(on.json()).toEqual({ shareToken: TOKEN });
    expect(core.shareTrip).toHaveBeenCalledWith(TRIP_ID, 'u1');

    core.unshareTrip.mockResolvedValue(true);
    const off = await app.inject({ method: 'DELETE', url: `/api/v1/trips/${TRIP_ID}/share` });
    expect(off.statusCode).toBe(204);
  });

  it('404s when the trip is unfinished or not owned by the caller', async () => {
    core.shareTrip.mockResolvedValue(null);
    expect((await post(`/api/v1/trips/${TRIP_ID}/share`)).statusCode).toBe(404);
  });

  it('requires auth to manage sharing', async () => {
    getSession.mockResolvedValue(null);
    expect((await post(`/api/v1/trips/${TRIP_ID}/share`)).statusCode).toBe(401);
  });

  it('serves a shared trip publicly without a session, uncached', async () => {
    getSession.mockResolvedValue(null);
    core.getSharedTrip.mockResolvedValue({ id: TRIP_ID, title: 'Shared' });
    const res = await app.inject({ method: 'GET', url: `/api/v1/shared/${TOKEN}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().trip.title).toBe('Shared');
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('404s for unknown tokens and 400s for malformed ones', async () => {
    core.getSharedTrip.mockResolvedValue(null);
    expect((await app.inject({ method: 'GET', url: `/api/v1/shared/${TOKEN}` })).statusCode).toBe(
      404,
    );
    expect((await app.inject({ method: 'GET', url: '/api/v1/shared/x' })).statusCode).toBe(400);
  });
});

describe('editing stops', () => {
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  const patch = (payload: unknown) =>
    app.inject({
      method: 'PATCH',
      url: `/api/v1/trips/${TRIP_ID}/stops`,
      payload: payload as object,
    });

  it('saves a new order for a finished trip and returns the updated trip', async () => {
    core.getTrip.mockResolvedValue({ id: TRIP_ID, status: 'complete', city: 'toronto', legs: [] });
    core.buildEditedResult.mockResolvedValue({ legs: [] });
    core.updateTripStops.mockResolvedValue({ id: TRIP_ID, status: 'complete', title: 'Edited' });

    const res = await patch({ placeIds: ids });

    expect(res.statusCode).toBe(200);
    expect(res.json().trip.title).toBe('Edited');
    expect(core.buildEditedResult).toHaveBeenCalledWith(
      expect.objectContaining({ id: TRIP_ID }),
      ids,
    );
    expect(core.updateTripStops).toHaveBeenCalledWith(TRIP_ID, 'u1', { legs: [] });
  });

  it('requires a session and only lets you edit your own trip', async () => {
    getSession.mockResolvedValue(null);
    expect((await patch({ placeIds: ids })).statusCode).toBe(401);

    getSession.mockResolvedValue({ user: { id: 'u1' } });
    core.getTrip.mockResolvedValue(null);
    expect((await patch({ placeIds: ids })).statusCode).toBe(404);
  });

  it('refuses to edit a trip that is still being planned', async () => {
    core.getTrip.mockResolvedValue({ id: TRIP_ID, status: 'processing' });
    const res = await patch({ placeIds: ids });
    expect(res.statusCode).toBe(409);
    expect(core.buildEditedResult).not.toHaveBeenCalled();
  });

  it.each([
    ['fewer than two stops', { placeIds: [ids[0]] }],
    [
      'more than eight stops',
      { placeIds: Array.from({ length: 9 }, (_, i) => `${i}${ids[0]!.slice(1)}`) },
    ],
    ['ids that are not uuids', { placeIds: ['a', 'b'] }],
    ['a missing list', {}],
  ])('rejects %s before touching the trip', async (_name, payload) => {
    const res = await patch(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
    expect(core.updateTripStops).not.toHaveBeenCalled();
  });

  it('turns an unusable edit into a clear 400 the person can act on', async () => {
    core.getTrip.mockResolvedValue({ id: TRIP_ID, status: 'complete' });
    core.buildEditedResult.mockRejectedValue(
      new TripEditError('One of those places is not available for this trip.'),
    );
    const res = await patch({ placeIds: ids });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toMatch(/not available/);
  });

  it('serves suggestions for the trip, optionally filtered by a search', async () => {
    core.getTrip.mockResolvedValue({ id: TRIP_ID, status: 'complete', city: 'toronto' });
    core.suggestPlacesForTrip.mockResolvedValue([{ id: 'p1', name: 'High Park' }]);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/trips/${TRIP_ID}/suggestions?q=park`,
    });

    expect(res.json().places[0].name).toBe('High Park');
    expect(core.suggestPlacesForTrip).toHaveBeenCalledWith(
      expect.objectContaining({ id: TRIP_ID }),
      'park',
    );
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/trips/${TRIP_ID}/suggestions?q=${'x'.repeat(81)}`,
        })
      ).statusCode,
    ).toBe(400);
  });
});

describe('POST /api/v1/trips/:id/refine', () => {
  const stored = {
    id: TRIP_ID,
    status: 'complete',
    city: 'toronto',
    interests: ['art'],
    duration: 'half-day',
    travelMode: 'walking',
  };
  const refine = (payload: unknown) => post(`/api/v1/trips/${TRIP_ID}/refine`, payload);

  it("keeps the itinerary and queues a revision with the traveler's words", async () => {
    core.getTrip.mockResolvedValue(stored);
    core.startRefine.mockResolvedValue({ ...stored, status: 'pending' });

    const res = await refine({ instruction: '  It is raining  ' });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ tripId: TRIP_ID, status: 'pending' });
    const [, data, opts] = queue.add.mock.calls[0]!;
    expect(data).toEqual({
      tripId: TRIP_ID,
      input: { city: 'toronto', interests: ['art'], duration: 'half-day', travelMode: 'walking' },
      refine: { instruction: 'It is raining' },
    });
    expect(opts.jobId).toMatch(new RegExp(`^${TRIP_ID}-refine-\\d+$`));
    expect(core.resetTrip).not.toHaveBeenCalled();
  });

  it.each([
    ['nothing', {}],
    ['too little', { instruction: 'a' }],
    ['too much', { instruction: 'x'.repeat(301) }],
  ])('rejects %s to go on before touching the trip', async (_name, payload) => {
    const res = await refine(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
    expect(core.startRefine).not.toHaveBeenCalled();
  });

  it('404s for a trip that is not yours and 409s while one is being planned', async () => {
    core.getTrip.mockResolvedValue(null);
    expect((await refine({ instruction: 'more food' })).statusCode).toBe(404);

    core.getTrip.mockResolvedValue({ ...stored, status: 'processing' });
    core.startRefine.mockResolvedValue(null);
    expect((await refine({ instruction: 'more food' })).statusCode).toBe(409);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('puts the trip back and reports unavailability if the job cannot be queued', async () => {
    core.getTrip.mockResolvedValue(stored);
    core.startRefine.mockResolvedValue({ ...stored, status: 'pending' });
    queue.add.mockRejectedValue(new Error('redis down'));

    const res = await refine({ instruction: 'more food' });

    expect(res.statusCode).toBe(503);
    expect(core.restoreTrip).toHaveBeenCalledWith(TRIP_ID);
  });
});
