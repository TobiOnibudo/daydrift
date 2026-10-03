---
name: daydrift-add-package
description: Use when creating a new monorepo workspace package or app, setting up package.json, tsconfig, Turbo pipelines, or exports maps. Covers base tsconfig extends, Turbo wiring, and required folder READMEs.
---

# Scaffold a new Daydrift workspace package

See `docs/01-architecture.md` (package boundaries) and `docs/12-developer-experience.md`.

## Steps

1. Create the folder under `packages/<name>` (or `apps/<name>`) and a `package.json`:
   - name `@daydrift/<name>`, `version` `0.1.0`, `private: true`, `type: "module"`.
   - `main`/`types`/`exports` pointing at `dist`.
   - scripts: `build` (`tsc`), `typecheck` (`tsc --noEmit`), `lint`, `clean` (`rimraf dist`), `test`.
   - internal deps via `workspace:*`, honoring the dependency graph (apps depend on packages; packages never depend on apps).
2. Add `tsconfig.json` that **extends `../../tsconfig.base.json`** with `outDir: dist`, `rootDir: src`, `include: ["src"]`.
3. Turbo needs no per-package wiring beyond the root pipeline (`^build` ordering handles deps) — confirm it builds via `pnpm --filter @daydrift/<name> build`.
4. Add the required `README.md` files: a package-root README and a folder-level README for each folder of substance.

## Checklist

- [ ] `package.json` name/scripts/exports correct
- [ ] `tsconfig.json` extends base
- [ ] Dependency direction respected
- [ ] READMEs added
