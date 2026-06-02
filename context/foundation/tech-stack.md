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

## Why this stack

ProfitLeak to aplikacja webowa budowana solo z 3-tygodniowym terminem, wymagająca autentykacji, bazy danych do przechowywania CSV oraz obliczeń finansowych, i interfejsu dashboardu. 10x Astro Starter dostarcza wszystkie te wymagania od razu: Supabase zapewnia PostgreSQL + auth (zgodnie z FR-001, FR-002), Astro + React obsługują UI (dashboard w FR-018–FR-020), TypeScript + Zod gwarantują przyjazne agentom jawne kontrakty na granicach danych, a Cloudflare Pages umożliwia szybkie wdrożenie na edge. Opiniodawczy charakter full-stacku redukuje zmęczenie decyzyjne i narzut konfiguracyjny, kluczowe dla ciasnego terminu MVP i kontekstu solo.
