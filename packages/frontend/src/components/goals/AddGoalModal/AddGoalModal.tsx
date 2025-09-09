import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './AddGoalModal.module.css'

export function AddGoalModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (title: string) => void }) {
  const [title, setTitle] = useState('')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit(title.trim())
    setTitle('')
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>New Goal</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close modal">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="goal-title" className={styles.label}>
              What do you want to achieve?
            </label>
            <input
              id="goal-title"
              type="text"
              className={styles.input}
              placeholder="e.g., Exercise for 30 minutes daily"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton} disabled={!title.trim()}>
              Create Goal
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}