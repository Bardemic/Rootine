import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { Header } from '../components/Header/Header'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { useAppState } from '../components/AppStateProvider/AppStateProvider'
import { GoalCard } from '../components/goals/GoalCard/GoalCard'
import { AddGoalModal } from '../components/goals/AddGoalModal/AddGoalModal'
import '../index.css'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { goals, addGoal, removeGoal } = useAppState()
  const [open, setOpen] = useState(false)
  return (
    <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96 }}>
      <Header />
      <div style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16 }}>Your Goals</h2>
          <button onClick={() => setOpen(true)} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: '#FFF' }}>Add</button>
        </div>

        {goals.map(g => (
          <GoalCard key={g.id} goal={g} onRemove={removeGoal} />
        ))}

        <Link to="/upload" style={{ marginTop: 4, textDecoration: 'none' }}>
          <div style={{
            padding: 14,
            textAlign: 'center',
            borderRadius: 12,
            background: 'linear-gradient(90deg, #FFDEE2, #E8F3FF)',
            border: '1px solid var(--border-color)'
          }}>Submit Proof ➜</div>
        </Link>

      </div>
      <BottomNav />

      <AddGoalModal open={open} onClose={() => setOpen(false)} onSubmit={addGoal} />
    </div>
  )
}


