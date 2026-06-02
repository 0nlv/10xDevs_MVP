---
deployment_plan_version: 1
created: 2026-05-22
platform: Cloudflare Pages
status: in-progress
critical_dependencies:
  - Supabase Connection Pooler (MUST enable first)
  - Cloudflare account
  - Wrangler CLI authenticated
estimated_time: 30-45 min (first deploy)
---

# Deployment Plan: ProfitLeak → Cloudflare Pages

**Goal**: Deploy MVP ProfitLeak (Astro 6 + React 19 + Supabase) to Cloudflare Pages with full auth + database functionality, verified and production-ready.

**Based on**: `context/foundation/infrastructure.md` + `context/foundation/tech-stack.md`

---

## Prerequisites (Pre-flight Checks)

**Must be ready BEFORE starting:**

- [ ] Cloudflare account (free tier OK) — signup at cloudflare.com if needed
- [ ] Supabase project created — local `npx supabase start` OR cloud project
- [ ] GitHub repository — if using auto-deploy, repo must be on GitHub
- [ ] Local build passes — `npm run build` works without errors
- [ ] Local dev works — `npm run dev` with `.env` / `.dev.vars` configured

**Critical config verified:**
- ✓ `astro.config.mjs` contains `@astrojs/cloudflare` adapter (from tech-stack.md)
- ✓ `package.json` contains `wrangler` in devDependencies (from bootstrap)

---

## Deployment Pipeline

### Phase 1: Supabase Connection Pooler Setup ⚠️ CRITICAL — DO FIRST

**Why first**: Infrastructure.md Risk Register flags "High likelihood / High impact" risk if pooler NOT enabled. Edge runtime exhausts connections at ~50 concurrent users without pooler.

**Steps:**
1. Login to Supabase Dashboard
   - Cloud: https://supabase.com/dashboard
   - Local: http://127.0.0.1:54323
2. Navigate: Settings → Database → Connection Pooling
3. Click "Enable Connection Pooling" (creates Supavisor pooler)
4. Copy **pooler connection string** (port **6543**, NOT default 5432)
   - Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
5. Update `.env` AND `.dev.vars`:
   ```bash
   SUPABASE_URL=<pooler connection string with port 6543>
   SUPABASE_KEY=<service_role key from Supabase Dashboard → Settings → API>
   ```
6. **Verify locally**: 
   ```bash
   npm run dev
   ```
   - Navigate to http://localhost:4321/auth/signin
   - Test auth flow
   - Check Supabase Dashboard → Database → Logs for pooled connections

**Dependencies**: None (first step)

**Verification**: ✓ Pooler connection string contains `:6543`, ✓ local auth works

---

### Phase 2: Wrangler CLI Setup

**Steps:**
1. Install Wrangler globally:
   ```bash
   npm install -g wrangler
   ```
   - Alternative: use `npx wrangler` for all commands (no global install)
