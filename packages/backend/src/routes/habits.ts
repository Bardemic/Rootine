import { pool } from '../db';
import { publicProcedure, router } from '../trpc';
//import { z } from 'zod';

export const habitsRouter = router({
  getHabits: publicProcedure.query(async () => {
    const habits = await pool.query('SELECT * FROM habits');
    return habits.rows;
  }),
});


