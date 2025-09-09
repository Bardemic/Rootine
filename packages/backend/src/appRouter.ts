import { router } from './trpc';
import { habitsRouter } from './routes/habits';
import { flowersRouter } from './routes/flowers';
import { proofsRouter } from './routes/proofs';
import { userRouter } from './routes/user';

export const appRouter = router({
  habits: habitsRouter,
  flowers: flowersRouter,
  proofs: proofsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;


