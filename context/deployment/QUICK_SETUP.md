# Quick Setup & Deployment Guide

## 🚀 One-Time Setup

### 1. Authenticate with Cloudflare
```bash
npx wrangler login
# Opens browser for OAuth - click to authorize
```

### 2. Add Environment Variables
In Cloudflare Dashboard (https://dash.cloudflare.com/):
1. Workers & Pages → profitleak → Settings → Variables and secrets
2. Add `SUPABASE_URL` and `SUPABASE_KEY` (get from Supabase Dashboard → Settings → API)
3. ⚠️ Never commit credentials to git
4. Save

### 3. Local Development
```bash
# Copy example env file
cp .env.example .dev.vars

# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev
```

---

## 📦 Deploy New Changes

### Quick Deploy (after git push)
```bash
# 1. Build locally
npm run build

# 2. Deploy to Workers
npx wrangler deploy

# 3. Verify
# Open: https://profitleak.k4zetpl.workers.dev/
```

### Full Deployment Checklist
- [ ] Make code changes
- [ ] Run `npm run lint` (no errors)
- [ ] Run `npm run build` (successful)
- [ ] Test locally with `npm run dev`
- [ ] Commit: `git add . && git commit -m "..."`
- [ ] Push: `git push`
- [ ] Deploy: `npx wrangler deploy`
- [ ] Verify: https://profitleak.k4zetpl.workers.dev/

---

## 🔐 Secrets Management

### Production (Cloudflare Workers)
Set in Dashboard → Variables and secrets:
- Never commit secrets to git
- Rotate `SUPABASE_KEY` if exposed

### Local Development (.dev.vars)
- **Gitignored** ✅
- Created from `.env.example`
- Only for local testing

### GitHub Secrets (CI/CD)
Not currently used. If setting up automated deployment:
1. Go: https://github.com/0nlv/10xDevs_MVP/settings/secrets
2. Add same variables as Cloudflare

---

## 🛠️ Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Quality
npm run lint             # Check TypeScript & ESLint
npm run lint:fix         # Auto-fix issues
npm run format           # Format code with Prettier

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests (Playwright)

# Deployment
npx wrangler deploy      # Deploy to Cloudflare Workers
npx wrangler tail        # View live logs
```

---

## 📊 Monitoring

### View Deployment Status
1. https://dash.cloudflare.com/
2. Workers & Pages → profitleak
3. Deployments tab

### View Logs
```bash
# Tail real-time logs
npx wrangler tail --follow

# Or via Dashboard → profitleak → Logs
```

### Check Health
```bash
npx wrangler whoami      # Verify authentication
npm run build            # Verify code builds
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not authenticated" | Run `npx wrangler login` |
| Build fails | Run `npm install` and `npm run lint` |
| Supabase error | Check SUPABASE_URL and SUPABASE_KEY in Workers Settings |
| 404 errors | Verify `dist/client/_routes.json` exists after build |
| Changes not live | Run full build + deploy: `npm run build && npx wrangler deploy` |

---

## 📝 Environment File Reference

### .env.example / .dev.vars Format
```
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_KEY=[your-anon-public-key]
```

**How to get these:**
1. Supabase Dashboard → Your Project → Settings → API
2. Copy "Project URL" and "anon public" API Key
3. ⚠️ Never share or commit these to git

### Cloudflare Workers Settings
Same variables, added via Dashboard (not file-based)

---

## 🔗 Useful Links

- **App:** https://profitleak.k4zetpl.workers.dev/
- **Dashboard:** https://dash.cloudflare.com/
- **GitHub:** https://github.com/0nlv/10xDevs_MVP
- **Supabase:** https://supabase.com/dashboard
- **Astro Docs:** https://docs.astro.build/
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/

---

## ⚠️ Important Notes

- **Git:** Always push before deploying (for CI audit trail)
- **Secrets:** Never commit `.dev.vars` or expose API keys
- **Builds:** Always run `npm run build` locally before deploying
- **Logs:** Check Cloudflare dashboard for production errors
