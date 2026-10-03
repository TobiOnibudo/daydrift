# lib/

Shared, framework-agnostic plumbing for the SPA (see [docs/05-frontend.md](../../../../docs/05-frontend.md) §2 & §6).

- `api.ts` — the single `fetch` wrapper (`fetchJson`). Sends the cookie session (`credentials: 'include'`) and an `Authorization: Bearer` fallback for cross-origin; throws typed `ApiError` on non-2xx. **Nothing else in the app calls `fetch` directly.**
- Query client config, formatting/date utils, and other pure helpers also belong here.

Keep this layer free of React component code.
