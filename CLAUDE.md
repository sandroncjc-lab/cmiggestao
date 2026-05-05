# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Turbopack, outputs to .next/dev)
npm run build    # Production build (Turbopack by default)
npm run start    # Start production server
npm run lint     # Run ESLint directly (not `next lint` — removed in v16)
```

No test runner is configured yet.

## Next.js 16 Breaking Changes to Know

This project uses **Next.js 16.2.4** with **React 19.2**. Key differences from earlier versions:

- **Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, and `params`/`searchParams` in pages/layouts are async only. Always `await` them.
- **`middleware` → `proxy`** — rename `middleware.ts` to `proxy.ts` and the exported function to `proxy`. Edge runtime is not supported in `proxy`.
- **`next lint` removed** — use `eslint` CLI directly. `next build` no longer runs lint.
- **`serverRuntimeConfig`/`publicRuntimeConfig` removed** — use `process.env` / `NEXT_PUBLIC_` prefix instead.
- **PPR** — `experimental.ppr` removed; use `cacheComponents: true` in `next.config.ts`.
- **`revalidateTag`** — now requires a second `cacheLife` profile argument. For immediate invalidation, use `updateTag` in Server Actions instead.
- **Turbopack is default** — no `--turbopack` flag needed. If you have a custom webpack config, pass `--webpack` to opt out.
- **Parallel routes** — all slots require an explicit `default.js`; builds fail without them.
- **`unstable_` prefix removed** from `cacheLife`, `cacheTag`.
- **`experimental.turbopack`** moved to top-level `turbopack` in `next.config.ts`.

## Architecture

- `src/app/` — App Router. `layout.tsx` is the root layout; `page.tsx` is the home route.
- `src/app/globals.css` — Tailwind CSS v4 entry point with light/dark theme tokens.
- Path alias `@/*` → `src/*`.
- No API routes or custom components yet; this is a freshly scaffolded project.

## Key Config Files

- `next.config.ts` — minimal, no custom options set.
- `eslint.config.mjs` — flat config format with `core-web-vitals` + TypeScript rules.
- `postcss.config.mjs` — Tailwind CSS v4 via `@tailwindcss/postcss`.
