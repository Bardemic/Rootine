import { authClient } from '../../lib/auth'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: '/login' })
    }
  }, [session, isPending, navigate])

  if (isPending) return <div>Loading...</div>
  if (!session) return null

  return <>{children}</>
}
