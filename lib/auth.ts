import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { db } from './db'
import * as schema from './db/schema'
import { getRegistrationAccess } from './auth-registration'
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
    disableSignUp: false,
    autoSignIn: false,
  },
  user: {
    additionalFields: {
      role: {
        type: ['user', 'admin'],
        required: true,
        defaultValue: 'user',
        input: false,
      },
      approved: {
        type: 'boolean',
        required: true,
        defaultValue: false,
        input: false,
      },
      approvedAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const registrationAccess = await getRegistrationAccess()

          if (!registrationAccess) {
            throw new APIError('FORBIDDEN', {
              message: 'Signup is disabled',
              code: 'SIGNUP_DISABLED',
            })
          }

          return {
            data: {
              ...newUser,
              role: registrationAccess.role,
              approved: registrationAccess.approved,
              approvedAt: registrationAccess.approved ? new Date() : null,
            },
          }
        },
      },
    },
    session: {
      create: {
        before: async (newSession) => {
          const accountOwner = await db.query.user.findFirst({
            where: (users, { eq }) => eq(users.id, newSession.userId),
          })

          if (!accountOwner?.approved) {
            throw new APIError('FORBIDDEN', {
              message: 'Account is awaiting administrator approval',
              code: 'ACCOUNT_PENDING_APPROVAL',
            })
          }

          return { data: newSession }
        },
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || 'dev-only-secret',
  trustedOrigins,
})
