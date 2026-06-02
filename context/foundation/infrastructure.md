---
project: ProfitLeak
researched_at: 2026-05-22T00:00:00Z
recommended_platform: Cloudflare Workers + Pages
runner_up: Vercel
context_type: mvp
tech_stack:
  language: JavaScript/TypeScript
  framework: Astro 6 + React 19
  runtime: Node 22
  database: Supabase (PostgreSQL, external)
---

## Recommendation

**Deploy on Cloudflare Workers + Pages.**

Cloudflare passes all five agent-friendly criteria (CLI-first, managed/serverless, agent-readable docs, stable deploy API, MCP integration) and is already specified in `context/foundation/tech-stack.md` as the deployment target. For a solo-built, 3-week MVP with stateless request/response architecture and external Supabase database, Cloudflare's edge-native platform delivers strong DX, generous free tier (100k requests/day), mature `wrangler` CLI, and multiple MCP servers for structured agent operations — all aligned with the "prioritize DX over cost" interview answer.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent docs | Stable deploy API | MCP/Integration | Total | Notes |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Cloudflare** | ✓ | ✓ | ✓ | ✓ | ✓ | **5/5** | llms.txt + MCP; edge-native; already in tech stack |
| **Vercel** | ✓ | ✓ | ✓ | ✓ | ~ | **4.5/5** | MCP beta; Next-biased but Astro GA; higher cost |
| **Netlify** | ✓ | ✓ | ~ | ✓ | ✓ | **4/5** | Deno edge (not Node); MCP GA; less Astro focus |
| **Fly.io** | ✓ | ~ | ✓ | ✓ | ✗ | **3.5/5** | Full VMs = ops overhead; no MCP; overkill |
| **Railway** | ~ | ~ | ✗ | ✓ | ✗ | **2/5** | Weak docs; containers; no MCP; cost unpredictable |
| **Render** | ~ | ~ | ✗ | ~ | ✗ | **1.5/5** | Weak CLI; free = static only; no MCP |

### Shortlisted Platforms

#### 1. Cloudflare Workers + Pages (Recommended)

**Why it won**: Passes all five criteria cleanly. `wrangler` CLI is comprehensive (deploy, logs, tail, rollback, secrets). llms.txt published at docs.cloudflare.com and markdown source on GitHub. Multiple MCP servers (docs, Workers observability, general Cloudflare ops) enable structured agent access. Generous free tier (100k req/day) covers MVP scale. Edge-native architecture (300+ PoPs globally) delivers low latency even for single-region traffic. Astro SSR support via `@astrojs/cloudflare` is first-class and GA. Already specified in tech-stack.md as deployment target — continuity from stack selection to deployment. Supabase works as external provider (interview Q5 = "external OK").

**Key strengths**:
- MCP integration strongest among all platforms (3+ official servers)
- Edge runtime constraints force stateless discipline (alignment with Q1 = "stateless only")
- DX prioritized (interview Q2): fast deploys, instant rollback, clear logs
- Cost-effective at MVP scale: free tier → $5/mo Workers Paid transition is gentle

#### 2. Vercel

**Why it scored second**: Strong on four criteria (CLI-first, managed, agent docs, stable API). `vercel` CLI is simple and agent-friendly. Astro adapter (`@astrojs/vercel`) is first-class and GA. Vercel MCP server exists but is in beta (OAuth-backed, not GA — status checked 2026-05-22). Excellent DX (aligns with Q2 = "prioritize DX"), but higher cost than Cloudflare: Hobby free tier limited (100 GB-hrs/mo), Pro tier $20/mo/user vs Cloudflare $5/mo Workers Paid. Slightly Next.js-biased (Astro supported but not "blessed" like Next). Would be top pick if cost or vendor lock-in concerns outweighed edge-native benefits.

**Gap vs Cloudflare**: MCP in beta (not GA), higher long-term cost, no edge-native advantage for single-region deployment.

#### 3. Netlify

**Why it scored third**: Solid on CLI, managed platform, and MCP (Netlify MCP Server is GA and officially recommended). Edge Functions use Deno runtime (not Node.js), which diverges from tech stack's Node 22 focus — possible friction when using Node-specific npm packages. Docs are markdown-based but less agent-optimized than Cloudflare's llms.txt. Free tier competitive (100 GB bandwidth, 125k function invocations). Good DX, but less Astro ecosystem momentum than Cloudflare or Vercel. Would be viable fallback if Cloudflare's edge constraints (30s timeout, no `child_process`) proved blocking.

**Gap vs Cloudflare**: Deno edge (not Node), weaker Astro ecosystem integration, no multi-MCP coverage.

## Anti-Bias Cross-Check: Cloudflare Workers + Pages

### Devil's Advocate — Weaknesses

1. **Edge runtime CPU time limit (30s wall-clock, <50ms CPU per request)** — CSV processing for hundreds of invoice rows could hit CPU limits. Heavy margin calculations may need offloading to Cloudflare Queues or Durable Objects, complicating MVP architecture.

