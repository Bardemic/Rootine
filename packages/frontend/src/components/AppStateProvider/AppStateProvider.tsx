import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
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
  type: 'flower1' | 'flower2' | 'flower3' | 'imageSign' | 'tallImage'
  slot: number
  imageUrl?: string
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
  setSignImage: (id: string, imageUrl: string) => void
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

  // Coins from protected user endpoint
  const coinsQuery = trpc.user.coin.useQuery(undefined, { staleTime: 15_000 });
  const [coinsState, setCoinsState] = useState<number>(coinsQuery.data ?? 0);

  // Mutations
  const createHabit = trpc.habits.createHabit.useMutation();
  const deleteHabit = trpc.habits.deleteHabit.useMutation();
  const submitProof = trpc.proofs.submitProof.useMutation();
  const purchaseFlowerMutation = trpc.flowers.purchaseFlower.useMutation()
  const setSignImageMutation = (trpc as any).flowers?.setSignImage?.useMutation?.()

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
    ;(submitProof as any).mutate(
      { goalId, dataUrl: imageDataUrl },
      {
        onSuccess: (res: any) => {
          if (res && typeof res.coins === 'number') setCoinsState(res.coins)
          ;(utils as any).proofs?.getProofs?.invalidate?.({ goalId })
          ;(utils as any).user?.coin?.invalidate?.()
        },
      },
    )
  }, [submitProof, utils])

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

    ;(purchaseFlowerMutation as any).mutate(
      { flowerId: type, position: [x, y] },
      {
        onSuccess: () => {
          utils.flowers.getFlowers.invalidate()
        },
      },
    )
  }, [purchaseFlowerMutation, flowersQuery.data, utils])

  const setSignImage = useCallback((id: string, imageUrl: string) => {
    ;(setSignImageMutation as any)?.mutate?.(
      { id, imageUrl },
      {
        onSuccess: () => {
          ;(utils as any).flowers?.getFlowers?.invalidate?.()
        },
      },
    )
  }, [setSignImageMutation, utils])

  const mappedGoals: Goal[] = (goalsQuery.data as any) || []
  const mappedFlowers: GardenItem[] = ((flowersQuery.data as any[]) || []).map((f: any) => {
    const pos = Array.isArray(f.position) ? f.position : [0, 0]
    const x = Number(pos[0]) || 0
    const y = Number(pos[1]) || 0
    const slot = y * 8 + x
    return { id: String(f.id ?? `${x}-${y}`), type: String(f.type ?? 'flower1') as any, slot, imageUrl: f.image || undefined }
  })
  const coins: number = (coinsQuery as any)?.data ?? coinsState

  const value = useMemo<AppStateContextType>(() => ({
    goals: mappedGoals,
    coins,
    garden: { items: mappedFlowers },
    addGoal,
    removeGoal,
    addProof,
    purchaseFlower,
    setSignImage,
  }), [mappedGoals, coins, mappedFlowers, addGoal, removeGoal, addProof, purchaseFlower, setSignImage])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateContextType {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}


