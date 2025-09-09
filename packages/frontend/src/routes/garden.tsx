import { createFileRoute } from '@tanstack/react-router'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { Garden3D } from '../components/garden/Garden3D/Garden3D'
import { ShopOverlay } from '../components/garden/ShopOverlay/ShopOverlay'
import { AuthGuard } from '../components/auth/AuthGuard'

export const Route = createFileRoute('/garden')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthGuard>
      <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
          <Garden3D />
        </div>
        <ShopOverlay />
        <BottomNav />
      </div>
    </AuthGuard>
  )
}


