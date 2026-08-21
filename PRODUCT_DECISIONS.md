# Booker Journal Product Decisions

Last updated: 2026-08-21

This document records the operating assumptions that guide implementation
tradeoffs.

## Product role

Booker Journal is a small internal operational tool for one business owner. It
tracks customer activity, balances, inventory, and approximate profitability.
It is not intended to produce statutory accounts or immutable financial
statements.

## Shared views

- Shared links are password-protected, expiring, read-only live portals.
- Viewers see current database data when they refresh.
- Every new live response is encrypted with a fresh AES-256-GCM key. That key
  is wrapped to an ephemeral RSA-OAEP key generated in the viewer’s browser,
  so the JSON response is decrypted only in that browser after unlock.
- Shared links have one mode only: password-protected, live, and encrypted per
  response. Snapshot and passwordless compatibility modes are not retained.
- A date-scoped link is a filtered activity view.
- Its Activity Balance is the net change caused by visible entries, not the
  project’s complete current balance.
- Public responses expose only fields needed by the customer-facing view.

## Balances and inventory

- Sales use negative prices and payments use positive prices.
- Displayed project balance is `-Σ(amount × price)`.
- Positive project balance means the customer owes money.
- Negative project balance means the customer has credit.
- Negative inventory is allowed intentionally and acts as a restocking signal.

## Precision

- PostgreSQL `numeric` columns store transactional source values.
- Derived calculations use JavaScript numbers and may contain small rounding
  differences.
- Accounting-grade decimal arithmetic, FIFO/LIFO costing, and stock enforcement
  are non-goals for now.

## Correctness guarantees

- Compound writes are atomic: project plus optional opening adjustment, and sale
  plus immediate payment, use Drizzle database transactions.
- Core balance, inventory, date, immediate-payment, and moving-average metrics
  behavior is covered by focused regression tests.

## Tenancy and deployment

- The first registered account is the one approved administrator. Later internal
  accounts can register only when `ALLOW_USER_SIGNUP=true` and cannot sign in
  until the administrator approves them. Customers do not have accounts.
- Ownership checks remain in place as inexpensive defense in depth.
- Deployment is single-instance, so process-local shared-link unlock throttling
  is accepted. Its tracked-key map has a hard bound, and successful unlocks
  create a two-minute access session by default, configurable via
  `SHARED_LINK_ACCESS_TOKEN_TTL_MS`.
