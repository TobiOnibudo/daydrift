# Contributing to Daydrift

## Setup

```bash
pnpm install && pnpm setup && pnpm dev
```

See [docs/07-local-dev.md](./docs/07-local-dev.md) for prerequisites (Node 22.12, pnpm 9,
Docker, Ollama) and [docs/12-developer-experience.md](./docs/12-developer-experience.md)
for the full developer workflow.

## Branching

- Branch off `main`: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- No direct pushes to `main` — all changes land via pull request.

## Commits

Daydrift uses [Conventional Commits](https://www.conventionalcommits.org/). The
`commit-msg` hook enforces this with commitlint. Common types:

- `feat:` — a new feature
- `fix:` — a bug fix
- `docs:` — documentation only
- `chore:` — tooling / config / housekeeping
- `refactor:`, `test:`, `perf:`, `ci:`

Keep commits **atomic** — one logical change per commit.

## Quality gates

Local hooks (Husky + lint-staged) run on commit/push; CI re-runs everything:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

- `pre-commit` formats + lints staged files.
- `pre-push` runs `pnpm typecheck`.
- CI (`.github/workflows/ci.yml`) runs lint → typecheck → build → test on every PR.

## Pull requests

Fill out the PR template. Before requesting review, confirm:

- Lint, typecheck, and tests pass.
- New/changed env vars are in `.env.example` **and** `docs/08-config-env.md`.
- Every new folder of substance has a `README.md`.
- Docs under `/docs` are updated if behavior changed.
