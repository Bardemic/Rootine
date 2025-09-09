import { Link, useLocation } from '@tanstack/react-router'
import styles from './BottomNav.module.css'

export function BottomNav() {
  const location = useLocation()
  const current = location.pathname

  return (
    <nav className={styles.nav}>
      <Link to="/" className={`${styles.item} ${current === '/' ? styles.active : ''}`}>
        <span className={styles.icon}>🏡</span>
        <span className={styles.label}>Home</span>
      </Link>
      <Link to="/group" className={`${styles.item} ${current === '/group' ? styles.active : ''}`}>
        <span className={styles.icon}>👥</span>
        <span className={styles.label}>Group</span>
      </Link>
      <Link to="/upload" className={`${styles.item} ${current === '/upload' ? styles.active : ''}`}>
        <span className={`${styles.centerButton}`}>＋</span>
      </Link>
      <Link to="/garden" className={`${styles.item} ${current === '/garden' ? styles.active : ''}`}>
        <span className={styles.icon}>🌷</span>
        <span className={styles.label}>Garden</span>
      </Link>
      <Link to="/account" className={`${styles.item} ${current === '/account' ? styles.active : ''}`}>
        <span className={styles.icon}>👤</span>
        <span className={styles.label}>Account</span>
      </Link>
    </nav>
  )
}


