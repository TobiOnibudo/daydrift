---
name: daydrift-api-endpoint
description: Use when adding or modifying a REST API endpoint, Fastify route, or HTTP handler in the gateway/API, wiring auth, request validation, or error responses. Covers Fastify route modules, Zod schemas in packages/types, requireAuth, and the standard error envelope.
---

# Add a Daydrift REST endpoint

End-to-end recipe for a new API route. See `docs/04-api.md`.

## Steps

1. Create or extend a Fastify route module under `apps/api/src/routes/` and register it in the route tree (`routes/index.ts`).
2. Define request/response **Zod schemas in `packages/types`** (the shared SSOT) and validate the request against them. Validation failure → `VALIDATION_ERROR` envelope with `details`.
3. For protected routes, add the `requireAuth` preHandler (`apps/api/src/plugins/auth.ts`); read `request.userId`.
4. On failure, return the standard error envelope `{ error: { code, message, details? } }`. Never leak raw errors — the central error handler maps thrown errors to the envelope.
5. Update the route folder's `README.md` with the new endpoint.

## Checklist

- [ ] Route registered under `/api/v1`
- [ ] Zod schema in `packages/types`, request validated
- [ ] `requireAuth` on protected routes
- [ ] Error envelope on all failure paths
- [ ] `routes/README.md` updated