2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```
   - Opens browser OAuth flow
   - Grants CLI access to your Cloudflare account
3. **Verify authentication**:
   ```bash
   wrangler whoami
   ```
   - Should display your Cloudflare account email

**Dependencies**: Phase 1 complete (pooler URL ready for secrets in Phase 5)

**Verification**: ✓ `wrangler whoami` shows correct email

---

### Phase 3: Build Verification

**Steps:**
1. Clean build:
   ```bash
   Remove-Item -Recurse -Force .output, dist, node_modules/.astro -ErrorAction SilentlyContinue
   npm run build
   ```
2. **Check output structure**:
   - `.output/_worker.js` exists (Cloudflare Pages adapter output)
   - `.output/_routes.json` exists (routing manifest)
3. **Test build locally**:
   ```bash
   npm run preview
   ```
   - Should start on http://localhost:4321 (or similar)
   - Navigate to /auth/signin → verify page loads
   - Check browser console for errors
4. Stop preview (Ctrl+C)

**Dependencies**: Phase 2 complete

**Verification**: 
- ✓ Build completes without errors
- ✓ `.output/` folder populated with `_worker.js` and `_routes.json`
- ✓ Preview runs without console errors

---

### Phase 4: Create Cloudflare Pages Project

**Two paths — pick ONE:**

#### Path A: Manual via Wrangler (Recommended for first deploy)

**Steps:**
1. Create Pages project:
   ```bash
   wrangler pages project create profitleak
   ```
   - When prompted for production branch: enter `master` (or `main`)
2. **Verify project created**:
   ```bash
   wrangler pages project list
   ```
   - Should show `profitleak` in list

**Verification**: ✓ Project appears in `wrangler pages project list`

#### Path B: GitHub Auto-Deploy (For ongoing CI/CD)

**Steps:**
1. Cloudflare Dashboard → Pages → Create project → Connect to Git
2. Authorize Cloudflare to access GitHub repository
3. Select repository: `<your-username>/profitleak`
4. Configure build settings:
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Build output directory: `.output`
   - Root directory: `/` (leave default)
5. **Environment variables** (add in dashboard — build-time only):
   - `NODE_VERSION`: `22`
   - **DO NOT** add `SUPABASE_URL` or `SUPABASE_KEY` here (they go via wrangler secret in Phase 5)
6. Click "Save and Deploy"

**Note**: Path B triggers auto-build on GitHub push. Path A is manual deploys only. For MVP, **Path A recommended** for control; migrate to Path B after first deploy verified.

**Dependencies**: Phase 3 complete

---

### Phase 5: Set Production Secrets ⚠️ CRITICAL

**CRITICAL**: Secrets are scoped per environment (production vs preview). Set production first.

**Steps:**
1. Set Supabase URL:
   ```bash
   wrangler secret put SUPABASE_URL --env production
   ```
   - When prompted, paste pooler connection string (port 6543) from Phase 1
   - Confirm: should say "Secret SUPABASE_URL uploaded successfully"

2. Set Supabase Key:
   ```bash
   wrangler secret put SUPABASE_KEY --env production
   ```
   - Paste **service_role key** from Supabase Dashboard → Settings → API → service_role
   - **NOT** anon key — service_role has admin privileges, needed for SSR
   - Confirm: "Secret SUPABASE_KEY uploaded successfully"

3. **Verify secrets set**:
   ```bash
   wrangler secret list
   ```
   - Should show both `SUPABASE_URL` and `SUPABASE_KEY` (values hidden for security)

**Dependencies**: Phase 4 (Path A) complete

**Security note**: Service role key has admin privileges; NEVER expose client-side. Astro SSR keeps it server-only per `astro:env/server` imports.

**Verification**: ✓ Both secrets appear in `wrangler secret list`

---

### Phase 6: First Deploy

**Steps:**
1. Deploy to Cloudflare Pages:
   ```bash
   wrangler pages deploy .output/
   ```
   - If prompted for project name, enter: `profitleak`
   - Watch output for:
     - ✓ Uploading... (progress bar)
     - ✓ Deployment complete
     - URL printed (e.g., `https://profitleak-abc.pages.dev`)
2. **Capture deployment URL** — copy to clipboard or save in notes
3. **Capture deployment ID**:
   ```bash
   wrangler pages deployment list
   ```
   - Get latest deployment ID from list (topmost entry)

**Dependencies**: Phase 5 complete

**Expected output:**
```
✨ Deployment complete! Take a peek over at https://abc123.profitleak.pages.dev
```

**Verification**: ✓ Deployment URL accessible

---

## Post-Deploy Verification (Must ALL Pass)

**Run all checks — deployment is NOT complete until these pass:**

### V1: Health Check (Basic)
1. Open deployment URL in browser (incognito/private mode to avoid cache)
2. Homepage loads without errors (check status code = 200)
3. Browser console (F12) — no 500 errors, no missing assets (404s)
4. Navigate to `/auth/signin` → page renders correctly

**Pass criteria**: ✓ Homepage loads, ✓ No console errors, ✓ Auth page renders

---

### V2: Auth Flow (Critical Path)
1. Click "Sign Up" (or navigate to signup page)
2. Enter test email + password
3. Submit form
4. **Expected**: Supabase sends confirmation email OR shows "Check your email" message
5. **If local Supabase**: Check InBucket at http://127.0.0.1:54324 for confirmation email
6. **If cloud Supabase**: Check your email inbox
7. Click confirmation link → should redirect to app with user logged in
8. Verify user session persists (refresh page, still logged in)

