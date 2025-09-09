import z from "zod"

export const flowersSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().optional(),
  type: z.string(),
  position: z.array(z.number()).length(2), // x and y
  user_id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Flowers = z.infer<typeof flowersSchema>