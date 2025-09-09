import { router } from './trpc';
import { habitsRouter } from './routes/habits';

export const appRouter = router({
  habits: habitsRouter,
});

export type AppRouter = typeof appRouter;


