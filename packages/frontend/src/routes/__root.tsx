import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
import { authClient } from '../lib/auth'

type AuthSession = ReturnType<typeof authClient.useSession>['data']
interface MyRouterContext {
  auth: AuthSession
}

export const Route = createRootRoute<MyRouterContext>({
  component: () => (
    <>
      <RootLayout />
    </>
  ),
})

function RootLayout() {
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup'

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100dvh', width: '100%' }}>
      <Outlet />
    </div>
  )
}


