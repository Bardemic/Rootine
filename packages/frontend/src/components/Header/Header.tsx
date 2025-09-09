import styles from './Header.module.css'
import { CoinBadge } from '../coins/CoinBadge/CoinBadge'
import { UserMenu } from '../auth/UserMenu'
import { useAudio } from '../audio/AudioProvider/AudioProvider'

export function Header() {
  const audio = useAudio()
  return (
    <header className={styles.header}>
      <div className={styles.titleWrap}>
        <span className={styles.logo}>🌱</span>
        <h1 className={styles.title}>Rootine</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CoinBadge />
        <button
          aria-label={audio.isEnabled ? 'Mute background music' : 'Play background music'}
          onClick={audio.toggleEnabled}
          style={{
            background: 'linear-gradient(180deg, #f9e2ff, #e8fdf4)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 12,
            padding: '6px 10px',
            fontSize: 16,
            lineHeight: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          {audio.isEnabled ? '🔊' : '🔈'}
        </button>
        <UserMenu />
      </div>
    </header>
  )
}


