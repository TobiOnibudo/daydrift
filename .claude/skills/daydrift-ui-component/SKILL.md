---
name: daydrift-ui-component
description: Use when creating or scaffolding a React UI component for the web app (apps/web/src/components), adding buttons, cards, modals, animated or motion UI, or deciding between shadcn, Magic UI, Aceternity, or React Bits. Covers Tailwind tokens, Framer Motion, prefers-reduced-motion.
---

# Scaffold a Daydrift UI component

Build a React component the Daydrift way. See `docs/05-frontend.md` for the full frontend spec.

## Steps

1. Base the component on **shadcn/ui** primitives — do not hand-roll what shadcn already provides.
2. Style **only with Tailwind design tokens** (color scale, spacing, radius, type scale). No raw hex or px values. If you need a token that doesn't exist, use `daydrift-design-system` first.
3. Place the component in `apps/web/src/components/<domain>/` and update that folder's `README.md`.
4. Use **Framer Motion** for animation and interaction. Always guard motion with `prefers-reduced-motion`.
5. Use **Magic UI / Aceternity / React Bits** only for intentional accents (hero, empty states, the "generating your trip" moment). Pull one or two components, not whole kits. Default to plain shadcn for everyday UI.
6. Keep it accessible (labels, focus-visible, roles, `aria-live` for streaming regions) and fully typed.

## Checklist

- [ ] shadcn/ui base, Tailwind tokens only
- [ ] Framer Motion animation guarded by `prefers-reduced-motion`
- [ ] Accent kits used sparingly, if at all
- [ ] Component typed; folder `README.md` updated
