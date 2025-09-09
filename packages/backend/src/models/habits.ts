import z from "zod"

export const habitsSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  proofs: z.array(z.object({
    id: z.string(),
    goalId: z.string(),
    imageDataUrl: z.string(),
    createdAt: z.string()
  }))
})

export type Habits = z.infer<typeof habitsSchema>