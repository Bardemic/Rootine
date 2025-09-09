import { pool } from '../db';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import type { Habits } from '../models/habits';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const habitsRouter = router({
  getHabits: protectedProcedure.query(async ({ ctx }) => {
    const habits = await pool.query('SELECT * FROM habits WHERE user_id = $1', [ctx.user.id]);
    return habits.rows as Habits[];
  }),
  createHabit: protectedProcedure.input(z.object({ title: z.string() })).mutation(async ({ ctx, input }) => {
    await pool.query('INSERT INTO habits (user_id, title) VALUES ($1, $2)', [ctx.user.id, input.title]);
    return;
  }),
  deleteHabit: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const habit: Habits | undefined = await pool.query('SELECT * FROM habits WHERE id = $1', [input.id]).then(res => res.rows[0] as Habits);
    if (ctx.user.id !== habit?.user_id) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    await pool.query('DELETE FROM habits WHERE id = $1', [input.id]);
    return { success: true };
  }),
});


