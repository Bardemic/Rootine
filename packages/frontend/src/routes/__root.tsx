import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
import { authClient } from '../lib/auth'
import { AppStateProvider } from '../components/AppStateProvider/AppStateProvider'
import { BottomNav } from '../components/BottomNav/BottomNav'

type AuthSession = ReturnType<typeof authClient.useSession>['data']
interface MyRouterContext {
  auth: AuthSession
}

export const Route = createRootRoute<MyRouterContext>({
  component: () => (
    <>
      <AppStateProvider>
        <RootLayout />
      </AppStateProvider>
    </>
  ),
})

function RootLayout() {
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup'

  return (
    <div style={{ display: 'flex', flexDirection: 'row', minHeight: '100dvh', width: '100%' }}>
      <Outlet />
    </div>
  )
}


