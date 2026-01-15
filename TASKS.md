# Production Readiness Tasks

Last updated: 2026-01-15

This file tracks step-by-step work to make Booker Journal production-ready for the intended deployment model:

- Single admin (you)
- Customers access data only via expiring, date-scoped shared links

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done

## Phase 0 — Clarify Spec

- [x] Align spec with single-admin + shared-link model
- [x] Resolve sign conventions across UI/docs/code

## Phase 1 — Correctness (High Priority)

- [x] Fix project creation “initial balance” semantics (user-facing positive = customer owes)
- [x] Make entry “total” display consistent with balance convention (admin + shared link views)
- [x] Update README to match actual behavior (balance formula, initial balance sign, docker compose file, default port)
- [x] Tighten validation/comments where they mislead (e.g., sale product requirement wording)

## Phase 2 — Security & Configuration

- [x] Enforce `BETTER_AUTH_SECRET` in production builds
- [x] Configure `trustedOrigins` from `NEXT_PUBLIC_APP_URL` (and/or env list)
- [x] Ensure shared links enforce expiration + optional date range (audit edge cases: inclusive ranges, timezones)
- [x] Make app port configurable (default `PORT=3005`) and derive `NEXT_PUBLIC_APP_URL`

## Phase 3 — Operational Readiness

- [x] Add minimal runtime logging conventions (no secrets), prefer server-side errors surfaced in UI
- [x] Fix `db:seed` script typing/lint so it stays CI-safe
- [x] Fix `db:seed` script not exiting (close DB client so process exits)
- [x] Fix seeded login regression (store password hashes in better-auth format)
- [x] Confirm DB migration + seed flows are deterministic and documented
- [x] Add “production checklist” section to README (env vars, DB, backups)

### Build warnings to address

- [x] Next.js build warns about wrong workspace root due to an external lockfile; set `turbopack.root` or remove the stray lockfile

## UI/UX Improvements Backlog

### Entries sorting persistence

- [x] Persist entry sort in URL
  - Add a `sort` search param (e.g. `timestamp_desc|timestamp_asc`) to project pages and shared-link pages.
  - Read it on load, use it as the source of truth, and update it when the user changes the sort.
  - Ensure project navigation links preserve current search params so switching projects keeps the same sort choice.
- [x] Remember sort preference locally
  - Optionally mirror `sort` to `localStorage` (keyed by user + view, e.g. `entriesSort:dashboardProject`).
  - Use URL param when present; otherwise fall back to stored preference.

### Entries list usability

- [x] Entries table header affordances
  - Make the date column header clickable with a clear chevron indicator.
  - Add a small label like “Sorted by Date (Newest)” and a one-click reset to default.
- [x] Filter state clarity
  - Show active filters (date range, type, product) as removable chips above the list.
  - Include a “Clear all” action.

### Navigation & feedback

- [x] Project switcher UX
  - Preserve current view state via search params (sort/filter/tab) when switching projects.
  - Consider a project switcher dropdown on the project detail page.
- [x] Loading and empty states
  - Add skeleton/loading placeholders for Entries/Metrics/Inventory tabs.
  - Add a more helpful empty state CTA (e.g., “Create first sale/payment”).

### Clarity & sharing

- [x] Balance and totals polish
  - Standardize currency formatting and color semantics (owed vs credit).
  - Add tooltips explaining what totals mean (given the ledger convention).
- [x] Shared link UX improvements
  - Clarify date-range selector behavior (inclusive range).
  - Show “Data through …” timestamp.
  - Optional print/export-friendly layout.

## Notes / Decisions

- Ledger convention: store `sale` prices as negative, `payment` prices as positive.
- Displayed balance: `balance = -Σ(amount × price)` so that “customer owes” is positive.
- User-facing “initial balance” input should be: positive = customer owes, negative = customer credit.
