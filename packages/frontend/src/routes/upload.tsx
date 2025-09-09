import { createFileRoute } from '@tanstack/react-router'
import { Header } from '../components/Header/Header'
import { UploadForm } from '../components/upload/UploadForm/UploadForm'
import { BottomNav } from '../components/BottomNav/BottomNav'

export const Route = createFileRoute('/upload')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96 }}>
      <Header />
      <UploadForm />
      <BottomNav />
    </div>
  )
}


