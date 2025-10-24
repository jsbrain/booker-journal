# Booker Journal

A modern journal management system with project-based accounting built with Next.js 16, shadcn-ui, better-auth, and Drizzle ORM with PostgreSQL.

## Features

- 🔐 Email/password authentication with better-auth
- 📊 Project-based journal tracking system
- 💰 Journal entries with amount, price, and types
- 🔄 Real-time balance calculation
- 🔗 Shareable read-only links with expiration
- 🎨 Beautiful UI components from shadcn-ui
- 🚀 Next.js 16 with App Router and Turbopack
- 📱 Responsive design with Tailwind CSS v4
- 🔒 Protected routes with session management
- 💾 PostgreSQL database with Drizzle ORM

## Tech Stack

- **Framework:** Next.js 16.0.0
- **UI Library:** shadcn-ui (Radix UI primitives)
- **Authentication:** better-auth 1.3.29
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** TypeBox with Drizzle-TypeBox integration
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **Package Manager:** Bun 1.3+

## Getting Started

### Prerequisites

- Bun 1.3+ installed ([Install Bun](https://bun.sh))
- PostgreSQL database (local or hosted)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jsbrain/booker-journal.git
cd booker-journal
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env.local` file in the root directory:
```env
# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/booker_journal
```

4. Run database migrations:
```bash
bun run db:push
```

5. Start the development server:
```bash
bun run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Authentication

1. Navigate to the home page (automatically redirects to login)
2. Click "Sign up" to create a new account
3. Enter your name, email, and password
4. You'll be redirected to the dashboard

### Managing Projects

1. From the dashboard, click "New Project"
2. Enter a project name and initial amount (negative for debt, positive for credit)
3. Click "Create Project" to create your first journal

### Adding Journal Entries

1. Click on a project to view its details
2. Click "New Entry" to add a journal entry
3. Select the entry type (Purchase, Payment, Refund, etc.)
4. Enter the amount/quantity and price
5. Optionally add a note
6. Click "Create Entry"

The balance is automatically calculated as the sum of (amount × price) for all entries.

### Sharing Projects

1. Open a project detail page
2. Click "Share" to create a shareable link
3. Set the expiration time in days
4. Copy the generated link to share with others
5. Recipients can view the journal in read-only mode until the link expires

### Entry Types

Entry types have editable display names and are used to categorize journal entries:
- **Purchase** - for buying items or services (typically negative)
- **Payment** - for receiving payments (typically positive)
- **Refund** - for refunds or returns
- **Adjustment** - for manual balance adjustments

## Project Structure

```
booker-journal/
├── app/
│   ├── api/auth/[...all]/     # Better-auth API routes
│   ├── dashboard/              # Protected dashboard
│   │   └── projects/[id]/      # Project detail pages
│   ├── shared/[token]/         # Public shared link views
│   ├── login/                  # Login/signup page
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/
│   ├── ui/                     # shadcn-ui components
│   ├── create-project-dialog.tsx
│   ├── create-entry-dialog.tsx
│   └── share-project-dialog.tsx
├── lib/
│   ├── actions/                # Server actions with validation
│   │   ├── projects.ts
│   │   ├── entries.ts
│   │   ├── entry-types.ts
│   │   └── shared-links.ts
│   ├── db/                     # Database configuration
│   │   ├── index.ts
│   │   ├── schema.ts           # Drizzle schemas (source of truth)
│   │   ├── validation.ts       # TypeBox schemas derived from Drizzle
│   │   ├── validate.ts         # Validation utilities
│   │   └── seed.ts
│   ├── auth.ts                 # Better-auth configuration
│   ├── auth-client.ts          # Auth client for frontend
│   └── utils.ts                # Utility functions
├── bunfig.toml                 # Bun configuration
└── drizzle.config.ts           # Drizzle ORM configuration
```

## Database Schema

### Projects
- `id` - Unique identifier
- `name` - Project name
- `userId` - Owner user ID
- `createdAt` / `updatedAt` - Timestamps

### Journal Entries
- `id` - Unique identifier
- `projectId` - Reference to project
- `amount` - Quantity/amount
- `price` - Price per unit (can be negative or positive)
- `typeId` - Reference to entry type
- `note` - Optional note
- `timestamp` - Entry timestamp

### Entry Types
- `id` - Unique identifier
- `key` - Internal key (e.g., 'purchase')
- `name` - Display name (editable)

### Shared Links
- `id` - Unique identifier
- `projectId` - Reference to project
- `token` - Secure random token
- `expiresAt` - Expiration timestamp

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
- `bun run db:generate` - Generate database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio

## Validation Architecture

This project follows a strict validation flow to ensure data integrity:

1. **Source of Truth**: Drizzle schemas (`lib/db/schema.ts`) define the database structure
2. **TypeBox Derivation**: TypeBox schemas are automatically derived from Drizzle schemas using `drizzle-typebox`
3. **Extended Schemas**: Base schemas are extended or merged for specific API validation needs
4. **Type Inference**: TypeScript types are inferred from TypeBox schemas using `Static<typeof schema>`
5. **Validation**: All server actions validate inputs using TypeBox before processing

This flow ensures consistency between database schema, validation rules, and TypeScript types.

## Security

- Passwords are securely hashed using better-auth
- Session tokens are stored securely
- **Input validation on all server actions using TypeBox schemas**
- Environment variables for sensitive configuration
- Database credentials excluded from version control
- Shared links use cryptographically secure random tokens
- Project access restricted to owners only
- Read-only access for shared links

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn-ui Documentation](https://ui.shadcn.com)
- [better-auth Documentation](https://www.better-auth.com)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Bun Documentation](https://bun.sh/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Remember to:
1. Add your environment variables in the Vercel dashboard
2. Configure your PostgreSQL database (e.g., Vercel Postgres, Supabase, etc.)
3. Run migrations: `bun run db:push`

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

This project is open source and available under the MIT License.
