import { useEffect, useMemo, useState } from 'react'
import styles from './UploadForm.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'

export function UploadForm() {
  const { goals, addProof } = useAppState()
  const [goalId, setGoalId] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (!goalId && goals.length > 0) {
      setGoalId(goals[0].id)
    }
  }, [goals, goalId])

  const canSubmit = useMemo(() => Boolean(goalId && preview), [goalId, preview])

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!canSubmit || !file || !preview) return
    addProof(goalId, preview)
    setPreview(null)
    setFile(null)
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


