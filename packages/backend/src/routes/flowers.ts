import { pool } from "../db";
import { protectedProcedure, router } from "../trpc";
import { Flowers, flowersSchema } from "../models/flowers";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const flowersRouter = router({
  // Purchase a flower by id, checking coins against a simple price map
  purchaseFlower: protectedProcedure.input(z.object({
    flowerId: z.string(),
    position: z.array(z.number()).length(2),
  })).mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id as string;
    const PRICE_MAP: Record<string, number> = {
      flower1: 10,
      flower2: 15,
      flower3: 20,
    };
    const price = PRICE_MAP[input.flowerId];
    if (price == null) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unknown flower id' });
    }

    // Transaction: check coins, deduct, insert flower
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const coinRes = await client.query('SELECT coin FROM auth.user WHERE id = $1 FOR UPDATE', [userId]);
      const currentCoins: number | undefined = coinRes.rows[0]?.coin;
      if (currentCoins == null) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      if (currentCoins < price) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not enough coins' });
      }

      await client.query('UPDATE auth.user SET coin = coin - $2 WHERE id = $1', [userId, price]);
      const insertRes = await client.query(
        'INSERT INTO flowers (user_id, name, image, type, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, input.flowerId, null, input.flowerId, input.position],
      );
      await client.query('COMMIT');
      return insertRes.rows as Flowers[];
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    } finally {
      client.release();
    }
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