**Pass criteria**: ✓ Signup flow completes, ✓ Email sent, ✓ Confirmation works, ✓ Login persists

---

### V3: Database Connection (Critical)
1. After auth flow (V2), open Supabase Dashboard → Database → Logs
2. **Expected**: See queries from your deployed app
   - Source IP: Cloudflare edge IPs (not your local IP)
   - Connection port: **6543** (pooler), NOT 5432
3. Filter logs by last 5 minutes
4. Look for INSERT/SELECT queries related to auth tables

**Pass criteria**: ✓ Queries visible from Cloudflare IPs, ✓ Port 6543 confirmed

---

### V4: Performance Check
1. Open deployment URL in browser
2. Open DevTools (F12) → Network tab
3. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. **Check timings**:
   - First request (document): < 1s (cold start may be 100-300ms per infrastructure.md)
   - Subsequent requests: < 100ms
   - Static assets (CSS/JS): < 200ms
5. **If >1s consistently**: Investigate bundle size or cold start issue

**Pass criteria**: ✓ First load <1s, ✓ Subsequent <100ms

---

### V5: Logs Access
1. In terminal:
   ```bash
   wrangler pages deployment tail <deployment-id>
   ```
   - Use deployment ID from Phase 6
2. In browser: Navigate around app (click links, trigger auth actions)
3. **Expected**: Live request logs appear in terminal in real-time
   - Format: timestamp, HTTP method, path, status code
4. **If no logs**: Verify deployment ID is correct (`wrangler pages deployment list`)

**Pass criteria**: ✓ Live logs visible, ✓ Logs correlate with browser actions

---

### V6: Secrets Verification
1. **Temporary diagnostic** — add to `src/middleware.ts` (REMOVE AFTER TEST):
   ```typescript
   console.log('ENV check:', {
     hasSupabaseUrl: !!import.meta.env.SUPABASE_URL,
     hasSupabaseKey: !!import.meta.env.SUPABASE_KEY
   });
   ```
2. Redeploy:
   ```bash
   npm run build
   wrangler pages deploy .output/
   ```
3. Check logs:
   ```bash
   wrangler pages deployment tail <new-deployment-id>
   ```
4. Navigate app in browser
5. **Expected output in logs**:
   ```
   ENV check: { hasSupabaseUrl: true, hasSupabaseKey: true }
   ```
6. **IMPORTANT**: Remove diagnostic log after verification (never log secrets, even existence checks in production)

**Pass criteria**: ✓ Both env vars present, ✓ Diagnostic removed post-check

---

## Rollback Plan

**If deployment fails or breaks critical functionality:**

### Immediate Rollback (Code Only)
1. List previous deployments:
   ```bash
   wrangler pages deployment list
   ```
   - Find second-to-last entry (last = current broken deploy)
2. Rollback to previous:
   ```bash
   wrangler rollback --deployment-id <previous-working-id>
   ```
3. Verify: Deployment URL now serves previous version
4. **Time to revert**: < 1 minute

**⚠️ Caveat from infrastructure.md**: Rollback does NOT revert secrets or env vars. If Phase 5 introduced a new secret, rollback leaves it active (may break old code expecting prior value).

---

### Full Rollback (Code + Secrets)
1. Execute code rollback (above)
2. Restore old secret value:
   ```bash
   wrangler secret put SUPABASE_URL --env production
   ```
   - Paste previous value when prompted
3. Repeat for `SUPABASE_KEY` if changed
4. Delete broken deployment:
   ```bash
   wrangler pages deployment delete <broken-deployment-id>
   ```

---

### Nuclear Option (Complete Reset)
1. Delete entire Pages project:
   ```bash
   wrangler pages project delete profitleak
   ```
   - Confirm when prompted
2. Re-run from Phase 4

---

## Post-Deploy Tasks

**After all verification checks pass:**

1. **Document deployed URL** — add to this file:
   - Production URL: `https://<captured-from-phase-6>.pages.dev`
   - Deployment ID: `<captured-from-phase-6>`
   - Deployed at: `<timestamp>`

2. **Configure custom domain** (optional, future):
   - Cloudflare Dashboard → Pages → profitleak → Custom domains
   - Add domain, follow DNS setup wizard

