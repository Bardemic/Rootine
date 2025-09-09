import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppStateProvider } from '../components/AppStateProvider/AppStateProvider'
import { CoinBadge } from '../components/coins/CoinBadge/CoinBadge'
import { AuthGuard } from '../components/auth/AuthGuard'

export const Route = createRootRoute({
  component: () => (
    <>
      <AppStateProvider>
        <RootLayout />
      </AppStateProvider>
    </>
  ),
})

function RootLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', width: '100%' }}>
      <AuthGuard>
        <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
          <CoinBadge />
        </div>
      </AuthGuard>
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
        <Outlet />
      </div>
    </div>
  )
}


