import { createFileRoute } from '@tanstack/react-router'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { Garden3D } from '../components/garden/Garden3D/Garden3D'
import { ShopOverlay } from '../components/garden/ShopOverlay/ShopOverlay'
import { AuthGuard } from '../components/auth/AuthGuard'
import { useState } from 'react'
import { trpc } from '../lib/trpc'

export const Route = createFileRoute('/garden')({
  component: RouteComponent,
})

function RouteComponent() {
  const [signId, setSignId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showCog, setShowCog] = useState(false)
  const utils = (trpc as any).useUtils?.()
  const proofsQuery = (trpc as any).proofs?.getAllProofs?.useQuery?.(undefined, { staleTime: 15_000 })
  const setSignImage = (trpc as any).flowers?.setSignImage?.useMutation?.()

  function closeAll() {
    setSettingsOpen(false)
    setShowCog(false)
    setSignId(null)
  }
  function onPick(url: string) {
    const id = signId
    if (!id) return
    ;(setSignImage as any)?.mutate?.(
      { id, imageUrl: url },
      { onSuccess: () => { setSettingsOpen(false); setShowCog(false); setSignId(null); utils?.flowers?.getFlowers?.invalidate?.() } }
    )
  }
  return (
    <AuthGuard>
      <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
          <Garden3D onEditSign={(id) => { setSignId(id); setShowCog(true); setSettingsOpen(false) }} />
        </div>
        <ShopOverlay />
        {showCog && !settingsOpen && (
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Open sign settings"
            style={{ position: 'fixed', right: 16, bottom: 140, width: 56, height: 56, borderRadius: '50%', background: '#111827', color: 'white', border: 'none', display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.25)', zIndex: 60 }}
          >
            <span style={{ fontSize: 22 }}>⚙️</span>
          </button>
        )}

        {/* Settings sheet + backdrop */}
        {(signId && settingsOpen) && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 58, pointerEvents: 'auto' }}>
            <div onClick={() => setSettingsOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '75%', paddingBottom: 96, boxShadow: '0 -10px 28px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 4, background: '#e5e7eb', borderRadius: 9999 }} />
                  <div style={{ fontWeight: 700 }}>Pick an image for your sign</div>
                </div>
                <button onClick={closeAll} style={{ background: '#f3f4f6', border: 'none', borderRadius: 12, padding: '8px 12px' }}>Close</button>
              </div>
              <div style={{ padding: 12, overflow: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {(proofsQuery?.data as any[] | undefined)?.map((p: any) => (
                    <button key={p.id} onClick={() => onPick(p.imageDataUrl)} style={{ border: 'none', padding: 0, background: 'transparent', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
                      <img src={p.imageDataUrl} style={{ width: '100%', display: 'block', aspectRatio: '1 / 1', objectFit: 'cover' }} />
                    </button>
                  ))}
                  {(!proofsQuery || proofsQuery.isLoading) && Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} style={{ width: '100%', aspectRatio: '1 / 1', background: '#f3f4f6', borderRadius: 12 }} />
                  ))}
                  {(proofsQuery && !proofsQuery.isLoading && (!proofsQuery.data || (proofsQuery.data as any[])?.length === 0)) && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6b7280', padding: '12px 0' }}>No proof images yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <BottomNav />
      </div>
    </AuthGuard>
  )
}


