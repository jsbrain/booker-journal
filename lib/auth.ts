import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'
import * as schema from './db/schema'
import { config } from 'dotenv'
import { expand } from 'dotenv-expand'

// Load environment variables with expansion
expand(config())

const localAppUrl = `http://localhost:${process.env.PORT || '3005'}`
const appUrl =
  process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || localAppUrl

const parseOrigin = (url?: string) => {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

const trustedOrigins = Array.from(
  new Set(
    [
      parseOrigin(process.env.BETTER_AUTH_URL),
      parseOrigin(process.env.NEXT_PUBLIC_APP_URL),
      parseOrigin(localAppUrl),
    ].filter((origin): origin is string => Boolean(origin)),
  ),
)

const appOrigin = parseOrigin(appUrl) || parseOrigin(localAppUrl)!

const isLocalEnvironment = (() => {
  try {
    const hostname = new URL(appOrigin).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return true
  }
})()

if (!isLocalEnvironment && !process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    'Missing BETTER_AUTH_SECRET (required in non-local environments)',
  )
}

export const auth = betterAuth({
  baseURL: appUrl,
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
