import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export type Proof = {
  id: string
  goalId: string
  imageDataUrl: string
  createdAt: string
}

export type Goal = {
  id: string
  title: string
  createdAt: string
  proofs: Proof[]
}

export type GardenItem = {
  id: string
  type: 'flower1' | 'flower2' | 'flower3'
  slot: number
}

export type AppStateShape = {
  goals: Goal[]
  coins: number
  garden: {
    items: GardenItem[]
  }
}

type AppActions = {
  addGoal: (title: string) => void
  removeGoal: (goalId: string) => void
  addProof: (goalId: string, imageDataUrl: string) => void
  purchaseFlower: (type: GardenItem['type'], cost: number) => void
}

type AppStateContextType = AppStateShape & AppActions

const AppStateContext = createContext<AppStateContextType | null>(null)

const LOCAL_STORAGE_KEY = 'rootine-app-state'

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`
}

function getInitialState(): AppStateShape {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    goals: [
      {
        id: generateId('goal'),
        title: 'Go for a daily walk',
        createdAt: new Date().toISOString(),
        proofs: [],
      },
    ],
    coins: 20,
    garden: { items: [] },
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppStateShape>(() => getInitialState())
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
    } catch {}
  }, [state])

  const addGoal = useCallback((title: string) => {
    setState(prev => ({
      ...prev,
      goals: [
        ...prev.goals,
        {
          id: generateId('goal'),
          title,
          createdAt: new Date().toISOString(),
          proofs: [],
        },
      ],
    }))
  }, [])

  const removeGoal = useCallback((goalId: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== goalId),
    }))
  }, [])

  const addProof = useCallback((goalId: string, imageDataUrl: string) => {
    const newProof: Proof = {
      id: generateId('proof'),
      goalId,
      imageDataUrl,
      createdAt: new Date().toISOString(),
    }
    setState(prev => ({
      ...prev,
      coins: prev.coins + 5,
      goals: prev.goals.map(g => (g.id === goalId ? { ...g, proofs: [newProof, ...g.proofs].slice(0, 30) } : g)),
    }))
  }, [])

  const purchaseFlower = useCallback((type: GardenItem['type'], cost: number) => {
    setState(prev => {
      if (prev.coins < cost) return prev
      const usedSlots = new Set(prev.garden.items.map(i => i.slot))
      let slot = 0
      while (usedSlots.has(slot)) slot += 1
      return {
        ...prev,
        coins: prev.coins - cost,
        garden: {
          items: [
            ...prev.garden.items,
            {
              id: generateId('flower'),
              type,
              slot,
            },
          ],
        },
      }
    })
  }, [])

  const value = useMemo<AppStateContextType>(() => ({
    ...state,
    addGoal,
    removeGoal,
    addProof,
    purchaseFlower,
  }), [state, addGoal, removeGoal, addProof, purchaseFlower])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateContextType {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}


