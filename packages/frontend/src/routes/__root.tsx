import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppStateProvider } from '../components/AppStateProvider/AppStateProvider'
import { CoinBadge } from '../components/coins/CoinBadge/CoinBadge'
import { AuthGuard } from '../components/auth/AuthGuard'
import { AudioProvider } from '../components/audio/AudioProvider/AudioProvider'
import { useAudio } from '../components/audio/AudioProvider/AudioProvider'

export const Route = createRootRoute({
  component: () => (
    <>
      <AudioProvider>
        <AppStateProvider>
          <RootLayout />
        </AppStateProvider>
      </AudioProvider>
    </>
  ),
})

function RootLayout() {
  const audio = useAudio()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', width: '100%' }}>
      <AuthGuard>
        <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CoinBadge />
          <button
            aria-label={audio.isEnabled ? 'Mute background music' : 'Play background music'}
            onClick={audio.toggleEnabled}
            style={{
              background: 'var(--glass)',
              border: '2px solid var(--border-color)',
              borderRadius: 12,
              padding: '6px 10px',
              fontSize: 16,
              lineHeight: 1,
              color: 'var(--text-primary)',
              boxShadow: '0 6px 14px var(--shadow-color)'
            }}
          >
            {audio.isEnabled ? '🎵' : '🔇'}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={audio.volume}
            onChange={(e) => audio.setVolume(Number(e.target.value))}
            aria-label="Volume"
            style={{
              width: 112,
              WebkitAppearance: 'none',
              appearance: 'none',
              height: 6,
              borderRadius: 999,
              background: 'linear-gradient(90deg, var(--accent-color), var(--primary-color))',
              outline: 'none',
              border: '2px solid var(--border-color)'
            }}
          />
        </div>
      </AuthGuard>
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
        <Outlet />
      </div>
    </div>
  )
}