2. **Workers Runtime is V8, not full Node.js** — Some npm packages using Node-specific APIs (`child_process`, `fs`, native streams) won't work. Astro adapter is tested, but edge cases with third-party libraries may require workarounds or alternative packages.

3. **Cold start latency for Pages Functions** — First request after idle period can take 100-300ms (vs <10ms hot). For financial dashboard, this is acceptable but noticeable to users on initial load.

4. **Local dev (`wrangler dev`) ≠ production Workers Runtime** — Subtle API differences (e.g., `fetch` behavior, `crypto` implementations) between local workerd and production may surface only after deployment, complicating debugging.

5. **Cost surprises at growth** — Free tier caps at 100k requests/day. CSV upload + processing flow generates 5-10 requests per user session; 20k sessions/month exhausts free tier. Workers Paid ($5/mo base + usage) is reasonable, but overages could surprise if not monitored.

### Pre-Mortem — How This Could Fail

The team deployed ProfitLeak on Cloudflare Pages in May 2026. By November, it was a disaster.

First sign: a user uploading a 2000-row invoice CSV hit the 30-second timeout, cutting margin calculations in half. The team tried optimizing code, but the issue was structural — edge runtime isn't built for batch processing. Rewriting to use Durable Objects took a week and doubled code complexity.

Second issue appeared during month 3 when integrating a payment provider. The npm library used `stream` APIs unsupported by Workers Runtime. The team spent days hunting for edge-compatible alternatives, ultimately moving payment flow to a separate Cloudflare Worker with Node.js compatibility mode, duplicating the deployment pipeline.

Third blow: debugging production issues became a nightmare. Logs in Cloudflare Dashboard lagged 5-10 minutes, and `wrangler tail` didn't work for Pages Functions (only pure Workers). The team lost hours reproducing bugs locally that only occurred in production.

By year-end, they rewrote the frontend for Vercel (full Node.js) and used Cloudflare only for CDN. MVP scope wasted fighting the platform.

### Unknown Unknowns

1. **Pages Functions are Workers, but with limitations** — You don't get full Workers API access (e.g., Durable Objects require upgrading to Workers Paid; they don't "just work" with Pages). Pages vs Workers docs are split, easy to miss differences.

2. **Supabase Connection Pooling is critical on edge** — Edge runtime lacks persistent connections; every request opens a new socket to Supabase. Without Supabase Connection Pooler (Supavisor), you'll exhaust connection limits at ~50 concurrent users. This isn't obvious from Cloudflare or Supabase docs separately.

3. **`wrangler.toml` vs `astro.config.mjs` configuration clash** — Astro adapter auto-generates Cloudflare config, but if you have an existing `wrangler.toml` (for secrets, env vars, compatibility dates), they can conflict. Deployment may silently ignore settings in one file.

4. **Preview deployments are public by default** — Every GitHub PR generates a public preview URL (`<hash>.pages.dev`). If CSVs contain sensitive client financials, preview without Cloudflare Access is a data leak risk. Requires manual Access policy setup.

5. **Rollback is not atomic** — `wrangler rollback` reverts code but **not** environment variables or secrets. If deployment introduced a new secret (e.g., API key), rollback leaves the new secret active, potentially breaking old code expecting the prior value.

## Operational Story

Day-to-day operations on Cloudflare Pages for this stack:

- **Preview deploys**: Every GitHub PR to `master` branch auto-deploys to `<pr-hash>.<project>.pages.dev`. Previews are public by default; protect sensitive CSVs by configuring Cloudflare Access (requires Cloudflare Zero Trust setup, ~10 min one-time config). Fork PRs from external contributors do not auto-deploy (security default).

- **Secrets**: Environment variables set via `wrangler secret put <NAME>` (encrypted Workers Secrets) or in Cloudflare Dashboard → Pages → Settings → Environment variables. Secrets are scoped per environment (production / preview). GitHub Actions cannot read Workers Secrets; use GitHub repository secrets for CI build-time vars (e.g., `SUPABASE_URL`). Rotation: delete old secret, `wrangler secret put` new value, redeploy.

- **Rollback**: `wrangler rollback --deployment-id <ID>` (find ID via `wrangler deployments list`). Rollback is code-only; env vars and secrets stay at current values. Typical time-to-revert: <1 minute. Caveat: database migrations (Supabase) don't auto-rollback; handle schema changes separately.

- **Approval**: Human-only actions: deleting a Pages project, rotating production secrets for critical APIs (payment, auth), enabling Cloudflare Access on previews. Agent-allowed: deploy to preview/production, read logs, tail live requests, list deployments, set non-critical env vars.

