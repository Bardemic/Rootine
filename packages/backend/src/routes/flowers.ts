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
      imageSign: 25,
      tallImage: 40,
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
      // Default image for imageSign purchases
      const defaultImage = (input.flowerId === 'imageSign' || input.flowerId === 'tallImage') ? 'https://placehold.co/256x256' : null;
      const insertRes = await client.query(
        'INSERT INTO flowers (user_id, name, image, type, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, input.flowerId, defaultImage, input.flowerId, input.position],
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
  // Update image for an existing image sign owned by the user
  setSignImage: protectedProcedure.input(z.object({
    id: z.string(),
    imageUrl: z.string().url(),
  })).mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id as string;
    // Ensure the flower exists, is owned by the user, and is an imageSign
    const existing = await pool.query('SELECT id, user_id, type FROM flowers WHERE id = $1', [input.id]);
    const row = existing.rows[0] as any;
    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Sign not found' });
    }
    if (row.user_id !== userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    if (String(row.type) !== 'imageSign' && String(row.type) !== 'tallImage') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Item is not an image sign' });
    }
    const updated = await pool.query('UPDATE flowers SET image = $1, updated_at = now() WHERE id = $2 RETURNING *', [input.imageUrl, input.id]);
    return updated.rows as Flowers[];
  }),
  getFlowers: protectedProcedure.query(async ({ ctx }) => {
    const flowers = await pool.query('SELECT * FROM flowers WHERE user_id = $1', [ctx.user.id]);
    return flowers.rows as Flowers[];
  }),
  moveFlower: protectedProcedure.input(z.object({
    id: z.string(),
    position: z.array(z.number()).length(2),
  })).mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id as string;
    const [xRaw, yRaw] = input.position;
    const x = Math.floor(Number(xRaw));
    const y = Math.floor(Number(yRaw));
    const COLS = 8;
    const ROWS = 8;
    if (Number.isNaN(x) || Number.isNaN(y) || x < 0 || x >= COLS || y < 0 || y >= ROWS) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target position out of bounds' });
    }

    // Verify ownership
    const existing = await pool.query('SELECT id, user_id FROM flowers WHERE id = $1', [input.id]);
    const row = existing.rows[0] as any;
    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Flower not found' });
    }
    if (row.user_id !== userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // Ensure no collision with another of the user's flowers
    const conflict = await pool.query(
      'SELECT 1 FROM flowers WHERE user_id = $1 AND position = $2 AND id <> $3 LIMIT 1',
      [userId, [x, y], input.id],
    );
    if (conflict.rowCount && conflict.rowCount > 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target pot is occupied' });
    }

    const updated = await pool.query(
      'UPDATE flowers SET position = $1, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING *',
      [[x, y], input.id, userId],
    );
    return updated.rows as Flowers[];
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