import { authClient } from '../../lib/auth'
import { useNavigate } from '@tanstack/react-router'
import styles from './UserMenu.module.css'

export function UserMenu() {
  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()
  
  if (isPending) return <span>Loading…</span>
  if (!session) {
    navigate({ to: '/login' })
    return null
  }

  return (
    <div className={styles.userMenu}>
      <div>
        <p>{session?.user.name || session?.user.email}</p>
        <p className={styles.planStyling}>Free plan</p>
      </div>
      
      <button 
        onClick={() => authClient.signOut({ 
          fetchOptions: { 
            onSuccess: () => navigate({ to: '/login' }) 
          } 
        })} 
        className={styles.signOutButton}
      >
        Sign Out
      </button>
    </div>
  )
}