- **Logs**: `wrangler tail` for live request streaming (production or preview). `wrangler pages deployment tail <deployment-id>` for historical logs (last 24 hours). Cloudflare Dashboard → Analytics → Logs (web UI, 5-10 min lag). For structured MCP access: use Cloudflare Workers MCP Server's observability tools to query logs programmatically.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| CSV processing hits 30s CPU timeout | Devil's advocate #1 | Medium | High | Chunk large CSVs into batches (<500 rows/request) or offload heavy computation to Cloudflare Queues. Test with realistic data sizes (2000+ rows) before production. |
| npm package incompatible with Workers Runtime | Devil's advocate #2 | Medium | Medium | Audit critical dependencies for Node-specific APIs (`fs`, `child_process`). Use `wrangler dev` + production test deploy early to catch runtime errors. Maintain list of known-incompatible packages. |
| Cold start latency noticeable to users | Devil's advocate #3 | High | Low | Accept 100-300ms first-load penalty (typical for serverless). Optimize bundle size (code-split React components). Consider warming function via periodic health-check request if critical. |
| Local dev vs production API divergence | Devil's advocate #4 | Medium | Medium | Deploy to preview environment early and often. Use preview URLs for testing, not just local `wrangler dev`. Document known differences (e.g., `crypto.randomUUID()` behavior). |
| Free tier exhausted faster than expected | Devil's advocate #5 | Medium | Low | Monitor Cloudflare Dashboard analytics weekly. Set up billing alert at 80% of 100k req/day. Workers Paid ($5/mo) is next tier, plan transition before hitting limit. |
| Durable Objects needed but cost extra | Pre-mortem | Low | Medium | MVP avoids Durable Objects (stateless per Q1). If background jobs emerge post-MVP, budget Workers Paid + Durable Objects cost (~$5-10/mo at low scale). |
| Payment integration requires Node.js compatibility mode | Pre-mortem | Low | High | Test payment library compatibility early (week 1). If blocked, use Cloudflare Worker with Node.js compat flag or move payment flow to separate service (e.g., Supabase Edge Function). |
| Production debugging hampered by log lag | Pre-mortem | Medium | Medium | Use `wrangler tail` for live debugging (not Dashboard). Set up structured logging (JSON output) parseable by MCP tools. Retain critical errors in external log aggregator (e.g., Sentry, Axiom). |
| Supabase connection exhaustion on edge | Unknown unknowns #2 | High | High | **Critical**: Enable Supabase Connection Pooler (Supavisor) in Supabase Dashboard → Settings → Database → Connection Pooling. Use pooler connection string (port 6543) in `SUPABASE_URL`. Test under load (50+ concurrent users). |
| Preview deployment leaks sensitive CSV data | Unknown unknowns #4 | Medium | High | Configure Cloudflare Access policy on preview subdomains (one-time setup: Cloudflare Dashboard → Zero Trust → Access → Applications → Add). Require email auth or IP allowlist for preview access. |
| Rollback doesn't revert secrets | Unknown unknowns #5 | Low | Medium | Document secret change history manually (e.g., in git commit message when rotating). Test rollback in preview environment before production. Avoid coupling code deploy with secret rotation. |
| `wrangler.toml` vs Astro config conflict | Unknown unknowns #3 | Low | Low | Let Astro adapter generate config initially. If adding custom `wrangler.toml`, review Astro-generated output first (`.output/` folder post-build). Document precedence rules. |

## Getting Started

Concrete first steps to deploy ProfitLeak to Cloudflare Pages:

1. **Install Wrangler CLI**: `npm install -g wrangler` (or use `npx wrangler` for project-local).

2. **Authenticate Wrangler**: `wrangler login` (opens browser OAuth flow to Cloudflare account).

3. **Verify Astro adapter**: Confirm `astro.config.mjs` includes `import cloudflare from '@astrojs/cloudflare'` and `adapter: cloudflare()`. Already present per tech-stack.md.

4. **Enable Supabase Connection Pooler** (critical): Supabase Dashboard → Settings → Database → Connection Pooling → Enable. Copy pooler connection string (port 6543). Update `.env` / `.dev.vars` with pooler URL.

5. **Build locally**: `npm run build` (output to `.output/` folder; adapter generates Pages-compatible structure).

6. **Create Pages project**: `wrangler pages project create profitleak` (or use Cloudflare Dashboard → Pages → Create project → Connect to Git for GitHub auto-deploy).

7. **First deploy**: `wrangler pages deploy .output/` (deploys `.output/` folder to Cloudflare Pages). Note the deployed URL (e.g., `profitleak-abc.pages.dev`).

8. **Set production secrets**: `wrangler secret put SUPABASE_URL` (paste pooler connection string), `wrangler secret put SUPABASE_KEY` (paste service role key from Supabase).

9. **Configure GitHub auto-deploy** (optional): Cloudflare Dashboard → Pages → profitleak → Settings → Builds & deployments → Connect GitHub repository. Set build command `npm run build`, output directory `.output/`.

10. **Test with realistic CSV**: Upload 500-1000 row invoice CSV through deployed app. Monitor request time in `wrangler pages deployment tail <id>` to verify CPU limits aren't hit.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration (Cloudflare Pages doesn't use Docker)
- CI/CD pipeline setup beyond auto-deploy (GitHub Actions workflows for tests/linting)
- Production-scale architecture (multi-region failover, dedicated enterprise support, 99.99% SLA)
- Cost projections beyond 12 months or >1M requests/month