3. **Set up monitoring** (recommended):
   - Cloudflare Dashboard → Analytics → Web Analytics
   - Enable for `profitleak.pages.dev`
   - Note baseline: 0 users initially

4. **Configure preview environment secrets** (if using GitHub auto-deploy):
   ```bash
   wrangler secret put SUPABASE_URL --env preview
   wrangler secret put SUPABASE_KEY --env preview
   ```
   - Use same pooler URL (or separate Supabase preview project)

5. **Enable Cloudflare Access for previews** (if CSVs contain sensitive data):
   - Cloudflare Dashboard → Zero Trust → Access → Applications → Add application
   - Application domain: `*.profitleak.pages.dev`
   - Policy: Require email from allowlist or specific domain
   - **Time**: ~10 minutes one-time setup
   - **Benefit**: Prevents public preview URLs from leaking sensitive CSV data

---

## Known Issues & Mitigations

*From infrastructure.md Risk Register*

| Risk | Mitigation in This Plan |
|---|---|
| Supabase connection exhaustion (High/High) | ✓ Phase 1 enforces pooler setup FIRST before any deploy |
| CSV processing timeout 30s (Medium/High) | Monitor via V4 performance check; chunk CSV in future if >30s |
| npm package incompatible with Workers Runtime (Medium/Medium) | Caught in Phase 3 build verification; audit deps if build fails |
| Preview deployment data leak (Medium/High) | Post-deploy task #5 addresses with Cloudflare Access |
| Secrets not rolled back (Low/Medium) | Rollback plan documents manual secret restoration steps |
| Local dev ≠ production (Medium/Medium) | V5 logs verification catches runtime-only issues early |

---

## Success Criteria

**Deployment is COMPLETE when:**

- ✓ All 6 verification checks (V1-V6) pass
- ✓ Deployment URL publicly accessible
- ✓ Auth flow works end-to-end (signup → email → login → session persists)
- ✓ Supabase logs confirm pooled connections (port 6543)
- ✓ Live logs accessible via `wrangler pages deployment tail`
- ✓ Rollback plan tested (optional but recommended: deploy intentional break, rollback, verify)

**Estimated time**: 
- First deploy: 30-45 minutes (including account setup, pooler config)
- Subsequent deploys: < 5 minutes

---

## Next Steps (After First Deploy)

1. **CI/CD automation** (if not using GitHub auto-deploy yet):
   - Migrate from Phase 4 Path A → Path B for auto-deploy on git push
   - Add GitHub Actions workflow for lint/test before deploy
   - Template: `.github.scaffold/workflows/ci.yml` (from bootstrap)

2. **Implement first feature** (from PRD):
   - FR-003: CSV upload UI
   - FR-004: CSV parsing & validation logic
   - FR-006: Data preview table

3. **Enhanced monitoring**:
   - Sentry or Axiom for error tracking (infrastructure.md recommends)
   - Cloudflare Analytics for traffic patterns
   - Set billing alert at 80% of 100k req/day free tier

4. **Security hardening**:
   - Review Supabase RLS policies (AGENTS.md critical rule)
   - Enable Cloudflare Access on preview deployments
   - Rotate service_role key to project-specific key (not master key)

---

## Deployment Log

**Execution started**: 2026-05-22

| Phase | Status | Notes | Timestamp |
|---|---|---|---|
| Phase 1: Supabase Pooler | Pending | Awaiting user action | - |
| Phase 2: Wrangler Setup | Pending | - | - |
| Phase 3: Build Verification | Pending | - | - |
| Phase 4: Create Project | Pending | - | - |
| Phase 5: Set Secrets | Pending | - | - |
| Phase 6: Deploy | Pending | - | - |
| V1: Health Check | Pending | - | - |
| V2: Auth Flow | Pending | - | - |
| V3: Database Connection | Pending | - | - |
| V4: Performance | Pending | - | - |
| V5: Logs Access | Pending | - | - |
| V6: Secrets Verification | Pending | - | - |

---

**Plan saved**: `context/deployment/deploy-plan.md`  
**Ready to execute**: YES  
**Next action**: Begin Phase 1 (Supabase Connection Pooler setup)
