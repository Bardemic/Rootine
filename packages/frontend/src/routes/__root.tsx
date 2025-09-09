import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppStateProvider } from '../components/AppStateProvider/AppStateProvider'

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
    <div style={{ display: 'flex', flexDirection: 'row', minHeight: '100dvh', width: '100%' }}>
      <Outlet />
    </div>
  )
}


