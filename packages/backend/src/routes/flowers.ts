import { pool } from "../db";
import { protectedProcedure, router } from "../trpc";
import { Flowers, flowersSchema } from "../models/flowers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const flowersRouter = router({
  createFlower: protectedProcedure.input(flowersSchema).mutation(async ({ ctx, input }) => {
    const flower = await pool.query('INSERT INTO flowers (user_id, name, image, type, position) VALUES ($1, $2, $3, $4, $5) RETURNING *', [ctx.user.id, input.name, input.image, input.type, input.position]);
    return flower.rows as Flowers[];
  }),
  getFlowers: protectedProcedure.query(async ({ ctx }) => {
    const flowers = await pool.query('SELECT * FROM flowers WHERE user_id = $1', [ctx.user.id]);
    return flowers.rows as Flowers[];
  }),
  modifyFlower: protectedProcedure.input(flowersSchema).mutation(async ({ ctx, input }) => {
    const flower = await pool.query('UPDATE flowers SET name = $1, image = $2, type = $3, position = $4 WHERE id = $5 RETURNING *', [input.name, input.image, input.type, input.position, input.id]);
    return flower.rows as Flowers[];
  }),
  deleteFlower: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const flower: Flowers | undefined = await pool.query('SELECT * FROM flowers WHERE id = $1', [input.id]).then(res => res.rows[0] as Flowers);
    if (ctx.user.id !== flower?.user_id) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    await pool.query('DELETE FROM flowers WHERE id = $1', [input.id]);
    return { success: true };
  }),
});