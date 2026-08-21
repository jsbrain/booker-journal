'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp, useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { devLogError, getPublicErrorMessage } from '@/lib/utils/public-error'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [signupAvailable, setSignupAvailable] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { data: session, isPending } = useSession()

  // Redirect if already logged in
  useEffect(() => {
    if (!isPending && session) {
      router.push('/dashboard')
    }
  }, [session, isPending, router])

  const refreshRegistrationStatus = useCallback(async () => {
    const response = await fetch('/api/auth/registration-status', {
      cache: 'no-store',
    })
    const result = (await response.json().catch(() => null)) as {
      signupAvailable?: boolean
      error?: string
    } | null

    if (!response.ok || !result) {
      throw new Error(result?.error || 'Failed to load registration status')
    }

    setSignupAvailable(Boolean(result.signupAvailable))
    if (!result.signupAvailable) setIsSignUp(false)
  }, [])

  useEffect(() => {
    void refreshRegistrationStatus().catch((err) => {
      devLogError('Failed to load registration status:', err)
      setError('Failed to load registration status')
    })
  }, [refreshRegistrationStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      if (isSignUp) {
        const result = await signUp.email({ name, email, password })

        if (result.error) {
          setError(result.error.message || 'Signup failed')
          return
        }

        const approved = Boolean(result.data?.user.approved)
        setNotice(
          approved
            ? 'Administrator account created. Sign in to continue.'
            : 'Account created. An administrator must approve it before you can sign in.',
        )
        setIsSignUp(false)
        setName('')
        setPassword('')
        await refreshRegistrationStatus()
        return
      }

      const result = await signIn.email({
        email,
        password,
      })

      if (result.error) {
        setError(result.error.message || 'Authentication failed')
        return
      }

      router.push('/dashboard')
    } catch (err) {
      devLogError('Authentication failed:', err)
      setError(getPublicErrorMessage(err, 'Authentication failed'))
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Don't render login form if already logged in
  if (session) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
          <CardDescription>
            {isSignUp
              ? 'The first account becomes the administrator. Later accounts require administrator approval.'
              : 'Enter your approved account credentials to access the dashboard.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">
                {notice}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>
          {signupAvailable && (
            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setNotice('')
                  setIsSignUp((current) => !current)
                }}
                className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : 'Create an account'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
