import styles from './GoalCard.module.css'
import { Goal } from '../../AppStateProvider/AppStateProvider'

export function GoalCard({ goal, onRemove }: { goal: Goal; onRemove?: (id: string) => void }) {
  const progress = Math.min(100, goal.proofs.length * 10)
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.emoji}>🫶</div>
        <button className={styles.removeBtn} onClick={() => onRemove?.(goal.id)}>✕</button>
      </div>
      <div className={styles.title}>{goal.title}</div>

      <div className={styles.progressBar}>
        <div className={styles.progress} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.proofsRow}>
        {goal.proofs.slice(0, 6).map(p => (
          <img key={p.id} className={styles.proof} src={p.imageDataUrl} alt="proof" />
        ))}
        {goal.proofs.length === 0 && (
          <div className={styles.empty}>No proofs yet. Upload one today! ✨</div>
        )}
      </div>
    </div>
  )
}


