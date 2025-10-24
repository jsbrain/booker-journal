# Booker Journal - AI Agent Instructions

## Project Overview

A Next.js 16 journal management system with project-based accounting. Uses **Bun** as the exclusive runtime and package manager, **better-auth** for authentication, **Drizzle ORM** with PostgreSQL, and **TypeBox** for validation.

## Critical: Bun-Only Environment

**This project uses Bun exclusively. Never use npm, yarn, or pnpm.**

- Install dependencies: `bun install` (never `npm install`)
- Run scripts: `bun run <script>` or `bun <script>`
- Execute files: `bun run file.ts`
- Add packages: `bun add <package>` (never `npm install`)
- Dev dependencies: `bun add -d <package>`

The `package.json` specifies `"packageManager": "bun"` - respect this constraint.

## Critical Architecture Patterns

### Validation Flow (STRICT - Do NOT deviate)

```
Drizzle Schema (lib/db/schema.ts) → TypeBox Schema (lib/db/validation.ts) → Extended Schemas → Inferred Types → Validation
```

**Example pattern:**

```typescript
// 1. Define Drizzle schema (source of truth)
export const projects = pgTable("projects", { ... });

// 2. Derive TypeBox schema with drizzle-typebox
export const selectProjectSchema = createSelectSchema(projects);

// 3. Extend for API validation
export const createProjectInputSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  initialAmount: Type.Number(),
});

// 4. Infer types
export type CreateProjectInput = Static<typeof createProjectInputSchema>;

// 5. Validate in server actions
validate(createProjectInputSchema, data);
```

**Never:** Create validation schemas without deriving from Drizzle. **Always:** Start with Drizzle, derive TypeBox, extend as needed.

### Server Actions Pattern

All data mutations use Next.js Server Actions in `lib/actions/*.ts`:

```typescript
'use server'

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user
}

export async function createProject(name: string, initialAmount: number) {
  validate(createProjectInputSchema, { name, initialAmount }) // Always validate first
  const user = await getCurrentUser() // Then authenticate
  // ... perform operation
}
```

**Pattern:** Validate → Authenticate → Execute. Every server action follows this order.

### Authentication Architecture

- **Server-side:** `lib/auth.ts` exports `auth` object using better-auth with Drizzle adapter
- **Client-side:** `lib/auth-client.ts` exports `signIn`, `signOut`, `useSession` from better-auth/react
- **Protected routes:** Check `useSession()` in client components, redirect to `/login` if null
- **Auth tables:** `user`, `session`, `account`, `verification` managed by better-auth (see `lib/db/schema.ts`)

### Environment Variable Expansion

Uses `dotenv-expand` for variable substitution in `.env`:

```env
POSTGRES_DB=booker_journal
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}
```

Both `drizzle.config.ts` and `lib/auth.ts` use `expand(config())` to load variables.

## Development Workflows

### Database Operations

```bash
# First-time setup (starts Docker PostgreSQL on port 35432)
docker compose -f docker-compose.dev.yml up -d
bun run db:push

# Schema changes workflow
# 1. Edit lib/db/schema.ts
# 2. Update lib/db/validation.ts (derive TypeBox schemas)
bun run db:push              # Push to DB directly (dev)
# OR
bun run db:generate          # Generate migration SQL
bun run db:migrate           # Apply migration

# Inspect database
bun run db:studio            # Opens Drizzle Studio UI

# Stop database
docker compose -f docker-compose.dev.yml down
```

**Note:** `docker-compose.dev.yml` is for local development only. Docker uses custom port 35432 (not 5432) to avoid conflicts. Database name is `booker_journal`.

### Running the Application

```bash
bun install                  # Install dependencies
bun run dev                  # Start Next.js dev server (uses Turbopack)
```

### Entry Types Initialization

Entry types (`Purchase`, `Payment`, `Refund`, `Adjustment`) are seeded automatically on first project creation via `seedEntryTypes()` called in `lib/actions/projects.ts`. Don't manually seed unless debugging.

## Project-Specific Conventions

### Balance Calculation Logic

Balance = Σ(amount × price) for all entries. Negative amounts = expenses, positive = income.

```typescript
// lib/actions/entries.ts
export async function getProjectBalance(projectId: number) {
  const entries = await getEntries(projectId)
  return entries.reduce((sum, entry) => {
    return sum + parseFloat(entry.amount) * parseFloat(entry.price)
  }, 0)
}
```

### Numeric Fields as Strings

Drizzle `numeric` columns return strings. Always parse:

```typescript
const total = parseFloat(entry.amount) * parseFloat(entry.price)
```

### Shared Links Pattern

Read-only sharing uses secure random tokens stored in `sharedLinks` table:

- Tokens are UUID-based (128 chars max)
- Expiration enforced at query time
- Public route: `app/shared/[token]/page.tsx` (no auth required)
- Protected route: `app/dashboard/projects/[id]/page.tsx` (auth required)

## Key File Locations

- **Schemas (source of truth):** `lib/db/schema.ts`
- **Validation:** `lib/db/validation.ts` (TypeBox), `lib/db/validate.ts` (utilities)
- **Server actions:** `lib/actions/projects.ts`, `lib/actions/entries.ts`, `lib/actions/shared-links.ts`
- **Auth config:** `lib/auth.ts` (server), `lib/auth-client.ts` (client)
- **Dialogs:** `components/create-project-dialog.tsx`, `components/create-entry-dialog.tsx`, `components/share-project-dialog.tsx`
- **UI components:** `components/ui/*` (shadcn-ui - DO NOT edit directly, regenerate via CLI)

## Common Mistakes to Avoid

1. **Wrong package manager:** Never use npm, yarn, or pnpm - only Bun (`bun install`, `bun add`, `bun run`)
2. **Validation bypass:** Never skip `validate()` in server actions - it prevents runtime type errors
3. **Auth schema modifications:** Don't alter `user`, `session`, `account`, `verification` tables - managed by better-auth
4. **Port conflicts:** Docker PostgreSQL runs on 35432, not 5432
5. **Client/server auth mixing:** Don't use `auth.api` on client, don't use `authClient` hooks on server
6. **Numeric precision:** Always use `parseFloat()` on numeric columns before calculations
7. **Shadcn-ui edits:** Don't manually edit `components/ui/*`, use `bunx shadcn@latest add <component>`

## External Dependencies

- **Database:** PostgreSQL 17 (Docker) or hosted (Vercel Postgres, Supabase supported)
- **Auth:** better-auth 1.3.29 (email/password only, no OAuth configured)
- **UI:** shadcn-ui with Radix UI primitives, Tailwind CSS v4
- **ORM:** Drizzle ORM 0.44.7 with drizzle-typebox for validation

## Testing Notes

No test framework configured. For validation testing, use `validateSafe()` from `lib/db/validate.ts` which returns `{success, data}` or `{success, errors}`.
