import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from "better-auth/node";
import { auth } from './utils/auth';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './appRouter';
import { initTRPC } from '@trpc/server';
import { createContext } from './context';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:7000',
  credentials: true,
}));

app.all('/api/auth/*', toNodeHandler(auth));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


