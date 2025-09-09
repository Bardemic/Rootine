import z from "zod"

export const proofsSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  imageDataUrl: z.string(),
  createdAt: z.string()
})

export type Proofs = z.infer<typeof proofsSchema>


