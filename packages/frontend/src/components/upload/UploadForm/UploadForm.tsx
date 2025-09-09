import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import styles from './UploadForm.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'

export function UploadForm() {
  const { goals, addProof } = useAppState()
  const [goalId, setGoalId] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

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
    setSubmitting(true)
    setError(null)
    try {
      await addProof(goalId, preview)
      setPreview(null)
      setFile(null)
      navigate({ to: '/' })
    } catch (e: any) {
      const msg = e?.message || e?.data?.message || 'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const clearImage = () => {
    setPreview(null)
    setFile(null)
    setError(null)
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
          <div className={styles.previewWrap}>
            <img src={preview} alt="preview" className={styles.preview} />
            <button type="button" aria-label="Clear image" className={styles.clearBtn} onClick={clearImage}>×</button>
          </div>
        ) : (
          <label className={styles.uploader}>
            <input type="file" accept="image/*" capture="environment" onChange={handleSelect} />
            <span>Tap to take a photo</span>
          </label>
        )}

        {error && <div className={styles.error}>{String(error)}</div>}

        <button className={styles.submit} disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}


