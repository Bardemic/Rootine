import type * as trpcExpress from '@trpc/server/adapters/express';
import { auth } from './utils/auth';

export const createContext = async ({
    req,
    //res,
  }: trpcExpress.CreateExpressContextOptions) => {
    const session = await auth.api.getSession({ headers: req.headers as unknown as Headers });
  
    return {
      user: session?.user,
    };
};

export type Context = Awaited<ReturnType<typeof createContext>>


