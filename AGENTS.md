# Repository Guidelines

ProfitLeak — financial analytics web app for micro/small business owners. Built with Astro 6 (SSR), React 19, TypeScript, Tailwind 4, Supabase (auth + PostgreSQL), deployed to Cloudflare Workers.

## Critical Rules

**SSR mode is enforced.** All pages server-render by default (`output: "server"` in `astro.config.mjs`). API routes must explicitly export `const prerender = false`.

**Environment variables are server-only.** Use `astro:env/server` for secrets (`SUPABASE_URL`, `SUPABASE_KEY`). Never import from `astro:env/client`. Schema declared in `astro.config.mjs` `env.schema`.

**Tailwind class merging.** Use `cn()` helper from `@/lib/utils` (clsx + tailwind-merge) for conditional classes. Never concatenate class strings manually — the helper deduplicates and resolves conflicts.

**Supabase RLS is mandatory.** Every new table in `supabase/migrations/` must enable Row Level Security with granular per-operation, per-role policies. Migration naming: `YYYYMMDDHHmmss_short_description.sql`.

**React components: no Next.js directives.** Do not use `"use client"`, `"use server"`, or other Next.js-specific annotations. Extract hooks to `src/components/hooks/`.

## Build, Test, and Development Commands

- `npm run dev` — Cloudflare workerd dev server (needs `.dev.vars`)
- `npm run build` — Production SSR build
- `npm run lint` — ESLint strict type-checked (must pass in CI)
- `npm run lint:fix` / `npm run format` — Auto-fix and format

Pre-commit: husky + lint-staged auto-fixes `*.{ts,tsx,astro}` and formats `*.{json,css,md}`.

## Project Structure

- `src/components/` — UI (Astro for static, React for interactive); `ui/` subfolder = shadcn/ui; `hooks/` = extracted React hooks
- `src/pages/` — Astro pages (file-based routing); `api/` = API endpoints; `auth/` = signin/signup/confirm
- `src/lib/` — Utilities, services; `supabase.ts` = SSR client factory; `utils.ts` = cn() helper
- `src/middleware.ts` — Auth middleware (attaches user to `context.locals`)
- `src/types.ts` — Shared types (entities, DTOs)
- `supabase/migrations/` — SQL migrations

Path alias: `@/*` → `./src/*`

## Coding Style & Naming Conventions

- **TypeScript strict mode** — `tsconfig.json` extends `astro/tsconfigs/strict`
- **Component choice** — Astro for static; React only for interactivity (state, effects, handlers)
- **shadcn/ui** — `npx shadcn@latest add [name]` lands in `src/components/ui/`
- **API routes** — Uppercase exports (`GET`, `POST`); validate with zod. See `@src/pages/api/auth/signin.ts`
- **Services/helpers** — Extract to `src/lib/`; keep pages/components thin
- **Shared types** — `src/types.ts` (not per-file)

## Commit & Pull Request Guidelines

CI (GitHub Actions on `master`): `npm ci` → `npx astro sync` → `npm run lint` → `npm run build`. Build requires `SUPABASE_URL` and `SUPABASE_KEY` repository secrets. Lint must pass (zero warnings). Workflow: `.github.scaffold/workflows/ci.yml`.

## Security & Configuration

- **Secrets** — `.env` (Node) or `.dev.vars` (Cloudflare local); copy from `.env.example`
- **Local Supabase** — `npx supabase start` (requires Docker, ~7 GB RAM)
- **Deploy** — `npx wrangler deploy` (config in `wrangler.jsonc`)

See `@CLAUDE.md` for auth flow details and `@README.md` for Supabase setup.
