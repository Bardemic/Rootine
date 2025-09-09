import { router, protectedProcedure } from '../trpc';
import { pool } from '../db';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  coin: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id as string;
    try {
      const res = await pool.query('SELECT coin FROM auth.user WHERE id = $1', [userId]);
      const coins: number | undefined = res.rows?.[0]?.coin;
      return coins ?? 0;
    } catch {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    }
  }),
});


