import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter as BackendAppRouter } from '../../backend/dist/appRouter'

export type AppRouter = BackendAppRouter

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>


