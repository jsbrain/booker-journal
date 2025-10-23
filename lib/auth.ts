import { betterAuth } from "better-auth"
import Database from "better-sqlite3"

export const auth = betterAuth({
  database: new Database("./auth.db"),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET || "my-super-secret-auth-key-change-in-production",
  trustedOrigins: ["http://localhost:3000"],
})
