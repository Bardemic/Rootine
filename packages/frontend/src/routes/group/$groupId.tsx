import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { trpc } from '../../lib/trpc'
import { useMemo, useRef, useState } from 'react'

export const Route = createFileRoute('/group/$groupId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { groupId } = useParams({ from: '/group/$groupId' })
  const detail = trpc.groups.groupDetail.useQuery({ groupId })
  const utils = trpc.useUtils()
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const canSubmit = useMemo(() => Boolean(file), [file])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
      setFile(f)
    }
    reader.readAsDataURL(f)
  }

  const onSubmit = async () => {
    if (!file) return
    setSubmitting(true)
    setError(null)
    const fd = new FormData()
    fd.append('groupId', groupId)
    fd.append('file', file)
    if (description.trim()) fd.append('description', description.trim())
    try {
      const resp = await fetch('/api/upload/group-proof', { method: 'POST', body: fd, credentials: 'include' })
      if (resp.ok) {
        setFile(null)
        setPreview(null)
        setDescription('')
        ;(utils as any).groups?.groupDetail?.invalidate?.({ groupId })
        ;(utils as any).user?.coin?.invalidate?.()
      } else {
        const data = await resp.json().catch(() => ({}))
        setError(String(data?.error || 'Upload failed.'))
      }
    } catch (e: any) {
      setError(String(e?.message || 'Upload failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  const d = (detail.data as any)

  return (
    <>
      <Link to="/group" style={{ textDecoration: 'none', color: 'var(--text-secondary)' }}>{'< Back'}</Link>
      {d ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ border: '2px solid var(--border-color)', borderRadius: 12, padding: 12, background: 'var(--panel-bg)' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.group.name} <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>({d.group.code})</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.group.description}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ border: '2px solid var(--border-color)', borderRadius: 12, padding: 12, background: 'var(--panel-bg)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Streak</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{d.streak}d</div>
            </div>
            <div style={{ border: '2px solid var(--border-color)', borderRadius: 12, padding: 12, background: 'var(--panel-bg)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Today</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: d.uploadedToday ? 'green' : 'var(--text-primary)' }}>{d.uploadedToday ? 'Done' : 'Pending'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {preview ? (
              <div style={{ position: 'relative' }}>
                <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 10, border: '2px solid var(--border-color)' }} />
                <button type="button" aria-label="Clear image" onClick={() => { setPreview(null); setFile(null); setError(null); }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', display: 'grid', placeItems: 'center', fontSize: 20, lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ) : null}
            <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => inputRef.current?.click()} style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid var(--border-color)', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Choose Photo</button>
              <button onClick={onSubmit} disabled={!canSubmit || submitting} style={{ opacity: canSubmit && !submitting ? 1 : 0.6, padding: '10px 14px', borderRadius: 10, border: '2px solid var(--primary-color)', background: 'var(--primary-color)', cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', color: 'white', fontWeight: 600, fontSize: 14 }}>{submitting ? 'Submitting…' : 'Submit'}</button>
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional: Add a short description" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '2px solid var(--border-color)', background: 'var(--panel-bg)', color: 'var(--text-primary)' }} />
            {error && (
              <div style={{ padding: '10px 12px', background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.35)', color: '#dc2626', borderRadius: 10 }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Your Photos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {(d.photos as any[])?.map((p) => (
                <div key={p.id} style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid var(--border-color)' }}>
                  <img src={p.url} alt="" style={{ width: '100%', display: 'block' }} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Members</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {(d.members as any[])?.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 10, border: '2px solid var(--border-color)', background: 'var(--card-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}{m.isSelf ? ' (You)' : ''}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: m.doneToday ? 'green' : 'var(--text-secondary)' }}>
                    {m.doneToday ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


