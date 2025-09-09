import './config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from "better-auth/node";
import { auth } from './utils/auth';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './appRouter';
import { initTRPC } from '@trpc/server';
import { createContext } from './context';
import Busboy from 'busboy';
import { getS3Client } from './utils/storage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { pool } from './db';

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

// Multipart streaming upload (backend handles file -> S3)
app.post('/api/upload/proof', async (req, res) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const userId = session.user.id as string;

    const bb = Busboy({ headers: req.headers as any });
    let goalId: string | null = null;
    let uploadPromise: Promise<{ key: string }> | null = null;
    let contentType: string | undefined;

    bb.on('field', (name: string, val: string) => {
      if (name === 'goalId') goalId = val;
    });

    bb.on('file', (_name: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      contentType = info.mimeType || 'application/octet-stream';
      const ext = contentTypeToExt(contentType);
      const key = `proofs/${userId}/${goalId ?? 'unknown'}/${Date.now()}.${ext}`;
      const s3 = getS3Client();
      const uploader = new Upload({
        client: s3,
        params: {
          Bucket: (process.env.S3_BUCKET || 'rootine') as string,
          Key: key,
          Body: file as any,
          ContentType: contentType,
          ACL: 'public-read',
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
      });
      uploadPromise = uploader.done().then(() => ({ key }));
    });

    bb.on('finish', async () => {
      try {
        if (!goalId) return res.status(400).json({ error: 'Missing goalId' });
        // authz: ensure goal belongs to user
        const getGoal = await pool.query('SELECT * FROM habits WHERE id = $1', [goalId]);
        if (userId !== getGoal.rows[0]?.user_id) {
          return res.status(401).json({ error: 'UNAUTHORIZED' });
        }
        if (!uploadPromise) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        const result = await uploadPromise;
        const publicUrl = buildPublicUrl(result.key);
        await pool.query('INSERT INTO proofs (habit_id, image_data_url) VALUES ($1, $2)', [goalId, publicUrl]);
        return res.json({ ok: true, url: publicUrl, key: result.key });
      } catch (err: any) {
        console.error('Upload finalize failed', err);
        return res.status(500).json({ error: 'Upload failed' });
      }
    });

    bb.on('error', (err: any) => {
      console.error('Busboy error', err);
      try { res.status(500).json({ error: 'Upload stream error' }); } catch {}
    });

    req.pipe(bb);
  } catch (e) {
    console.error('Upload init failed', e);
    return res.status(500).json({ error: 'Upload init failed' });
  }
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

function contentTypeToExt(ct: string): string {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('heic') || ct.includes('heif')) return 'heic';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

function buildPublicUrl(key: string): string {
  const publicBase = sanitizeBaseUrl(process.env.S3_PUBLIC_BASE_URL);
  const region = process.env.S3_REGION || 'us-east-2';
  const bucket = process.env.S3_BUCKET!;
  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';
  if (publicBase) return `${publicBase.replace(/\/$/, '')}/${key}`;
  if (endpoint) {
    if (forcePathStyle) return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponentPath(key)}`;
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponentPath(key)}`;
  }
  // Default to S3 virtual-hosted-style endpoint
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponentPath(key)}`;
}

function encodeURIComponentPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function sanitizeBaseUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let v = String(raw).trim();
  const semi = v.indexOf(';');
  if (semi !== -1) v = v.slice(0, semi);
  const hash = v.indexOf('#');
  if (hash !== -1) v = v.slice(0, hash);
  v = v.replace(/^[\"']+/, '').replace(/[\"']+$/, '').trim();
  // Validate looks like https?://host[/path]
  if (!/^https?:\/\/[^\/]+(\/.*)?$/i.test(v)) return undefined;
  // Remove trailing slashes (avoid ending up with https:/ when concatenating)
  v = v.replace(/\/+$/, '');
  return v || undefined;
}

