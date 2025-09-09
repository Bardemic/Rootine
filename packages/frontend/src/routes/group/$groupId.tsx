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
    const fd = new FormData()
    fd.append('groupId', groupId)
    fd.append('file', file)
    const resp = await fetch('/api/upload/group-proof', { method: 'POST', body: fd, credentials: 'include' })
    if (resp.ok) {
      setFile(null)
      setPreview(null)
      ;(utils as any).groups?.groupDetail?.invalidate?.({ groupId })
      ;(utils as any).user?.coin?.invalidate?.()
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
              <img src={preview} alt="preview" style={{ width: '100%', borderRadius: 10, border: '2px solid var(--border-color)' }} />
            ) : null}
            <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => inputRef.current?.click()} style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid var(--border-color)', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Choose Photo</button>
              <button onClick={onSubmit} disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.6, padding: '10px 14px', borderRadius: 10, border: '2px solid var(--primary-color)', background: 'var(--primary-color)', cursor: canSubmit ? 'pointer' : 'not-allowed', color: 'white', fontWeight: 600, fontSize: 14 }}>Submit</button>
            </div>
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


