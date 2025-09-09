import z from "zod"
import { proofsSchema } from "./proofs"

export const habitsSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  user_id: z.string(),
  proofs: z.array(proofsSchema)
})

export type Habits = z.infer<typeof habitsSchema>