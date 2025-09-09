import { useEffect, useRef, useState } from 'react'
import styles from './AddGoalModal.module.css'

export function AddGoalModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (title: string) => void }) {
  const [title, setTitle] = useState('')
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const handle = () => {
    if (!title.trim()) return
    onSubmit(title.trim())
    setTitle('')
    onClose()
  }

  return (
    <dialog ref={dialogRef} className={styles.modal} onCancel={(e) => { e.preventDefault(); onClose() }}>
      <div className={styles.content}>
        <h2 className={styles.heading}>New Goal</h2>
        <input
          className={styles.input}
          placeholder="Describe your goal…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>Cancel</button>
          <button className={styles.save} onClick={handle}>Save</button>
        </div>
      </div>
    </dialog>
  )
}


