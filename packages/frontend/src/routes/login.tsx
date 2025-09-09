import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth'

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data: session } = authClient.useSession()

  // If already authenticated (or once authentication completes), redirect to home
  useEffect(() => {
    if (session) {
      navigate({ to: '/', replace: true })
    }
  }, [session, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await authClient.signIn.email({ email, password })
      // Session-based effect above will handle redirect; no-op here to avoid race
    } catch (err: any) {
      setError(err?.message || 'Sign in failed')
    }
  }

  return (
    <div style={{ width: '100%', minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, width: 'min(420px, 100%)', padding: 20, border: '1px solid var(--border-color)', borderRadius: 12, background: '#fff' }}>
        <h2 style={{ margin: 0 }}>Sign in</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border-color)' }} />
        {error && <div style={{ color: '#b91c1c', fontSize: 12 }}>{error}</div>}
        <button type="submit" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'linear-gradient(90deg, #FFDEE2, #E8F3FF)' }}>Sign in</button>
        <div style={{ fontSize: 12 }}>No account? <Link to="/signup">Create one</Link></div>
      </form>
    </div>
  )
}


