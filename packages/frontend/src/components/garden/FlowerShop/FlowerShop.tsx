import styles from './FlowerShop.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'

const SHOP = [
  { id: 'flower1', label: 'Sakura', cost: 10 },
  { id: 'flower2', label: 'Daisy', cost: 15 },
  { id: 'flower3', label: 'Hibiscus', cost: 20 },
]

const EMOJI: Record<string, string> = { flower1: '🌸', flower2: '🌼', flower3: '🌺' }

export function FlowerShop() {
  const { coins, purchaseFlower } = useAppState()

  return (
    <div className={styles.shop}>
      {SHOP.map(item => (
        <button
          key={item.id}
          className={styles.item}
          disabled={coins < item.cost}
          onClick={() => purchaseFlower(item.id as any, item.cost)}
        >
          <span className={styles.emoji}>{EMOJI[item.id]}</span>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.cost}>🪙 {item.cost}</span>
        </button>
      ))}
    </div>
  )
}


