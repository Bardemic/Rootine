import { createFileRoute } from '@tanstack/react-router'
import { Header } from '../components/Header/Header'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { Garden3D } from '../components/garden/Garden3D/Garden3D'
import { ShopOverlay } from '../components/garden/ShopOverlay/ShopOverlay'

export const Route = createFileRoute('/garden')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96, position: 'relative' }}>
      <Header />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
        <Garden3D />
      </div>
      <ShopOverlay />
      <BottomNav />
    </div>
  )
}


