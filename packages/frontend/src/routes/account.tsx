import { createFileRoute } from '@tanstack/react-router'
import { AuthGuard } from '../components/auth/AuthGuard'
import { BottomNav } from '../components/BottomNav/BottomNav'
import styles from './account.module.css'
import { authClient } from '../lib/auth'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/account')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  return (
    <AuthGuard>
      <div className={styles.container}>
        <div className={styles.simpleHeader}>
          <div className={styles.email}>{session?.user.email}</div>
        </div>
        <div className={styles.spacer} />
        <button
          className={styles.signOut}
          onClick={() =>
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => navigate({ to: '/login' }),
              },
            })
          }
        >
          Sign out
        </button>
        <BottomNav />
      </div>
    </AuthGuard>
  )
}


