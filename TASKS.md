# Production Readiness Tasks

Last updated: 2026-01-14

This file tracks step-by-step work to make Booker Journal production-ready for the intended deployment model:

- Single admin (you)
- Customers access data only via expiring, date-scoped shared links

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done

## Phase 0 — Clarify Spec

- [x] Align spec with single-admin + shared-link model
- [~] Resolve sign conventions across UI/docs/code

## Phase 1 — Correctness (High Priority)

- [x] Fix project creation “initial balance” semantics (user-facing positive = customer owes)
- [x] Make entry “total” display consistent with balance convention (admin + shared link views)
- [~] Update README to match actual behavior (balance formula, initial balance sign, docker compose file)
- [x] Tighten validation/comments where they mislead (e.g., sale product requirement wording)

## Phase 2 — Security & Configuration

- [x] Enforce `BETTER_AUTH_SECRET` in production builds
- [x] Configure `trustedOrigins` from `NEXT_PUBLIC_APP_URL` (and/or env list)
- [~] Ensure shared links enforce expiration + optional date range (audit edge cases: inclusive ranges, timezones)

## Phase 3 — Operational Readiness

- [ ] Add minimal runtime logging conventions (no secrets), prefer server-side errors surfaced in UI
- [x] Fix `db:seed` script typing/lint so it stays CI-safe
- [ ] Confirm DB migration + seed flows are deterministic and documented
- [ ] Add “production checklist” section to README (env vars, DB, backups)

### Build warnings to address

- [x] Next.js build warns about wrong workspace root due to an external lockfile; set `turbopack.root` or remove the stray lockfile

## Notes / Decisions

- Ledger convention: store `sale` prices as negative, `payment` prices as positive.
- Displayed balance: `balance = -Σ(amount × price)` so that “customer owes” is positive.
- User-facing “initial balance” input should be: positive = customer owes, negative = customer credit.
