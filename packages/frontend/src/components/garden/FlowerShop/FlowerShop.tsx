import styles from './FlowerShop.module.css'
import { useAppState } from '../../AppStateProvider/AppStateProvider'

const SHOP = [
  { id: 'flower1', label: 'Sakura', cost: 10 },
  { id: 'flower2', label: 'Daisy', cost: 15 },
  { id: 'flower3', label: 'Hibiscus', cost: 20 },
  { id: 'tulip', label: 'Tulip', cost: 12 },
  { id: 'rose', label: 'Rose', cost: 18 },
  { id: 'sunflower', label: 'Sunflower', cost: 22 },
  { id: 'lavender', label: 'Lavender', cost: 30 },
  { id: 'silver', label: 'Silver Bloom', cost: 50 },
  { id: 'golden', label: 'Golden Bloom', cost: 80 },
  { id: 'diamond', label: 'Diamond Bloom', cost: 120 },
  { id: 'imageSign', label: 'Image Sign', cost: 25 },
  { id: 'tallImage', label: 'Tall Image', cost: 40 },
]

const EMOJI: Record<string, string> = {
  flower1: '🌸',
  flower2: '🌼',
  flower3: '🌺',
  tulip: '🌷',
  rose: '🌹',
  sunflower: '🌻',
  lavender: '💐',
  silver: '⚪',
  golden: '🟡',
  diamond: '💎',
  imageSign: '🪧',
  tallImage: '🖼️',
}

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


