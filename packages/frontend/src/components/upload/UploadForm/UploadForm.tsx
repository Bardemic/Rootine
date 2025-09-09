import { useMemo, useState } from 'react'
import styles from './UploadForm.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'

export function UploadForm() {
  const { goals, addProof } = useAppState()
  const [goalId, setGoalId] = useState(goals[0]?.id || '')
  const [preview, setPreview] = useState<string | null>(null)

  const canSubmit = useMemo(() => Boolean(goalId && preview), [goalId, preview])

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!canSubmit || !preview) return
    addProof(goalId, preview)
    setPreview(null)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h2 className={styles.title}>Add Proof</h2>
        <select className={styles.select} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          {goals.map(g => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>

        {preview ? (
          <img src={preview} alt="preview" className={styles.preview} />
        ) : (
          <label className={styles.uploader}>
            <input type="file" accept="image/*" capture="environment" onChange={handleSelect} />
            <span>Tap to take a photo</span>
          </label>
        )}

        <button className={styles.submit} disabled={!canSubmit} onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  )
}


