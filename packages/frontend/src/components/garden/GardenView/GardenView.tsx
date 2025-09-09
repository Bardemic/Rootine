import styles from './GardenView.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'

const FLOWER_EMOJI: Record<string, string> = {
  flower1: '🌸',
  flower2: '🌼',
  flower3: '🌺',
}

export function GardenView() {
  const { garden } = useAppState()
  const maxSlots = Math.max(12, garden.items.length + 4)

  return (
    <div className={styles.wrap}>
      <div className={styles.garden}>
        {Array.from({ length: maxSlots }).map((_, i) => {
          const item = garden.items.find(it => it.slot === i)
          return (
            <div key={i} className={styles.tile}>
              {item ? <span className={styles.flower}>{FLOWER_EMOJI[item.type]}</span> : <span className={styles.dot}>·</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}


