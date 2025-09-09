import { createFileRoute } from '@tanstack/react-router'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { CoinBadge } from '../components/coins/CoinBadge/CoinBadge'
import { AuthGuard } from '../components/auth/AuthGuard'
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
        <div className={styles.header}>
          <div className={styles.headerBlob} />
          <div className={styles.topRow}>
            <div className={styles.title}>Account</div>
          </div>
          <div className={styles.coinWrap}>
            <CoinBadge />
          </div>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>🌱</div>
            <div className={styles.nameWrap}>
              <div className={styles.name}>{session?.user.name || session?.user.email}</div>
            </div>
          </div>
        </div>
        <div className={styles.content}>
          <div className={styles.sectionTitle}>Quick actions</div>
          <div className={styles.tile}>
            <div className={styles.tileIcon}>✏️</div>
            <div className={styles.tileTitle}>Edit Profile</div>
            <div className={styles.tileRight}>›</div>
          </div>
          <div className={styles.tile}>
            <div className={styles.tileIcon}>🔒</div>
            <div className={styles.tileTitle}>Privacy & Security</div>
            <div className={styles.tileRight}>›</div>
          </div>
          <div className={styles.tile}>
            <div className={styles.tileIcon}>💬</div>
            <div className={styles.tileTitle}>Support</div>
            <div className={styles.tileRight}>›</div>
          </div>
          <button className={styles.signOut} onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => navigate({ to: '/login' }) } })}>Sign out</button>
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  )
}


