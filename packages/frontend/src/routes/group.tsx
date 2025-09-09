import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { AuthGuard } from '../components/auth/AuthGuard'
import { trpc } from '../lib/trpc'
import { useMemo, useState } from 'react'
import styles from './group.module.css'

export const Route = createFileRoute('/group')({
  component: RouteComponent,
})

function RouteComponent() {
  const location = useLocation()
  const isDetail = location.pathname.startsWith('/group/')
  const utils = trpc.useUtils()
  const myGroups = trpc.groups.myGroups.useQuery()
  const create = trpc.groups.createGroup.useMutation()
  const join = trpc.groups.joinGroup.useMutation()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const canCreate = useMemo(() => Boolean(name.trim() && description.trim()), [name, description])

  const handleCreate = () => {
    if (!canCreate) return
    ;(create as any).mutate({ name: name.trim(), description: description.trim() }, {
      onSuccess: () => {
        setName('')
        setDescription('')
        ;(utils as any).groups?.myGroups?.invalidate?.()
      },
    })
  }
  // photo submission moved to group detail page
  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    ;(join as any).mutate({ code: trimmed }, {
      onSuccess: () => {
        setCode('')
        ;(utils as any).groups?.myGroups?.invalidate?.()
      },
    })
  }

  if (isDetail) {
    return (
      <AuthGuard>
        <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96 }}>
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            <Outlet />
          </div>
          <BottomNav />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96 }}>
        <div className={styles.wrap}>
          <h2 className={styles.title}>Groups</h2>
          <div className={styles.actions}>
            <button className={styles.actionBtn} onClick={() => { setShowCreate((v) => !v); if (!showCreate) setShowJoin(false) }}>Create Group</button>
            <button className={styles.actionBtnSecondary} onClick={() => { setShowJoin((v) => !v); if (!showJoin) setShowCreate(false) }}>Join Group</button>
          </div>

          {showCreate ? (
            <div className={`${styles.panel} ${styles.fencePanel}`}>
              <div style={{ display: 'grid', gap: 8 }}>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (e.g. Roomies)" />
                <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Habit description (e.g. Daily walk)" />
              </div>
              <button className="btn" onClick={handleCreate} disabled={!canCreate} style={{ marginTop: 8, opacity: canCreate ? 1 : 0.6, cursor: canCreate ? 'pointer' : 'not-allowed' }}>Create</button>
            </div>
          ) : null}

          {showJoin ? (
            <div className={`${styles.panel} ${styles.fencePanel}`}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" />
                <button className={styles.actionBtn} onClick={handleJoin}>Join</button>
              </div>
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 8 }}>
            <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Your Groups</h3>
            {(myGroups.data as any[] | undefined)?.map((g) => (
              <div key={g.id} className={styles.groupCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'grid' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{g.name} <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>({g.code})</span></span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g.description}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Created {new Date(g.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className={styles.actionRow}>
                  <Link to="/group/$groupId" params={{ groupId: g.id }} style={{ textDecoration: 'none' }}>
                    <div className={styles.openBtn}>Open Group ➜</div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  )
}


