import styles from './Header.module.css'
import { CoinBadge } from '../coins/CoinBadge/CoinBadge'
import { UserMenu } from '../auth/UserMenu'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.titleWrap}>
        <span className={styles.logo}>🌱</span>
        <h1 className={styles.title}>Rootine</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CoinBadge />
        <UserMenu />
      </div>
    </header>
  )
}


