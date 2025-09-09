import { createFileRoute } from '@tanstack/react-router'
import { UploadForm } from '../components/upload/UploadForm/UploadForm'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { AuthGuard } from '../components/auth/AuthGuard'

export const Route = createFileRoute('/upload')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthGuard>
      <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96 }}>
        <UploadForm />
        <BottomNav />
      </div>
    </AuthGuard>
  )
}


