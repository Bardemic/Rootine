import { router } from './trpc';
import { habitsRouter } from './routes/habits';
import { flowersRouter } from './routes/flowers';
import { proofsRouter } from './routes/proofs';
import { userRouter } from './routes/user';
import { groupsRouter } from './routes/groups';

export const appRouter = router({
  habits: habitsRouter,
  flowers: flowersRouter,
  proofs: proofsRouter,
  user: userRouter,
  groups: groupsRouter,
});

export type AppRouter = typeof appRouter;


