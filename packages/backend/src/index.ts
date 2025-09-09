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
import { Readable } from 'stream';
import { verifyImageWithAI } from './utils/aiVerify';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:7000',
  credentials: true,
}));

app.all('/api/auth/*', toNodeHandler(auth));
// Increase JSON/body limits to allow base64 image payloads for individual proof uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Same-origin image proxy to avoid CORS issues when using textures
app.get('/api/proxy-image', async (req, res) => {
  try {
    const raw = String((req.query as any)?.url || '');
    if (!raw) return res.status(400).send('Missing url');
    let u: URL;
    try { u = new URL(raw); } catch { return res.status(400).send('Invalid url'); }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return res.status(400).send('Unsupported protocol');
    }
    // Optional: basic allowlist using env bucket/public base
    const allowedBase = process.env.S3_PUBLIC_BASE_URL;
    const bucket = process.env.S3_BUCKET;
    if (allowedBase) {
      try {
        const b = new URL(allowedBase);
        if (u.host !== b.host) return res.status(400).send('Host not allowed');
      } catch {}
    } else if (bucket && !u.host.includes(bucket)) {
      // If no explicit base, ensure host references our bucket somewhere
      // Relax this if you proxy from multiple hosts
    }

    const upstream = await fetch(u.toString());
    if (!upstream.ok) {
      return res.status(502).send('Upstream error');
    }
    const ct = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');

    // Prefer streaming if possible; fallback to buffer
    const body: any = (upstream as any).body;
    if (body && typeof body.getReader === 'function') {
      // Web ReadableStream → Node Readable
      const nodeStream = Readable.fromWeb(body);
      nodeStream.pipe(res);
    } else if (body && typeof body.pipe === 'function') {
      body.pipe(res);
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    }
  } catch (e) {
    console.error('proxy-image failed', e);
    res.status(500).send('Proxy failed');
  }
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
    let contentType: string | undefined;
    const chunks: Buffer[] = [];

    bb.on('field', (name: string, val: string) => {
      if (name === 'goalId') goalId = val;
      // optional description for verification context
      if (name === 'description') (req as any)._description = val;
    });

    bb.on('file', (_name: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      contentType = info.mimeType || 'application/octet-stream';
      (file as any).on('data', (d: Buffer) => chunks.push(d));
    });

    bb.on('finish', async () => {
      try {
        if (!goalId) return res.status(400).json({ error: 'Missing goalId' });
        // authz: ensure goal belongs to user
        const getGoal = await pool.query('SELECT * FROM habits WHERE id = $1', [goalId]);
        if (userId !== getGoal.rows[0]?.user_id) {
          return res.status(401).json({ error: 'UNAUTHORIZED' });
        }
        if (chunks.length === 0 || !contentType) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        // AI verification before uploading
        const title: string = String(getGoal.rows?.[0]?.title || '');
        const description: string | undefined = (req as any)._description;
        const verification = await verifyImageWithAI({ imageUrl: dataUrl, title, description });
        if (!verification.ok) {
          return res.status(400).json({ error: 'Image verification failed. Please submit a clearer, relevant photo.' });
        }

        const ext = contentTypeToExt(contentType);
        const key = `proofs/${userId}/${goalId}/${Date.now()}.${ext}`;
        const s3 = getS3Client();
        const put = new PutObjectCommand({
          Bucket: (process.env.S3_BUCKET || 'rootine') as string,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
        });
        await s3.send(put);
        const publicUrl = buildPublicUrl(key);
        await pool.query('INSERT INTO proofs (habit_id, image_data_url) VALUES ($1, $2)', [goalId, publicUrl]);
        return res.json({ ok: true, url: publicUrl, key });
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

// Multipart streaming upload for group proof
app.post('/api/upload/group-proof', async (req, res) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const userId = session.user.id as string;

    const bb = Busboy({ headers: req.headers as any });
    let groupId: string | null = null;
    let contentType: string | undefined;
    const chunks: Buffer[] = [];

    bb.on('field', (name: string, val: string) => {
      if (name === 'groupId') groupId = val;
      if (name === 'description') (req as any)._description = val;
    });

    bb.on('file', (_name: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      contentType = info.mimeType || 'application/octet-stream';
      (file as any).on('data', (d: Buffer) => chunks.push(d));
    });

    bb.on('finish', async () => {
      try {
        if (!groupId) return res.status(400).json({ error: 'Missing groupId' });

        // Validate membership
        const isMember = await pool.query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
        if ((isMember.rowCount ?? 0) === 0) return res.status(401).json({ error: 'UNAUTHORIZED' });

        // Enforce per-day submission limit (default 1)
        const dailyRequired = 1;
        const existingToday = await pool.query(
          `SELECT COUNT(1) AS cnt FROM group_proofs WHERE group_id = $1 AND user_id = $2 AND created_at::date = CURRENT_DATE`,
          [groupId, userId],
        );
        const submittedToday = Number(existingToday.rows?.[0]?.cnt || 0);
        if (submittedToday >= dailyRequired) {
          return res.status(400).json({ error: 'Daily submission limit reached' });
        }

        if (chunks.length === 0 || !contentType) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        // Fetch group for context
        const gRes = await pool.query('SELECT name, habit_description FROM groups WHERE id = $1', [groupId]);
        const grp = gRes.rows?.[0];

        const description: string | undefined = (req as any)._description || String(grp?.habit_description || '');
        const verification = await verifyImageWithAI({ imageUrl: dataUrl, title: String(grp?.name || 'Group Goal'), description });
        if (!verification.ok) {
          return res.status(400).json({ error: 'Image verification failed. Please submit a clearer, relevant photo.' });
        }

        const ext = contentTypeToExt(contentType);
        const key = `group-proofs/${groupId}/${userId}/${Date.now()}.${ext}`;
        const s3 = getS3Client();
        const put = new PutObjectCommand({
          Bucket: (process.env.S3_BUCKET || 'rootine') as string,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
        });
        await s3.send(put);
        const publicUrl = buildPublicUrl(key);

        await pool.query('INSERT INTO group_proofs (group_id, user_id, image_data_url) VALUES ($1, $2, $3)', [groupId, userId, publicUrl]);

        // Try award logic
        await awardGroupCoinsIfAllGroupMembersSubmittedToday(groupId);

        return res.json({ ok: true, url: publicUrl, key });
      } catch (err: any) {
        console.error('Group upload finalize failed', err);
        return res.status(500).json({ error: 'Upload failed' });
      }
    });

    bb.on('error', (err: any) => {
      console.error('Busboy error', err);
      try { res.status(500).json({ error: 'Upload stream error' }); } catch {}
    });

    req.pipe(bb);
  } catch (e) {
    console.error('Group upload init failed', e);
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

async function awardGroupCoinsIfAllGroupMembersSubmittedToday(groupId: string): Promise<void> {
  try {
    const dailyRequired = 1;
    // Already awarded today?
    const already = await pool.query('SELECT 1 FROM group_coin_distributions WHERE group_id = $1 AND award_date = CURRENT_DATE', [groupId]);
    if ((already.rowCount ?? 0) > 0) return;

    // Members
    const membersRes = await pool.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
    const memberIds: string[] = membersRes.rows.map((r: any) => String(r.user_id));
    const memberCount = memberIds.length;
    if (memberCount === 0) return;

    // Completions today using group_proofs
    const completionRes = await pool.query(
      `SELECT gm.user_id, COUNT(gp.id) AS proofs_today
       FROM group_members gm
       LEFT JOIN group_proofs gp ON gp.group_id = gm.group_id AND gp.user_id = gm.user_id AND gp.created_at::date = CURRENT_DATE
       WHERE gm.group_id = $1
       GROUP BY gm.user_id`,
      [groupId],
    );
    if ((completionRes.rowCount ?? 0) < memberCount) return;
    const allComplete = completionRes.rows.every((r: any) => Number(r.proofs_today) >= dailyRequired);
    if (!allComplete) return;

    const baseReward = 5;
    const multiplier = 1.5 * (memberCount - 1) + 1;
    const perUserAward = Math.round(baseReward * multiplier);

    try {
      await pool.query('BEGIN');
      await pool.query('INSERT INTO group_coin_distributions (group_id, award_date, reward_amount) VALUES ($1, CURRENT_DATE, $2)', [groupId, perUserAward]);
      await pool.query('UPDATE auth.user SET coin = COALESCE(coin, 0) + $2 WHERE id = ANY($1::text[])', [memberIds, perUserAward]);
      await pool.query('COMMIT');
    } catch (e: any) {
      await pool.query('ROLLBACK');
      if (e && e.code !== '23505') {
        console.error('awardGroupCoinsIfAllGroupMembersSubmittedToday failed', groupId, e);
      }
    }
  } catch (e) {
    console.error('awardGroupCoinsIfAllGroupMembersSubmittedToday error', e);
  }
}

