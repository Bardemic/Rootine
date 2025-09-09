import { useState } from 'react'
import styles from './ShopOverlay.module.css'
import { FlowerShop } from '../FlowerShop/FlowerShop'

export function ShopOverlay() {
  const [open, setOpen] = useState(false)
  return (
    <div className={`${styles.sheet} ${open ? styles.open : ''}`}>
      <button className={styles.handle} onClick={() => setOpen(o => !o)}>
        {open ? 'Close Shop' : 'Open Shop'}
      </button>
      <div className={styles.content}>
        <FlowerShop />
      </div>
    </div>
  )
}


