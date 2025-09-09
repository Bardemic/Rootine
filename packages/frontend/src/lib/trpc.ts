import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@rootine/api-types';

export const trpc = createTRPCReact<AppRouter>();


