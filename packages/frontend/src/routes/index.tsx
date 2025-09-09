import { createFileRoute, Link } from '@tanstack/react-router'
import { BottomNav } from '../components/BottomNav/BottomNav'
import { useAppState } from '../components/AppStateProvider/AppStateProvider'
import { GoalCard } from '../components/goals/GoalCard/GoalCard'
import { AddGoalModal } from '../components/goals/AddGoalModal/AddGoalModal'
import { AuthGuard } from '../components/auth/AuthGuard'
import '../index.css'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { goals, addGoal, removeGoal } = useAppState()
  const [open, setOpen] = useState(false)
  return (
    <AuthGuard>
      <div style={{ width: '100%', minHeight: '100dvh', paddingBottom: 96 }}>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: '600' }}>Your Goals</h2>
            <button onClick={() => setOpen(true)} style={{ 
              padding: '10px 14px', 
              borderRadius: 10, 
              border: '2px solid var(--primary-color)', 
              background: 'var(--primary-color)', 
              cursor: 'pointer',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>Add Goal</button>
          </div>

          {goals.map(g => (
            <GoalCard key={g.id} goal={g} onRemove={removeGoal} />
          ))}

          <Link to="/upload" style={{ marginTop: 4, textDecoration: 'none' }}>
            <div style={{
              padding: 14,
              textAlign: 'center',
              borderRadius: 12,
              background: 'linear-gradient(90deg, var(--primary-color), #6366f1)',
              border: '2px solid var(--border-color)',
              color: 'white',
              fontWeight: '500'
            }}>Submit Proof ➜</div>
          </Link>

        </div>
        <BottomNav />

        <AddGoalModal open={open} onClose={() => setOpen(false)} onSubmit={addGoal} />
      </div>
    </AuthGuard>
  )
}


