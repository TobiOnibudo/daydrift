# plugins

Cross-cutting request-lifecycle pieces for `@daydrift/api`.

| File               | Purpose                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `auth.ts`          | `requireAuth`: validates the Better Auth session, sets `request.userId`. |
| `better-auth.ts`   | Mounts Better Auth at `/api/v1/auth/*` (forwards every `Set-Cookie`).    |
| `error-handler.ts` | Maps `AppError`, rate limits, and unknown errors to the error envelope.  |
