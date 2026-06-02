---
bootstrapped_at: 2026-05-21T13:12:00Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: profitleak
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
---
starter_id: 10x-astro-starter
package_manager: npm
project_name: profitleak
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---
```

**Why this stack:**

ProfitLeak to aplikacja webowa budowana solo z 3-tygodniowym terminem, wymagająca autentykacji, bazy danych do przechowywania CSV oraz obliczeń finansowych, i interfejsu dashboardu. 10x Astro Starter dostarcza wszystkie te wymagania od razu: Supabase zapewnia PostgreSQL + auth (zgodnie z FR-001, FR-002), Astro + React obsługują UI (dashboard w FR-018–FR-020), TypeScript + Zod gwarantują przyjazne agentom jawne kontrakty na granicach danych, a Cloudflare Pages umożliwia szybkie wdrożenie na edge. Opiniodawczy charakter full-stacku redukuje zmęczenie decyzyjne i narzut konfiguracyjny, kluczowe dla ciasnego terminu MVP i kontekstu solo.

## Pre-scaffold verification

| Signal             | Value                              | Severity | Notes                              |
| ------------------ | ---------------------------------- | -------- | ---------------------------------- |
| npm package        | not run                            | n/a      | starter uses git clone, not npm create |
| GitHub repo        | przeprogramowani/10x-astro-starter last pushed 2026-05-17T10:33:39Z | **fresh** | 4 days ago (via GitHub API) |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`  
**Strategy**: git-clone  
**Exit code**: 0  
**Files moved**: 17 (6 directories + 11 files)  
**Conflicts (.scaffold siblings)**: `.github.scaffold` (existing `.github/` preserved)  
**.gitignore handling**: moved silently (no pre-existing `.gitignore` in cwd)  
**.bootstrap-scaffold cleanup**: deleted  

**Moved directories:**
- `.husky/`
- `.vscode/`
- `node_modules/` (773 packages)
- `public/`
- `src/`
- `supabase/`

**Moved files:**
- `.env.example`
- `.gitignore`
- `.nvmrc`
- `.prettierrc.json`
- `astro.config.mjs`
- `CLAUDE.md`
- `components.json`
- `eslint.config.js`
- `package-lock.json`
- `package.json`
- `README.md`
- `tsconfig.json`
- `wrangler.jsonc`

## Post-scaffold audit

**Tool**: `npm audit --json`  
**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW  
**Direct vs transitive**: 2 direct, 8 transitive

### HIGH findings

**devalue** (transitive)
- Version: 5.6.3 - 5.8.0
- Advisory: GHSA-77vg-94rm-hx3p
- Description: Svelte devalue — DoS via sparse array deserialization (CWE-770)
- CVSS: 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
- Fix: update available via `npm audit fix`

### MODERATE findings

**@astrojs/check** (direct)
- Version: >=0.9.3
- Via: @astrojs/language-server (transitive chain)
- Fix: downgrade to 0.9.2 (major version change)

**wrangler** (direct)
- Version: 3.108.0 - 4.93.0
- Via: miniflare (transitive)
- Fix: update available via `npm audit fix`

**ws** (transitive)
- Version: 8.0.0 - 8.20.0
- Advisory: GHSA-58qx-3vcg-4xpx
- Description: Uninitialized memory disclosure (CWE-908)
- CVSS: 4.4 (CVSS:3.1/AV:N/AC:H/PR:H/UI:N/S:U/C:H/I:N/A:N)
- Fix: update available via `npm audit fix`

**yaml** (transitive)
- Version: 2.0.0 - 2.8.2
- Advisory: GHSA-48c2-rrv3-qjmp
- Description: Stack overflow via deeply nested YAML collections (CWE-674)
- CVSS: 4.3 (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L)
- Fix: update via @astrojs/check downgrade to 0.9.2

**@astrojs/language-server, @cloudflare/vite-plugin, miniflare, volar-service-yaml, yaml-language-server** (all transitive)
- Various moderate severity issues in dev/tooling dependencies
- Fixes available via `npm audit fix` or major version updates

## Hints recorded but not acted on

The following hints from the hand-off were logged but no automated action was taken in v1:

- `team_size: solo` — informational; no team-specific scaffolding in v1
- `deployment_target: cloudflare-pages` — logged; no deployment config scaffolding in v1 (starter's `wrangler.jsonc` provides baseline)
- `ci_provider: github-actions` — logged; no CI workflow generation in v1
- `ci_default_flow: auto-deploy-on-merge` — logged; no CI workflow generation in v1
- `quality_override: false` — no quality gap detected during stack selection
- `self_check_answers: null` — standard path taken; no self-check was run
- `has_auth: true` — feature detected; Supabase auth included in starter
- `has_payments: false` — no payment integration required
- `has_realtime: false` — no realtime features required
- `has_ai: false` — no AI/LLM integration required
- `has_background_jobs: false` — no background job infrastructure required

## Next steps

Your project has been scaffolded and verified.

**Immediate actions:**
1. Review the `.github.scaffold/` directory to see if any workflows or configs from the starter are useful to merge with your existing `.github/`
2. Run `npm audit fix` to address the 1 HIGH and most MODERATE vulnerabilities (safe automated fixes)
3. Consider `npm audit fix --force` for remaining issues (may introduce breaking changes — review carefully)
4. Copy `.env.example` to `.env` and configure your Supabase credentials
5. Review `README.md` for starter-specific setup instructions

**Future work (not in v1):**
- Agent context setup (`AGENTS.md` / `CLAUDE.md` enhancements) — future M1L4 skill
- CI/CD workflow configuration for GitHub Actions with auto-deploy to Cloudflare Pages
- Supabase RLS policy setup (critical for auth security)

Happy hacking!
