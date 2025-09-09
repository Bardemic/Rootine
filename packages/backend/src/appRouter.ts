import { router } from './trpc';
import { habitsRouter } from './routes/habits';
import { flowersRouter } from './routes/flowers';
import { proofsRouter } from './routes/proofs';

export const appRouter = router({
  habits: habitsRouter,
  flowers: flowersRouter,
  proofs: proofsRouter,
});

export type AppRouter = typeof appRouter;


