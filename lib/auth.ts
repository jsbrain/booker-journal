import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import * as schema from './db/schema'
import { config } from 'dotenv'
import { expand } from 'dotenv-expand'

// Load environment variables with expansion
expand(config())

const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && !process.env.BETTER_AUTH_SECRET) {
  throw new Error('Missing BETTER_AUTH_SECRET (required in production)')
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
let appOrigin = 'http://localhost:3000'
try {
  appOrigin = new URL(appUrl).origin
} catch {
  // Keep localhost fallback; invalid NEXT_PUBLIC_APP_URL should be fixed in env.
}

const trustedOrigins = Array.from(new Set([appOrigin, 'http://localhost:3000']))

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || 'dev-only-secret',
  trustedOrigins,
})
