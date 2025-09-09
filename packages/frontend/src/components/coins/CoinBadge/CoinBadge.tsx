import styles from './CoinBadge.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'

export function CoinBadge() {
  const { coins } = useAppState()
  return (
    <div className={styles.badge}>
      <span className={styles.icon}>🪙</span>
      <span className={styles.count}>{coins}</span>
    </div>
  )
}


