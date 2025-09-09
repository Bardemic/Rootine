import React, { createContext, useCallback, useContext, useMemo } from 'react'
import { trpc } from '../../lib/trpc'
// import { useQueryClient } from '@tanstack/react-query'

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

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // const _queryClient = useQueryClient() // reserved for future manual invalidations
  const utils = trpc.useUtils()

  // Goals (habits)
  const goalsQuery = trpc.habits.getHabits.useQuery(undefined, {
    staleTime: 30_000,
  })

  // Garden items from flowers
  const flowersQuery = trpc.flowers.getFlowers.useQuery(undefined, {
    staleTime: 30_000,
  })

  // Coins: assume part of habits summary until users.* exists
  const coinsQuery = { data: 0 } as any

  // Mutations
  const createHabit = trpc.habits.createHabit?.useMutation?.() || { mutate: () => {} }
  const deleteHabit = trpc.habits.deleteHabit.useMutation()
  const createProof = (trpc as any).proofs?.createProof?.useMutation?.() || { mutate: () => {} }
  const createFlower = trpc.flowers.createFlower?.useMutation?.() || { mutate: () => {} }
  const spendCoins = { mutate: () => {} } as any
  const earnCoins = { mutate: () => {} } as any

  const addGoal = useCallback((title: string) => {
    ;(createHabit as any).mutate(
      { title },
      {
        onSuccess: () => {
          ;(utils as any).habits?.getHabits?.invalidate?.()
        },
      },
    )
  }, [createHabit, utils])

  const removeGoal = useCallback((goalId: string) => {
    deleteHabit.mutate(
      { id: goalId },
      {
        onSuccess: () => {
          utils.habits.getHabits.invalidate()
        },
      },
    )
  }, [deleteHabit, utils])

  const addProof = useCallback((goalId: string, imageDataUrl: string) => {
    ;(createProof as any).mutate(
      { goalId, imageDataUrl },
      {
        onSuccess: () => {
          ;(utils as any).habits?.getHabits?.invalidate?.()
          // no coins route yet
          ;(earnCoins as any).mutate?.({ amount: 5 })
        },
      },
    )
  }, [createProof, earnCoins, utils])

  const purchaseFlower = useCallback((type: GardenItem['type'], _cost: number) => {
    // naive placement: find next available slot from current flowers
    const current = flowersQuery.data || []
    const usedSlots = new Set<number>(
      (current as any[]).map((f: any) => {
        const pos = Array.isArray(f.position) ? f.position : [0, 0]
        const x = Number(pos[0]) || 0
        const y = Number(pos[1]) || 0
        return y * 8 + x
      }),
    )
    let slot = 0
    while (usedSlots.has(slot)) slot += 1
    const x = slot % 8
    const y = Math.floor(slot / 8)

    ;(createFlower as any).mutate(
      { name: type, type, position: [x, y] },
      {
        onSuccess: () => {
          utils.flowers.getFlowers.invalidate()
        },
      },
    )
  }, [createFlower, flowersQuery.data, utils, spendCoins])

  const mappedGoals: Goal[] = (goalsQuery.data as any) || []
  const mappedFlowers: GardenItem[] = ((flowersQuery.data as any[]) || []).map((f: any) => {
    const pos = Array.isArray(f.position) ? f.position : [0, 0]
    const x = Number(pos[0]) || 0
    const y = Number(pos[1]) || 0
    const slot = y * 8 + x
    return { id: String(f.id ?? `${x}-${y}`), type: String(f.type ?? 'flower1') as any, slot }
  })
  const coins: number = (coinsQuery as any)?.data ?? 0

  const value = useMemo<AppStateContextType>(() => ({
    goals: mappedGoals,
    coins,
    garden: { items: mappedFlowers },
    addGoal,
    removeGoal,
    addProof,
    purchaseFlower,
  }), [mappedGoals, coins, mappedFlowers, addGoal, removeGoal, addProof, purchaseFlower])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateContextType {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}


