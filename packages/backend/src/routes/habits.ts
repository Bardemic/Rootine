import { pool } from '../db';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import type { Habits } from '../models/habits';
//import { z } from 'zod';

export const habitsRouter = router({
  getHabits: protectedProcedure.query(async ({ ctx }) => {
    const habits = await pool.query('SELECT * FROM habits WHERE user_id = $1', [ctx.user.id]);
    return habits.rows as Habits[];
  }),
});


