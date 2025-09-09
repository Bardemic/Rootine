import { pool } from "../db";
import { Proofs } from "../models/proofs";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";
import { createPresignedUploadUrl, getS3Client } from "../utils/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const proofsRouter = router({
  // Get all proofs for the current user across all habits
  getAllProofs: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id as string
    // Join habits to ensure ownership
    const results = await pool.query(
      `SELECT p.id, p.habit_id, p.image_data_url, p.created_at
       FROM proofs p
       JOIN habits h ON h.id = p.habit_id
       WHERE h.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId],
    )
    return results.rows.map((r: any) => ({
      id: String(r.id),
      goalId: String(r.habit_id),
      imageDataUrl: String(r.image_data_url),
      createdAt: new Date(r.created_at).toISOString(),
    })) as Proofs[]
  }),
  getProofs: protectedProcedure.input(z.object({ goalId: z.string() })).query(async ({ ctx, input }) => {
    const getGoal = await pool.query('SELECT * FROM habits WHERE id = $1', [input.goalId]);
    if (ctx.user.id !== getGoal.rows[0]?.user_id) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    const proofs = await pool.query('SELECT * FROM proofs WHERE habit_id = $1 ORDER BY created_at DESC', [input.goalId]);
    // Map to camelCase for frontend expectations
    return proofs.rows.map((r: any) => ({
      id: String(r.id),
      goalId: String(r.habit_id),
      imageDataUrl: String(r.image_data_url),
      createdAt: new Date(r.created_at).toISOString(),
    })) as Proofs[];
  }),
  createUploadUrl: protectedProcedure.input(z.object({ goalId: z.string(), contentType: z.string().optional() })).mutation(async ({ ctx, input }) => {
    try {
      const getGoal = await pool.query('SELECT * FROM habits WHERE id = $1', [input.goalId]);
      if (ctx.user.id !== getGoal.rows[0]?.user_id) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      const fileExt = contentTypeToExt(input.contentType || 'image/jpeg');
      const key = `proofs/${ctx.user.id}/${input.goalId}/${Date.now()}.${fileExt}`;
      const { url, headers, fileUrl } = await createPresignedUploadUrl({ key, contentType: input.contentType || 'image/jpeg' });
      // Insert stub record pointing to fileUrl for display after upload completes
      await pool.query('INSERT INTO proofs (habit_id, image_data_url) VALUES ($1, $2)', [input.goalId, fileUrl]);
      return { url, headers, key, fileUrl };
    } catch (err) {
      console.error('createUploadUrl failed', err);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    }
  }),
  submitProof: protectedProcedure.input(z.object({ goalId: z.string(), dataUrl: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      // Ensure habit belongs to current user
      const getGoal = await pool.query('SELECT * FROM habits WHERE id = $1', [input.goalId]);
      if (ctx.user.id !== getGoal.rows[0]?.user_id) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Parse data URL
      const { contentType, buffer } = parseDataUrl(input.dataUrl);
      const fileExt = contentTypeToExt(contentType || 'image/jpeg');
      const key = `proofs/${ctx.user.id}/${input.goalId}/${Date.now()}.${fileExt}`;

      // Upload to S3
      const bucket = (process.env.S3_BUCKET || 'rootine') as string;
      const s3 = getS3Client();
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        ACL: 'public-read',
      });
      await s3.send(command);

      const publicUrl = buildPublicUrl(key);

      // Persist proof record
      await pool.query('INSERT INTO proofs (habit_id, image_data_url) VALUES ($1, $2)', [input.goalId, publicUrl]);

      // Increment user coins by 5 and return new balance
      const coinRes = await pool.query('UPDATE auth.user SET coin = COALESCE(coin, 0) + 5 WHERE id = $1 RETURNING coin', [ctx.user.id]);
      const coins: number | undefined = coinRes.rows?.[0]?.coin;

      // Group awards are handled via group proofs; nothing to do here

      return { url: publicUrl, key, coins };
    } catch (err) {
      console.error('submitProof failed', err);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    }
  }),
});

function contentTypeToExt(ct: string): string {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('heic') || ct.includes('heif')) return 'heic';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

function parseDataUrl(dataUrl: string): { contentType: string | undefined; buffer: Buffer } {
  // Expected format: data:<mime>;base64,<data>
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    // Fallback: assume whole string is base64 jpeg
    return { contentType: 'image/jpeg', buffer: Buffer.from(dataUrl.split(',').pop() || dataUrl, 'base64') };
  }
  const [, mime, base64] = match;
  return { contentType: mime, buffer: Buffer.from(base64, 'base64') };
}

function buildPublicUrl(key: string): string {
  const publicBase = sanitizeBaseUrl(process.env.S3_PUBLIC_BASE_URL);
  const region = process.env.S3_REGION || 'us-east-2';
  const bucket = process.env.S3_BUCKET || 'rootine';
  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true';
  if (publicBase) return `${publicBase.replace(/\/$/, '')}/${key}`;
  if (endpoint) {
    if (forcePathStyle) return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponentPath(key)}`;
    return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodeURIComponentPath(key)}`;
  }
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
  if (!/^https?:\/\/[^\/]+(\/.*)?$/i.test(v)) return undefined;
  v = v.replace(/\/+$/, '');
  return v || undefined;
}

// Group award logic: if all members of any of the user's groups have at least one proof today,
// award baseReward * multiplier to every member, once per group per day.
async function awardGroupCoinsIfAllSubmittedToday(userId: string): Promise<void> {
  try {
    // Find groups the user belongs to
    const groupsRes = await pool.query('SELECT group_id AS id FROM group_members WHERE user_id = $1', [userId]);
    const groupIds: string[] = groupsRes.rows.map((r: any) => String(r.id));
    if (groupIds.length === 0) return;

    for (const groupId of groupIds) {
      // Check if already awarded today for this group
      const already = await pool.query(
        'SELECT 1 FROM group_coin_distributions WHERE group_id = $1 AND award_date = CURRENT_DATE',
        [groupId],
      );
      if ((already.rowCount ?? 0) > 0) continue;

      // Fetch members
      const membersRes = await pool.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
      const memberIds: string[] = membersRes.rows.map((r: any) => String(r.user_id));
      const memberCount = memberIds.length;
      if (memberCount === 0) continue;

      // Check each member has at least one proof today (across any habit they own)
      const completionRes = await pool.query(
        `SELECT gm.user_id, COUNT(p.id) AS proofs_today
         FROM group_members gm
         LEFT JOIN habits h ON h.user_id = gm.user_id
         LEFT JOIN proofs p ON p.habit_id = h.id AND p.created_at::date = CURRENT_DATE
         WHERE gm.group_id = $1
         GROUP BY gm.user_id`,
        [groupId],
      );
      if ((completionRes.rowCount ?? 0) < memberCount) continue;
      const allComplete = completionRes.rows.every((r: any) => Number(r.proofs_today) > 0);
      if (!allComplete) continue;

      // Compute award per user: base * (1.5*(n-1) + 1)
      const baseReward = 5; // base coin amount
      const multiplier = 1.5 * (memberCount - 1) + 1;
      const perUserAward = Math.round(baseReward * multiplier);

      // Attempt to record distribution and award coins atomically
      try {
        await pool.query('BEGIN');
        // Insert distribution record (unique per group/day)
        await pool.query(
          'INSERT INTO group_coin_distributions (group_id, award_date, reward_amount) VALUES ($1, CURRENT_DATE, $2)',
          [groupId, perUserAward],
        );
        // Award coins to all members
        await pool.query(
          'UPDATE auth.user SET coin = COALESCE(coin, 0) + $2 WHERE id = ANY($1::text[])',
          [memberIds, perUserAward],
        );
        await pool.query('COMMIT');
      } catch (e: any) {
        await pool.query('ROLLBACK');
        // If unique violation, someone else awarded concurrently — safe to ignore
        // PostgreSQL unique_violation code is '23505'
        if (e && e.code !== '23505') {
          console.error('Group award failed for group', groupId, e);
        }
      }
    }
  } catch (e) {
    console.error('awardGroupCoinsIfAllSubmittedToday error', e);
  }
}